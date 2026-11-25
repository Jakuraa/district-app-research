# District App Research Lab

A clean-room research workspace for studying the publicly observable user experience and product behaviour of event discovery and ticketing apps, using REA (Reverse Engineer Anything) as an analysis assistant.

This workspace is deliberately separate from NIGHTLIFEZ. It contains research notes, screenshots that are safe to share, behavioural specifications, and original implementation plans—not District source code, proprietary assets, credentials, personal data, or private API material.

## Goals

1. Map the major attendee journeys: discovery, search, event details, offers, ticket selection, seat/section selection, checkout, booking confirmation, and tickets.
2. Map organiser/partner journeys only where they are publicly observable or explicitly authorized.
3. Record UI states, responsive behaviour, validation, empty/error/loading states, and accessibility observations.
4. Convert observations into implementation-neutral requirements and original NIGHTLIFEZ product specifications.
5. Build independently using original NIGHTLIFEZ branding, code, design assets, and backend contracts.

## REA setup

Use Node.js 22.23.4+ (or supported Node 24/26), npm, and run setup from a trusted directory outside this repository and outside the app being analyzed:

```bash
npx rea-agents@latest setup --client antigravity
```

Review the proposed configuration changes, approve only the Antigravity MCP/skill changes you intend, and restart Antigravity. Do not approve installation of optional native tools unless needed.

For Android APK inspection, REA's Android analysis guide specifies a full JDK 17+ and a pinned JADX headless engine JAR. Follow the current upstream guide and verify its SHA-256. For connected-device inspection, install Android Platform Tools and verify `adb version`; REA does not install Android SDK or emulators for you.

Upstream REA documentation:
- https://github.com/morluto/rea
- https://github.com/morluto/rea/blob/main/docs/guides/android/android-analysis.md
- https://github.com/morluto/rea/blob/main/docs/guides/android/adb-device-analysis.md
- https://github.com/morluto/rea/blob/main/docs/guides/web/browser-observation.md
- https://github.com/morluto/rea/blob/main/DISCLAIMER.md

## Start here

1. Read `SCOPE.md`.
2. Complete `research/feature-inventory.md` based on observable flows.
3. Create one journey record per user journey under `research/journeys/`.
4. Add screenshots to `research/screens/` only after removing personal information. Keep raw captures and APKs in the ignored `local-artifacts/` folder.
5. Record every conclusion in `research/evidence/EVIDENCE_REGISTER.csv`, distinguishing observed facts, inferences, and unknowns.
6. Write original product requirements under `specs/` before implementation.

## Evidence discipline

For every observation, record the app version/build if known, Android version/device, date, entry point, action, visible result, evidence file, and confidence. Do not describe inferred backend logic as fact. If a behaviour cannot be observed, mark it unknown.

## Separation from NIGHTLIFEZ

No NIGHTLIFEZ repository, production database, secrets, payment credentials, deployment settings, or existing branches belong in this workspace. Do not copy source files from the NIGHTLIFEZ repository into this project.
