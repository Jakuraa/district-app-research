import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
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

    // 1. Homepage -> Events -> Event Detail -> Book flow
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.getByText("PulsePass").first().waitFor();
    await page.getByRole("link", { name: "Events" }).first().click();
    await page.waitForURL("**/events**");

    await page.getByText("Solstice Soundwave | Bengaluru").first().click();
    await page.waitForURL("**/events/solstice-soundwave-bengaluru-2026");

    await page.getByRole("link", { name: "Book tickets" }).first().click();
    await page.waitForURL("**/events/solstice-soundwave-bengaluru-2026/book");

    // Quantity gate -> 2 -> Proceed
    await page.getByRole("button", { name: "2", exact: true }).click();
    await page.getByRole("button", { name: "Proceed", exact: true }).click();

    // Apply offer PULSE15
    await page.getByRole("button", { name: /PULSE15/i }).click();

    // Submit demo reservation
    await page.getByPlaceholder("Asha Rao").fill("Playwright QA User");
    await page.getByPlaceholder("asha@example.com").fill("qa@pulsepass.test");
    await page.getByRole("button", { name: /Confirm Demo Reservation/i }).click();

    await page.getByText(/DEMO RESERVATION CONFIRMED/i).waitFor({ timeout: 10000 });
    console.log("E2E booking flow passed.");

    // 2. Responsive viewport horizontal-overflow checks across all 10 viewports
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      for (const route of ["/", "/events", "/events/solstice-soundwave-bengaluru-2026/book"]) {
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
