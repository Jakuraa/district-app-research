import crypto from "node:crypto";
import {
  assignRoleSchema,
  normalizePhoneNumber,
  profileUpdateSchema,
  signInSchema,
  signUpSchema,
  type AuditLogEntry,
  type AuthSessionView,
  type RoleAssignmentRecord,
  type UserAccount
} from "@nightlifez/shared";
import {
  extractRolesFromAssignments,
  extractSessionTokenFromRequest,
  hashPassword,
  hashSessionToken,
  verifyPassword
} from "./auth.ts";
import { getPool } from "./db.ts";
import { ensureSchemaBootstrapped } from "./bootstrapDb.ts";
import { getMemoryStore } from "./memoryStore.ts";
import { resolveWorkspaces } from "./otpService.ts";

function mapUserRow(row: Record<string, unknown>): UserAccount {
  return {
    id: String(row.id),
    email: row.email ? String(row.email) : null,
    fullName: String(row.full_name),
    phone: row.phone ? String(row.phone) : null,
    phoneVerifiedAt: row.phone_verified_at ? new Date(String(row.phone_verified_at)).toISOString() : null,
    preferredCitySlug: String(row.preferred_city_slug ?? "bengaluru"),
    favoriteCategories: (row.favorite_categories_json as string[]) ?? [],
    status: (row.status as UserAccount["status"]) ?? "ACTIVE",
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}

function mapRoleRow(row: Record<string, unknown>): RoleAssignmentRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    role: row.role as RoleAssignmentRecord["role"],
    organizationId: row.organization_id ? String(row.organization_id) : null,
    venueSlug: row.venue_slug ? String(row.venue_slug) : null,
    eventId: row.event_id ? String(row.event_id) : null,
    grantedBy: row.granted_by ? String(row.granted_by) : null,
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}

export async function recordAuditLog(params: {
  actorUserId: string | null;
  actorEmail: string | null;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  beforeJson?: unknown;
  afterJson?: unknown;
}): Promise<AuditLogEntry> {
  const safeActorEmail = params.actorEmail ?? "phone-user";
  const entry: AuditLogEntry = {
    id: `aud_${crypto.randomUUID().slice(0, 12)}`,
    actorUserId: params.actorUserId,
    actorEmail: safeActorEmail,
    actorRole: params.actorRole,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    beforeJson: params.beforeJson ?? null,
    afterJson: params.afterJson ?? null,
    createdAt: new Date().toISOString()
  };

  const pool = getPool();
  if (!pool) {
    getMemoryStore().auditLogs.unshift(entry);
    return entry;
  }

  await pool.query(
    `INSERT INTO audit_logs (id, actor_user_id, actor_email, actor_role, action, target_type, target_id, before_json, after_json, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10)`,
    [
      entry.id,
      entry.actorUserId,
      entry.actorEmail,
      entry.actorRole,
      entry.action,
      entry.targetType,
      entry.targetId,
      JSON.stringify(entry.beforeJson),
      JSON.stringify(entry.afterJson),
      entry.createdAt
    ]
  );
  return entry;
}

export async function listAuditLogs(limit: number = 100): Promise<AuditLogEntry[]> {
  const pool = getPool();
  if (!pool) {
    return getMemoryStore().auditLogs.slice(0, limit);
  }
  const res = await pool.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1", [limit]);
  return res.rows.map((r) => ({
    id: String(r.id),
    actorUserId: r.actor_user_id ? String(r.actor_user_id) : null,
    actorEmail: String(r.actor_email),
    actorRole: String(r.actor_role),
    action: String(r.action),
    targetType: String(r.target_type),
    targetId: String(r.target_id),
    beforeJson: r.before_json ?? null,
    afterJson: r.after_json ?? null,
    createdAt: new Date(String(r.created_at)).toISOString()
  }));
}

export async function signUpUser(rawInput: unknown): Promise<AuthSessionView & { token: string }> {
  const input = signUpSchema.parse(rawInput);
  const emailLower = input.email.toLowerCase();
  const userId = `usr_${crypto.randomUUID().slice(0, 12)}`;
  const passwordHash = hashPassword(input.password);
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const sessionId = `ses_${crypto.randomUUID().slice(0, 12)}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    if (store.users.some((u) => u.email?.toLowerCase() === emailLower)) {
      throw new Error("An account with this email already exists.");
    }
    const user: UserAccount = {
      id: userId,
      email: emailLower,
      fullName: input.fullName,
      phone: input.phone ?? null,
      preferredCitySlug: input.preferredCitySlug ?? "bengaluru",
      favoriteCategories: input.favoriteCategories ?? [],
      status: "ACTIVE",
      createdAt: now
    };
    store.users.push({ ...user, passwordHash });
    const assignment: RoleAssignmentRecord = {
      id: `ra_${crypto.randomUUID().slice(0, 10)}`,
      userId,
      role: "attendee",
      organizationId: null,
      venueSlug: null,
      eventId: null,
      grantedBy: null,
      createdAt: now
    };
    store.roleAssignments.push(assignment);
    store.sessions.push({ id: sessionId, userId, tokenHash, expiresAt, createdAt: now });
    return { user, assignments: [assignment], roles: ["attendee"], token };
  }

  const client = await pool.connect();
  try {
    await ensureSchemaBootstrapped(pool);
    await client.query("BEGIN");
    const existing = await client.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [emailLower]);
    if ((existing.rowCount ?? 0) > 0) {
      throw new Error("An account with this email already exists.");
    }
    const uRes = await client.query(
      `INSERT INTO users (id, email, password_hash, full_name, phone, preferred_city_slug, favorite_categories_json, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,'ACTIVE') RETURNING *`,
      [
        userId,
        emailLower,
        passwordHash,
        input.fullName,
        input.phone ?? null,
        input.preferredCitySlug ?? "bengaluru",
        JSON.stringify(input.favoriteCategories ?? [])
      ]
    );
    const raId = `ra_${crypto.randomUUID().slice(0, 10)}`;
    const raRes = await client.query(
      `INSERT INTO role_assignments (id, user_id, role) VALUES ($1, $2, 'attendee') RETURNING *`,
      [raId, userId]
    );
    await client.query(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
      [sessionId, userId, tokenHash, expiresAt]
    );
    await client.query("COMMIT");

    const user = mapUserRow(uRes.rows[0]);
    const assignments = raRes.rows.map(mapRoleRow);
    return { user, assignments, roles: extractRolesFromAssignments(assignments), token };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function signInUser(rawInput: unknown): Promise<AuthSessionView & { token: string }> {
  const input = signInSchema.parse(rawInput);
  const emailLower = input.email.toLowerCase();
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const sessionId = `ses_${crypto.randomUUID().slice(0, 12)}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    const found = store.users.find((u) => u.email?.toLowerCase() === emailLower);
    if (!found || !found.passwordHash || !verifyPassword(input.password, found.passwordHash)) {
      throw new Error("Invalid email or password.");
    }
    if (found.status === "SUSPENDED") {
      throw new Error("This account has been suspended.");
    }
    store.sessions.push({
      id: sessionId,
      userId: found.id,
      tokenHash,
      expiresAt,
      createdAt: new Date().toISOString()
    });
    const assignments = store.roleAssignments.filter((r) => r.userId === found.id);
    const { passwordHash: _ignored, ...user } = found;
    return { user, assignments, roles: extractRolesFromAssignments(assignments), token };
  }
  await ensureSchemaBootstrapped(pool);

  const uRes = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [emailLower]);
  if (uRes.rowCount === 0) {
    throw new Error("Invalid email or password.");
  }
  const row = uRes.rows[0];
  if (!row.password_hash || !verifyPassword(input.password, String(row.password_hash))) {
    throw new Error("Invalid email or password.");
  }
  if (String(row.status) === "SUSPENDED") {
    throw new Error("This account has been suspended.");
  }
  const user = mapUserRow(row);
  await pool.query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
    [sessionId, user.id, tokenHash, expiresAt]
  );
  const raRes = await pool.query("SELECT * FROM role_assignments WHERE user_id = $1", [user.id]);
  const assignments = raRes.rows.map(mapRoleRow);
  return { user, assignments, roles: extractRolesFromAssignments(assignments), token };
}

export async function signOutToken(token: string | null): Promise<void> {
  if (!token) return;
  const tokenHash = hashSessionToken(token);
  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    store.sessions = store.sessions.filter((s) => s.tokenHash !== tokenHash);
    return;
  }
  await pool.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
}

export async function getSessionByToken(token: string | null): Promise<AuthSessionView> {
  if (!token) return { user: null, assignments: [], roles: [] };
  const tokenHash = hashSessionToken(token);
  const nowMs = Date.now();

  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    const ses = store.sessions.find(
      (s) => s.tokenHash === tokenHash && new Date(s.expiresAt).getTime() > nowMs
    );
    if (!ses) return { user: null, assignments: [], roles: [] };
    const found = store.users.find((u) => u.id === ses.userId);
    if (!found) return { user: null, assignments: [], roles: [] };
    const { passwordHash: _ignored, ...user } = found;
    const assignments = store.roleAssignments.filter((r) => r.userId === user.id);
    const orgMap = new Map(store.organizations.map((o) => [o.id, o.name]));
    const { workspaces, defaultWorkspacePath } = resolveWorkspaces(assignments, orgMap);
    return { user, assignments, roles: extractRolesFromAssignments(assignments), workspaces, defaultWorkspacePath };
  }
  await ensureSchemaBootstrapped(pool);

  const res = await pool.query(
    `SELECT u.* FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  if (res.rowCount === 0) return { user: null, assignments: [], roles: [] };
  const user = mapUserRow(res.rows[0]);
  const [raRes, orgRes] = await Promise.all([
    pool.query("SELECT * FROM role_assignments WHERE user_id = $1", [user.id]),
    pool.query("SELECT id, name FROM organizations")
  ]);
  const assignments = raRes.rows.map(mapRoleRow);
  const orgMap = new Map(orgRes.rows.map((o) => [String(o.id), String(o.name)]));
  const { workspaces, defaultWorkspacePath } = resolveWorkspaces(assignments, orgMap);
  return { user, assignments, roles: extractRolesFromAssignments(assignments), workspaces, defaultWorkspacePath };
}

export async function getSessionFromRequest(request: Request): Promise<AuthSessionView> {
  const token = extractSessionTokenFromRequest(request);
  return getSessionByToken(token);
}

export async function updateUserProfile(userId: string, rawInput: unknown): Promise<UserAccount> {
  const input = profileUpdateSchema.parse(rawInput);
  const normalizedPhone =
    input.phone !== undefined
      ? input.phone
        ? normalizePhoneNumber(input.phone)
        : null
      : undefined;
  const normalizedEmail =
    input.email !== undefined
      ? input.email
        ? input.email.toLowerCase()
        : null
      : undefined;

  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    const found = store.users.find((u) => u.id === userId);
    if (!found) throw new Error("User not found.");
    if (normalizedPhone) {
      const dupPhone = store.users.find((u) => u.id !== userId && u.phone === normalizedPhone);
      if (dupPhone) throw new Error("This phone number is already linked to another account.");
    }
    if (normalizedEmail) {
      const dupEmail = store.users.find((u) => u.id !== userId && u.email?.toLowerCase() === normalizedEmail);
      if (dupEmail) throw new Error("This email address is already linked to another account.");
    }
    if (input.fullName !== undefined) found.fullName = input.fullName;
    if (normalizedEmail !== undefined) found.email = normalizedEmail;
    if (normalizedPhone !== undefined) found.phone = normalizedPhone;
    if (input.preferredCitySlug !== undefined) found.preferredCitySlug = input.preferredCitySlug;
    if (input.favoriteCategories !== undefined) found.favoriteCategories = input.favoriteCategories;
    const { passwordHash: _ignored, ...user } = found;
    return user;
  }

  const currentRes = await pool.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [userId]);
  if (currentRes.rowCount === 0) throw new Error("User not found.");
  const current = mapUserRow(currentRes.rows[0]);

  if (normalizedPhone) {
    const dupPhone = await pool.query("SELECT id FROM users WHERE phone = $1 AND id <> $2 LIMIT 1", [
      normalizedPhone,
      userId
    ]);
    if ((dupPhone.rowCount ?? 0) > 0) {
      throw new Error("This phone number is already linked to another account.");
    }
  }
  if (normalizedEmail) {
    const dupEmail = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1",
      [normalizedEmail, userId]
    );
    if ((dupEmail.rowCount ?? 0) > 0) {
      throw new Error("This email address is already linked to another account.");
    }
  }

  const res = await pool.query(
    `UPDATE users SET
       full_name = $2,
       email = $3,
       phone = $4,
       preferred_city_slug = $5,
       favorite_categories_json = $6::jsonb
     WHERE id = $1 RETURNING *`,
    [
      userId,
      input.fullName ?? current.fullName,
      normalizedEmail !== undefined ? normalizedEmail : current.email,
      normalizedPhone !== undefined ? normalizedPhone : current.phone,
      input.preferredCitySlug ?? current.preferredCitySlug,
      JSON.stringify(input.favoriteCategories ?? current.favoriteCategories)
    ]
  );
  return mapUserRow(res.rows[0]);
}

export async function listUsersWithRoles(): Promise<{
  users: (UserAccount & { assignments: RoleAssignmentRecord[] })[];
}> {
  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    return {
      users: store.users.map(({ passwordHash: _p, ...u }) => ({
        ...u,
        assignments: store.roleAssignments.filter((r) => r.userId === u.id)
      }))
    };
  }

  const [uRes, raRes] = await Promise.all([
    pool.query("SELECT * FROM users ORDER BY created_at DESC"),
    pool.query("SELECT * FROM role_assignments ORDER BY created_at DESC")
  ]);
  const raByUser = new Map<string, RoleAssignmentRecord[]>();
  for (const row of raRes.rows) {
    const mapped = mapRoleRow(row);
    const arr = raByUser.get(mapped.userId) ?? [];
    arr.push(mapped);
    raByUser.set(mapped.userId, arr);
  }
  return {
    users: uRes.rows.map((r) => {
      const u = mapUserRow(r);
      return { ...u, assignments: raByUser.get(u.id) ?? [] };
    })
  };
}

export async function assignRoleToUser(
  rawInput: unknown,
  actor: UserAccount
): Promise<RoleAssignmentRecord> {
  const input = assignRoleSchema.parse(rawInput);
  const record: RoleAssignmentRecord = {
    id: `ra_${crypto.randomUUID().slice(0, 12)}`,
    userId: input.userId,
    role: input.role,
    organizationId: input.organizationId ?? null,
    venueSlug: input.venueSlug ?? null,
    eventId: input.eventId ?? null,
    grantedBy: actor.id,
    createdAt: new Date().toISOString()
  };

  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    if (!store.users.some((u) => u.id === input.userId)) {
      throw new Error("Target user not found.");
    }
    store.roleAssignments.push(record);
    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: "platform_super_admin",
      action: "ASSIGN_ROLE",
      targetType: "user",
      targetId: input.userId,
      afterJson: record
    });
    return record;
  }

  await pool.query(
    `INSERT INTO role_assignments (id, user_id, role, organization_id, venue_slug, event_id, granted_by, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      record.id,
      record.userId,
      record.role,
      record.organizationId,
      record.venueSlug,
      record.eventId,
      record.grantedBy,
      record.createdAt
    ]
  );
  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRole: "platform_super_admin",
    action: "ASSIGN_ROLE",
    targetType: "user",
    targetId: input.userId,
    afterJson: record
  });
  return record;
}
