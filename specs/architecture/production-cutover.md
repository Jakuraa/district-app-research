# NIGHTLIFEZ Production Cutover & Rollback Plan (`https://nightlifez.com`)

## Cutover Gate Status

**Status: GATED — DO NOT SWITCH `https://nightlifez.com` YET**

Reasons currently gating production cutover:
1. Production environment variables (`DATABASE_URL`, `DIRECT_URL`, `NIGHTLIFEZ_SESSION_SECRET`, authorized payment gateway credentials when approved) must be configured in the separate `nightlifez` Vercel project (`Production` target) pointing to a dedicated production Neon database — never the legacy `strangersmeetup` database.
2. Live payment gateway integration remains intentionally disabled (`DEMO_NO_CHARGE` sandbox adapter active pending explicit owner approval).
3. Physical Android release APK verification on an attached ADB device has not run yet (`adb devices -l` empty on host).

## Pre-Cutover Verification Checklist

- [x] Root npm workspace (`implementation/shared` + `implementation/web`) builds cleanly on Node 24.x (`next build`).
- [x] Attendee, Organiser, Venue, Staff, and Platform Admin portals implemented with server-enforced RBAC.
- [x] Database schema migration and synthetic seed verified (`implementation/web/db/schema.sql`).
- [ ] Dedicated production Neon database provisioned, backed up, and migrated (`npm run db:migrate`).
- [ ] Production environment variables verified on Vercel `nightlifez` project (`Production`).
- [ ] Apex (`nightlifez.com`) and `www.nightlifez.com` DNS / SSL verification staged without deleting `strangersmeetup`.
- [ ] Owner explicit sign-off on live payment model and cutover window.

## Rollback Plan

1. **Keep `strangersmeetup` intact**: Do NOT delete the original `strangersmeetup` Vercel project or its database.
2. **Immediate Domain Revert**: If any P0/P1 regression occurs after pointing `nightlifez.com` and `www.nightlifez.com` to `nightlifez`:
   - Reassign `nightlifez.com` and `www.nightlifez.com` back to `strangersmeetup` in Vercel Domains (`team_KL8HQkLc8KATs1G9pqQ5o3FZ`), or run `vercel domains` / Vercel Dashboard reassignment.
   - Verify HTTP 200 and health endpoint on `https://nightlifez.com`.
3. **Database Rollback**: Do not run destructive `DROP` migrations; retain pre-cutover Neon branch snapshot for instant point-in-time restore.
