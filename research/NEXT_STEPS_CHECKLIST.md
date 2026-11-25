# Next-Step Checklist: Android Inspection & Authenticated Checkout

## 1. Authorized Android Device & APK Inspection (Blocked until device connected)
- [ ] Connect your physical Android phone (USB debugging enabled) or start an Android emulator.
- [ ] Verify connection: `adb devices -l` shows `device` (not `unauthorized` or empty).
- [ ] Locate the official District package via REA: `resolve_adb_packages` (e.g. matching `district`).
- [ ] Pull the installed base and split APKs from your authorized device into `local-artifacts/apk/` (gitignored) and record SHA-256 digests.
- [ ] Run REA static analysis: `inspect_android_package` (with JADX `0.8.0`) and `decode_android_resources` (with Apktool `3.0.3`).
- [ ] Document manifest activities, deep links, permissions, bottom navigation, hardware back behaviour, bottom sheets, and TalkBack accessibility in `research/android/`.

## 2. Manually Authenticated District Checkout & Account Screens
- [ ] Launch the isolated research Chrome profile bound to loopback only:
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222 \
    --user-data-dir="$HOME/nightlifez-dist/district-app-research/local-artifacts/browser-profile" \
    "https://www.district.in/"
  ```
- [ ] Manually sign in to your authorized District account in that browser window (never record OTPs, cookies, or tokens).
- [ ] Navigate to a ticket buy-page -> section selection -> checkout summary (stop before any real payment/purchase).
- [ ] Use REA `inspect_web_page` (redacting personal details) to document:
  - [ ] Checkout price breakdown, convenience fees, GST, and promo code validation states.
  - [ ] Payment method list & handoff states (observation only, no transactions).
  - [ ] Account profile, `My bookings`, ticket wallet/QR layout, and cancellation/support entry points.
- [ ] Update `research/feature-inventory.md`, `research/evidence/EVIDENCE_REGISTER.csv`, and `specs/` with any new findings.
