import assert from "node:assert/strict";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { chromium } from "playwright";

const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:3100";

async function loginWithPhoneOtp(page, phone) {
  await page.goto(`${BASE_URL}/account`, { waitUntil: "networkidle" });
  await page.locator("#nlz-phone-input").fill(phone);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const syntheticOtp = await page.getByTestId("preview-synthetic-otp").innerText();
  await page.locator("#nlz-otp-input").fill(syntheticOtp.trim());
  await page.getByRole("button", { name: "Verify & Continue", exact: true }).click();
  await page.getByText(/Sign Out/i).waitFor({ timeout: 10000 });
}

async function runDesktopFlow(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // 1. Organiser (Meera Nair) signs in and enables Direct UPI in /organiser -> payments tab
  await loginWithPhoneOtp(page, "9876500005");
  await page.goto(`${BASE_URL}/organiser`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^payments$/i }).click();
  await page.getByLabel(/Enable Direct UPI Payments at Checkout/i).check();
  await page.getByLabel(/UPI ID \(VPA\)/i).fill("nightlifez.org@okicici");
  await page.getByLabel(/Payee Display Name/i).fill("Nightlifez Events");
  await page.getByLabel(/Payment Instructions for Attendees/i).fill("Pay exact INR and include reference code.");
  await page.getByRole("button", { name: /Save Payment Settings/i }).click();
  await page.getByText(/Direct UPI settings saved/i).waitFor({ timeout: 10000 });

  // 2. Attendee books using Direct UPI on /events/solstice-soundwave-bengaluru-2026/book
  const attendeeContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const attPage = await attendeeContext.newPage();
  await attPage.goto(`${BASE_URL}/events/solstice-soundwave-bengaluru-2026/book`, { waitUntil: "networkidle" });

  await attPage.getByRole("button", { name: "1", exact: true }).click();
  await attPage.getByRole("button", { name: "Proceed", exact: true }).click();
  await attPage.getByPlaceholder("Asha Rao").fill("UPI E2E Attendee");
  await attPage.getByPlaceholder("asha@example.com").fill("upi.e2e@nightlifez.test");

  // Select Direct UPI payment option (defaults to ORGANISER_UPI when enabled)
  await attPage.getByLabel(/Payment Method/i).selectOption("ORGANISER_UPI");
  await attPage.locator('button[type="submit"]:has-text("Reserve & Pay Organiser via UPI")').click();

  // 3. Attendee sees genuine QR + deep link, NO issued tickets yet, submits "I've Paid"
  await attPage.getByTestId("direct-upi-panel").waitFor({ timeout: 10000 });
  const qrImg = attPage.getByTestId("upi-qr-img");
  await qrImg.waitFor({ timeout: 5000 });
  const deepLinkHref = await attPage.getByTestId("upi-deep-link").getAttribute("href");
  assert.ok(deepLinkHref?.startsWith("upi://pay?"), "Expected upi://pay deep link");

  const qrSrc = await qrImg.getAttribute("src");
  assert.ok(qrSrc?.startsWith("data:image/png;base64,"), "Expected PNG data URL for genuine QR");
  const qrPng = PNG.sync.read(Buffer.from(qrSrc.replace(/^data:image\/png;base64,/, ""), "base64"));
  const decodedQr = jsQR(new Uint8ClampedArray(qrPng.data), qrPng.width, qrPng.height);
  assert.ok(decodedQr, "Expected rendered QR image to be decodable");
  assert.equal(decodedQr.data, deepLinkHref, "Decoded QR payload must exactly match the UPI deep link URI");

  assert.equal(await attPage.getByText(/Issued Digital QR Passes/i).count(), 0, "Tickets must not exist before verification");

  const refHeading = await attPage.locator("h2", { hasText: "Reference:" }).textContent();
  const referenceCode = refHeading?.replace("Reference:", "").trim();
  assert.ok(referenceCode, "Expected booking reference code");

  await attPage.getByTestId("upi-utr-input").fill("UTR412988776655");
  await attPage.getByTestId("ive-paid-btn").click();
  await attPage.getByTestId("upi-claim-message").waitFor({ timeout: 10000 });
  assert.equal(await attPage.getByText(/Issued Digital QR Passes/i).count(), 0, "UTR claim must not auto-issue passes");

  // 4. Organiser verifies & approves in /organiser -> payments tab
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^payments$/i }).click();
  await page.getByText(referenceCode).waitFor({ timeout: 10000 });
  await page.getByText("UTR412988776655").first().waitFor({ timeout: 5000 });

  const card = page.locator("div.rounded-xl.bg-\\[\\#f6f7fb\\]", { hasText: referenceCode }).first();
  await card.getByRole("button", { name: /Verify & Approve/i }).click();
  await page.getByText(new RegExp(`Payment verified for ${referenceCode}`, "i")).waitFor({ timeout: 10000 });
  await card.getByText("CONFIRMED_DEMO").waitFor({ timeout: 10000 });

  // 5. Attendee sees confirmed booking & issued pass on /bookings
  await attPage.goto(`${BASE_URL}/bookings?email=${encodeURIComponent("upi.e2e@nightlifez.test")}`, {
    waitUntil: "networkidle"
  });
  await attPage.getByText(referenceCode).waitFor({ timeout: 10000 });
  await attPage.getByText(/CONFIRMED/i).first().waitFor({ timeout: 5000 });

  await attendeeContext.close();

  // Disable Direct UPI again so other baseline tests keep default demo checkout
  await page.getByLabel(/Enable Direct UPI Payments at Checkout/i).uncheck();
  await page.getByRole("button", { name: /Save Payment Settings/i }).click();
  await page.getByText(/Direct UPI settings saved/i).waitFor({ timeout: 10000 });

  // Mobile layout check reusing the authenticated organiser session
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /^payments$/i }).click();
  await page.getByLabel(/Enable Direct UPI Payments at Checkout/i).waitFor({ timeout: 10000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(overflow, false, "Mobile /organiser payments tab must not overflow horizontally");
  await context.close();
}

const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ executablePath, headless: true });
try {
  await runDesktopFlow(browser);
  console.log("Milestone 2 Direct UPI E2E passed (desktop + mobile)");
} finally {
  await browser.close();
}
