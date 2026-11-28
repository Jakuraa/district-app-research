"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ALL_ROLES,
  formatInr,
  SEED_CITIES,
  type AuditLogEntry,
  type BookingRecord,
  type City,
  type FeatureFlag,
  type LedgerEntry,
  type Organization,
  type PulseEvent,
  type RefundRequest,
  type RoleAssignmentRecord,
  type SettlementBatch,
  type SupportCase,
  type UserAccount,
  type Venue
} from "@nightlifez/shared";
import { AppHeader } from "@/components/AppHeader";

interface AdminOverview {
  kpis: {
    citiesCount: number;
    eventsCount: number;
    publishedEventsCount: number;
    organizationsCount: number;
    pendingOrgsCount: number;
    venuesCount: number;
    bookingsCount: number;
    confirmedBookingsCount: number;
    grossDemoVolumeInr: number;
    ticketsIssued: number;
    ticketsCheckedIn: number;
    pendingRefundsCount: number;
    openSupportCasesCount: number;
  };
  cities: City[];
  events: PulseEvent[];
  organizations: Organization[];
  venues: Venue[];
  users: (UserAccount & { assignments: RoleAssignmentRecord[] })[];
  bookings: BookingRecord[];
  refunds: RefundRequest[];
  ledger: LedgerEntry[];
  settlements: SettlementBatch[];
  supportCases: SupportCase[];
  featureFlags: FeatureFlag[];
  auditLogs: AuditLogEntry[];
}

export default function AdminConsolePage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"kpis" | "users" | "support" | "finance" | "config" | "audit">("kpis");
  const [notice, setNotice] = useState<string | null>(null);

  const [roleUserId, setRoleUserId] = useState("");
  const [roleName, setRoleName] = useState("platform_operations");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastAudience, setBroadcastAudience] = useState("USER");
  const [citySlug, setCitySlug] = useState("");
  const [cityName, setCityName] = useState("");
  const [cityState, setCityState] = useState("");

  async function loadOverview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/overview");
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Access denied");
        return;
      }
      setData(json);
      if (json.users?.length > 0 && !roleUserId) {
        setRoleUserId(json.users[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  async function moderate(
    targetType: "event" | "organization" | "venue" | "user",
    targetId: string,
    decision: "APPROVE" | "REJECT" | "SUSPEND" | "PAUSE" | "ACTIVATE"
  ) {
    const res = await fetch("/api/admin/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, decision, note: `Admin action: ${decision}` })
    });
    const json = await res.json();
    setNotice(res.ok ? `${targetType} ${targetId} -> ${decision}` : json?.error ?? "Action failed");
    if (res.ok) await loadOverview();
  }

  async function assignRole(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: roleUserId, role: roleName })
    });
    const json = await res.json();
    setNotice(res.ok ? `Assigned ${roleName} to user.` : json?.error ?? "Role assignment failed");
    if (res.ok) await loadOverview();
  }

  async function toggleFlag(flag: FeatureFlag) {
    const res = await fetch("/api/admin/flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: flag.key, enabled: !flag.enabled })
    });
    if (res.ok) {
      setNotice(`Flag ${flag.key} -> ${!flag.enabled}`);
      await loadOverview();
    }
  }

  async function processRefund(refundId: string) {
    const res = await fetch(`/api/refunds/${encodeURIComponent(refundId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PROCESSED", resolutionNote: "Settled in sandbox finance ops" })
    });
    if (res.ok) {
      setNotice(`Refund ${refundId} marked PROCESSED.`);
      await loadOverview();
    }
  }

  async function createSettlement(orgId: string) {
    const res = await fetch("/api/admin/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: orgId, periodLabel: "Nov 2026 Sandbox Cycle" })
    });
    if (res.ok) {
      setNotice(`Created demo settlement batch for ${orgId}.`);
      await loadOverview();
    }
  }

  async function resolveCase(caseId: string) {
    const res = await fetch("/api/support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: caseId, status: "RESOLVED", note: "Resolved by platform support" })
    });
    if (res.ok) {
      setNotice(`Support case ${caseId} resolved.`);
      await loadOverview();
    }
  }

  async function sendBroadcast(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience: broadcastAudience,
        title: broadcastTitle,
        body: broadcastBody,
        kind: "SYSTEM"
      })
    });
    if (res.ok) {
      setBroadcastTitle("");
      setBroadcastBody("");
      setNotice("Announcement broadcast sent.");
      await loadOverview();
    }
  }

  async function saveCity(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: citySlug, name: cityName, state: cityState, isPopular: false })
    });
    if (res.ok) {
      setCitySlug("");
      setCityName("");
      setCityState("");
      setNotice("Master city added.");
      await loadOverview();
    }
  }

  return (
    <div className="min-h-screen pb-14">
      <AppHeader cities={data?.cities ?? SEED_CITIES} />
      <main className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-6">
        <div>
          <span className="inline-block rounded-full bg-[#111319] px-3 py-1 text-[11px] font-bold text-white">
            NIGHTLIFEZ Platform Administration
          </span>
          <h1 className="mt-1 text-2xl font-extrabold text-[#111319]">
            Governance, Moderation, Finance & Audit Console
          </h1>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#e4e6f0] bg-white p-8 text-sm text-[#5e6473]">
            Loading platform administration console...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-[#dc2626] bg-white p-6">
            <h2 className="text-base font-extrabold text-[#dc2626]">Restricted Platform Console</h2>
            <p className="mt-1 text-sm text-[#5e6473]">{error}</p>
            <Link href="/account" className="mt-4 inline-block rounded-xl bg-[#5b3df5] px-4 py-2 text-xs font-bold text-white">
              Sign in as Platform Admin →
            </Link>
          </div>
        ) : data ? (
          <>
            {notice ? <div className="rounded-xl bg-[#efeafe] px-4 py-2 text-xs font-bold text-[#5b3df5]">{notice}</div> : null}

            <div className="flex flex-wrap gap-2">
              {(["kpis", "users", "support", "finance", "config", "audit"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase ${
                    tab === t ? "bg-[#111319] text-white" : "border border-[#e4e6f0] bg-white text-[#5e6473]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === "kpis" ? (
              <section className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    { label: "Events", val: `${data.kpis.publishedEventsCount}/${data.kpis.eventsCount}` },
                    { label: "Orgs (Pending)", val: `${data.kpis.organizationsCount} (${data.kpis.pendingOrgsCount})` },
                    { label: "Venues", val: String(data.kpis.venuesCount) },
                    { label: "Confirmed Bookings", val: String(data.kpis.confirmedBookingsCount) },
                    { label: "Demo GMV", val: formatInr(data.kpis.grossDemoVolumeInr) },
                    { label: "Check-ins", val: `${data.kpis.ticketsCheckedIn}/${data.kpis.ticketsIssued}` }
                  ].map((k) => (
                    <div key={k.label} className="rounded-2xl border border-[#e4e6f0] bg-white p-4">
                      <div className="text-[11px] font-bold text-[#5e6473]">{k.label}</div>
                      <div className="mt-1 text-lg font-extrabold text-[#111319]">{k.val}</div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
                    <h2 className="text-base font-extrabold text-[#111319]">Organiser Approvals</h2>
                    <div className="mt-3 space-y-2 text-xs">
                      {data.organizations.map((o) => (
                        <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f6f7fb] p-3">
                          <div>
                            <div className="font-bold">{o.name}</div>
                            <div className="text-[#5e6473]">{o.contactEmail} · {o.approvalStatus}</div>
                          </div>
                          <div className="flex gap-1.5">
                            <button type="button" onClick={() => void moderate("organization", o.id, "APPROVE")} className="rounded-lg bg-[#16a34a] px-2.5 py-1 font-bold text-white">Approve</button>
                            <button type="button" onClick={() => void moderate("organization", o.id, "SUSPEND")} className="rounded-lg bg-[#dc2626] px-2.5 py-1 font-bold text-white">Suspend</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
                    <h2 className="text-base font-extrabold text-[#111319]">Event Publication Moderation</h2>
                    <div className="mt-3 space-y-2 text-xs">
                      {data.events.map((e) => (
                        <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f6f7fb] p-3">
                          <div>
                            <div className="font-bold">{e.title}</div>
                            <div className="text-[#5e6473]">{e.organizerName} · {e.lifecycleStatus ?? "PUBLISHED"}</div>
                          </div>
                          <div className="flex gap-1.5">
                            <button type="button" onClick={() => void moderate("event", e.id, "APPROVE")} className="rounded-lg bg-[#16a34a] px-2.5 py-1 font-bold text-white">Publish</button>
                            <button type="button" onClick={() => void moderate("event", e.id, "PAUSE")} className="rounded-lg bg-[#d97706] px-2.5 py-1 font-bold text-white">Pause</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {tab === "users" ? (
              <section className="space-y-4">
                <form onSubmit={assignRole} className="grid gap-3 rounded-2xl border border-[#e4e6f0] bg-white p-5 sm:grid-cols-3">
                  <select value={roleUserId} onChange={(e) => setRoleUserId(e.target.value)} className="rounded-xl border border-[#e4e6f0] bg-white px-3 py-2 text-xs font-bold">
                    {data.users.map((u) => (
                      <option key={u.id} value={u.id}>{u.email}</option>
                    ))}
                  </select>
                  <select value={roleName} onChange={(e) => setRoleName(e.target.value)} className="rounded-xl border border-[#e4e6f0] bg-white px-3 py-2 text-xs font-bold">
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <button type="submit" className="rounded-xl bg-[#5b3df5] px-4 py-2 text-xs font-bold text-white">Grant Role</button>
                </form>

                <div className="space-y-2 rounded-2xl border border-[#e4e6f0] bg-white p-5 text-xs">
                  {data.users.map((u) => (
                    <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f6f7fb] p-3">
                      <div>
                        <div className="font-bold">{u.fullName} ({u.email})</div>
                        <div className="text-[#5e6473]">
                          Roles: {u.assignments.map((a) => a.role).join(", ")} · {u.status}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void moderate("user", u.id, u.status === "ACTIVE" ? "SUSPEND" : "ACTIVATE")}
                        className="rounded-lg border border-[#e4e6f0] bg-white px-3 py-1 font-bold"
                      >
                        {u.status === "ACTIVE" ? "Suspend" : "Activate"}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {tab === "support" ? (
              <section className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
                  <h2 className="text-base font-extrabold text-[#111319]">Support Cases ({data.supportCases.length})</h2>
                  <div className="mt-3 space-y-2 text-xs">
                    {data.supportCases.map((c) => (
                      <div key={c.id} className="rounded-xl bg-[#f6f7fb] p-3">
                        <div className="flex items-center justify-between font-bold">
                          <span>{c.subject}</span>
                          <span>{c.status}</span>
                        </div>
                        <p className="mt-1 text-[#5e6473]">{c.notes[c.notes.length - 1]?.text}</p>
                        {c.status !== "RESOLVED" ? (
                          <button type="button" onClick={() => void resolveCase(c.id)} className="mt-2 rounded-lg bg-[#16a34a] px-2.5 py-1 font-bold text-white">
                            Resolve Case
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
                  <h2 className="text-base font-extrabold text-[#111319]">Refund Queue ({data.refunds.length})</h2>
                  <div className="mt-3 space-y-2 text-xs">
                    {data.refunds.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-xl bg-[#f6f7fb] p-3">
                        <div>
                          <div className="font-bold">{r.bookingId} · {formatInr(r.amountInr)}</div>
                          <div className="text-[#5e6473]">{r.status} · {r.reason}</div>
                        </div>
                        {r.status === "APPROVED" || r.status === "REQUESTED" ? (
                          <button type="button" onClick={() => void processRefund(r.id)} className="rounded-lg bg-[#5b3df5] px-2.5 py-1 font-bold text-white">
                            Process Refund
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {tab === "finance" ? (
              <section className="space-y-4 rounded-2xl border border-[#e4e6f0] bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-extrabold text-[#111319]">Settlements & Ledger</h2>
                  <div className="flex gap-2">
                    {data.organizations.map((o) => (
                      <button key={o.id} type="button" onClick={() => void createSettlement(o.id)} className="rounded-xl bg-[#5b3df5] px-3 py-1.5 text-xs font-bold text-white">
                        Settle {o.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  {data.settlements.map((s) => (
                    <div key={s.id} className="flex justify-between rounded-xl bg-[#f6f7fb] p-3">
                      <span className="font-bold">{s.organizationId} · {s.periodLabel} · {s.status}</span>
                      <span className="font-extrabold text-[#16a34a]">Net: {formatInr(s.netPayoutInr)}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {tab === "config" ? (
              <section className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
                  <h2 className="text-base font-extrabold text-[#111319]">Feature Flags</h2>
                  <div className="mt-3 space-y-2 text-xs">
                    {data.featureFlags.map((f) => (
                      <div key={f.key} className="flex items-center justify-between rounded-xl bg-[#f6f7fb] p-3">
                        <div>
                          <div className="font-mono font-bold">{f.key}</div>
                          <div className="text-[#5e6473]">{f.description}</div>
                        </div>
                        <button type="button" onClick={() => void toggleFlag(f)} className={`rounded-lg px-3 py-1 font-bold text-white ${f.enabled ? "bg-[#16a34a]" : "bg-[#6b7280]"}`}>
                          {f.enabled ? "ON" : "OFF"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <form onSubmit={sendBroadcast} className="space-y-2 rounded-2xl border border-[#e4e6f0] bg-white p-5 text-xs">
                    <h2 className="text-base font-extrabold text-[#111319]">Broadcast Announcement</h2>
                    <select value={broadcastAudience} onChange={(e) => setBroadcastAudience(e.target.value)} className="w-full rounded-xl border border-[#e4e6f0] bg-white px-3 py-2 font-bold">
                      <option value="USER">All Attendees</option>
                      <option value="ORGANISER">All Organisers</option>
                      <option value="STAFF">All Staff</option>
                    </select>
                    <input type="text" required value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} placeholder="Title" className="w-full rounded-xl border border-[#e4e6f0] px-3 py-2" />
                    <textarea required rows={2} value={broadcastBody} onChange={(e) => setBroadcastBody(e.target.value)} placeholder="Message" className="w-full rounded-xl border border-[#e4e6f0] px-3 py-2" />
                    <button type="submit" className="rounded-xl bg-[#111319] px-4 py-2 font-bold text-white">Broadcast</button>
                  </form>

                  <form onSubmit={saveCity} className="space-y-2 rounded-2xl border border-[#e4e6f0] bg-white p-5 text-xs">
                    <h2 className="text-base font-extrabold text-[#111319]">Add Master City</h2>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="text" required value={citySlug} onChange={(e) => setCitySlug(e.target.value)} placeholder="slug" className="rounded-xl border border-[#e4e6f0] px-2.5 py-2" />
                      <input type="text" required value={cityName} onChange={(e) => setCityName(e.target.value)} placeholder="Name" className="rounded-xl border border-[#e4e6f0] px-2.5 py-2" />
                      <input type="text" required value={cityState} onChange={(e) => setCityState(e.target.value)} placeholder="State" className="rounded-xl border border-[#e4e6f0] px-2.5 py-2" />
                    </div>
                    <button type="submit" className="rounded-xl bg-[#5b3df5] px-4 py-2 font-bold text-white">Save City</button>
                  </form>
                </div>
              </section>
            ) : null}

            {tab === "audit" ? (
              <section className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
                <h2 className="text-base font-extrabold text-[#111319]">Immutable Audit Log ({data.auditLogs.length})</h2>
                <div className="mt-3 space-y-2 text-xs">
                  {data.auditLogs.map((a) => (
                    <div key={a.id} className="rounded-xl bg-[#f6f7fb] p-3">
                      <div className="flex flex-wrap justify-between font-bold">
                        <span>{a.action} · {a.targetType}:{a.targetId}</span>
                        <span className="text-[#5e6473]">{a.actorEmail} ({a.actorRole})</span>
                      </div>
                      <div className="mt-1 text-[11px] text-[#5e6473]">{a.createdAt}</div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
