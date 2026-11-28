# District Public Login & Partner Entry Observation (REA)

Captured via REA (`capture_browser_scenario` with Chromium 158.0.8127.37) on 2026-11-26.

## 1. Public Consumer Login Entry Point (`https://www.district.in/`)

Observed controls and structure:
- Top navigation header contains a single `Login` button (`button "Login"`).
- Clicking `Login` opens a modal dialog titled `Log in or sign up`.
- Dialog elements observed in accessibility tree:
  - Country code selector button defaulting to `+91` (India).
  - Mobile number text input (`textbox "Enter mobile number"`).
  - OTP delivery channel selector (`Send OTP via` -> `SMS`, `WhatsApp`).
  - Primary submit button `Continue` (initially `[disabled]` until valid input).
  - Legal consent text with links to `/policies/terms-of-service` (`Terms of Service`) and `/policies/privacy` (`Privacy Policy`).

## 2. Public Partner Login Entry Point (`https://www.district.in/events/list-your-event?utm_source=district`)

Observed controls and structure:
- Footer on `https://www.district.in/` links to `List your events` (`/events/list-your-event?utm_source=district`) and `List your restaurant` (external Zomato partner portal).
- `/events/list-your-event` renders the same unified header `Login` button (`button "Login"`), rather than a separate email/password partner login form.
- `https://publisher.district.in/` did not resolve/load in Chromium during controlled replay (navigation failed before initial state capture).

## 3. Explicit Unknowns (Not Publicly Observable Without Authorized Account)

- Post-OTP verification step transitions, OTP input digit count, resend timer duration, and error/rate-limit copy on District's live OTP endpoint were not triggered (no unauthorized SMS/OTP requests were sent).
- Post-login partner/admin workspace switching, role assignment resolution, and internal backend schemas/microservices are **unknown** and are not inferred.

## 4. Implementation-Neutral Specification for NIGHTLIFEZ

NIGHTLIFEZ uses these public UX observations to design an original, unified phone-number-first authentication system:
1. Single unified login entry point (`/account`) for all roles (attendees, organisers, venue managers, gate/box-office staff, support, finance, platform admins).
2. Country selector defaulting to India (`+91`) with E.164 phone normalization.
3. Phone number input + `Continue` CTA -> transitions to 6-digit OTP verification step with resend countdown, change phone number action, and explicit error/expired/invalid/success states.
4. New-account onboarding (name + optional email) for unrecognized phone numbers, while preserving existing accounts, bookings, tickets, and `role_assignments`.
5. Post-verification unified role & workspace resolver with multi-role / multi-organisation context switching and strict server-side permission enforcement.
