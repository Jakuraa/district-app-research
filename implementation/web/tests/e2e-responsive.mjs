import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const DEMO_PASS = process.env.NIGHTLIFEZ_SANDBOX_DEMO_PASSWORD ?? "NightlifezDemo#2026";

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 }
];

async function run() {
  const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const browser = await chromium.launch({ executablePath, headless: true });

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // 1. Attendee journey: Homepage -> Events -> Event Detail -> Book -> Hold -> Confirm
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.getByText("NIGHTLIFEZ").first().waitFor();
    await page.getByRole("link", { name: "Events" }).first().click();
    await page.waitForURL("**/events**");

    await page.getByText("Solstice Soundwave | Bengaluru").first().click();
    await page.waitForURL("**/events/solstice-soundwave-bengaluru-2026");

    await page.getByRole("link", { name: "Book tickets" }).first().click();
    await page.waitForURL("**/events/solstice-soundwave-bengaluru-2026/book");

    await page.getByRole("button", { name: "2", exact: true }).click();
    await page.getByRole("button", { name: "Proceed", exact: true }).click();
    await page.getByRole("button", { name: /NIGHT15/i }).click();
    await page.getByRole("button", { name: /Lock Tickets with 10-Minute Inventory Hold/i }).click();
    await page.getByText(/INVENTORY HOLD ACTIVE/i).waitFor({ timeout: 8000 });

    await page.getByPlaceholder("Asha Rao").fill("Playwright QA User");
    await page.getByPlaceholder("asha@example.com").fill("qa@nightlifez.test");
    await page.getByRole("button", { name: /Confirm Demo Reservation/i }).click();
    await page.getByText(/DEMO RESERVATION CONFIRMED/i).waitFor({ timeout: 10000 });
    console.log("E2E attendee booking & hold flow passed.");

    // 2. Organiser portal phone-first OTP sign-in & verification
    await page.goto(`${BASE_URL}/account`, { waitUntil: "networkidle" });
    await page.locator("#nlz-phone-input").fill("9876500005");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    const syntheticOtp = await page.getByTestId("preview-synthetic-otp").innerText();
    await page.locator("#nlz-otp-input").fill(syntheticOtp.trim());
    await page.getByRole("button", { name: "Verify & Continue", exact: true }).click();
    await page.getByText(/Meera Nair/i).waitFor({ timeout: 8000 });

    await page.goto(`${BASE_URL}/organiser`, { waitUntil: "networkidle" });
    await page.getByText(/Organiser Operations Console/i).waitFor({ timeout: 8000 });
    await page.getByText(/Gross Demo Sales/i).waitFor({ timeout: 8000 });
    console.log("E2E organiser console flow passed.");

    // 3. Responsive viewport horizontal-overflow checks across 8 required viewports
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      for (const route of ["/", "/events", "/trips", "/memberships", "/events/solstice-soundwave-bengaluru-2026/book", "/organiser", "/admin", "/staff"]) {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 1;
        });
        assert.equal(
          overflow,
          false,
          `Horizontal overflow detected at ${vp.width}x${vp.height} on ${route}`
        );
      }
    }
    console.log(`Responsive overflow checks passed across all ${VIEWPORTS.length} viewports.`);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
