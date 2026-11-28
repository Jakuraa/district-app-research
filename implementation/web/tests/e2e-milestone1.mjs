import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

async function run() {
  const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const browser = await chromium.launch({ executablePath, headless: true });

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // 1. Public Storefront /o/nightlifez-originals (desktop & mobile responsive check)
    await page.goto(`${BASE_URL}/o/nightlifez-originals`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "NIGHTLIFEZ Originals" }).waitFor({ timeout: 8000 });
    await page.getByText("Verified Organiser").waitFor();

    for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(vp);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      assert.equal(overflow, false, `Overflow on /o/nightlifez-originals at ${vp.width}x${vp.height}`);
    }
    await page.setViewportSize({ width: 1280, height: 800 });

    // Pending org must return 404
    const pendingRes = await page.goto(`${BASE_URL}/o/coastal-sounds-guild`, { waitUntil: "domcontentloaded" });
    assert.equal(pendingRes?.status(), 404);
    console.log("E2E storefront access, privacy, and responsiveness passed.");

    // 2. Organiser OTP login
    await page.goto(`${BASE_URL}/account`, { waitUntil: "networkidle" });
    await page.locator("#nlz-phone-input").fill("9876500005");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    const syntheticOtp = await page.getByTestId("preview-synthetic-otp").innerText();
    await page.locator("#nlz-otp-input").fill(syntheticOtp.trim());
    await page.getByRole("button", { name: "Verify & Continue", exact: true }).click();
    await page.getByText(/Meera Nair/i).waitFor({ timeout: 8000 });

    // 3. Organiser portal: Storefront tab, Duplication, Approval-required event + Question Builder
    await page.goto(`${BASE_URL}/organiser`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "storefront", exact: true }).click();
    await page.getByText("Public Organiser Storefront").waitFor();

    await page.getByRole("button", { name: "events", exact: true }).click();
    await page.getByPlaceholder("Event title").fill("E2E Approval Showcase");
    await page.getByPlaceholder("Event summary (min 10 chars)").fill("Curated E2E approval showcase event.");
    await page.getByLabel("Require Guest Approval").check();
    await page.getByRole("button", { name: "Publish Event", exact: true }).click();
    await page.getByText(/Event "E2E Approval Showcase" published/i).waitFor({ timeout: 8000 });

    // Run it again duplication on first event
    await page.getByRole("button", { name: "Run it again" }).first().click();
    await page.getByRole("button", { name: "Create Draft Copy" }).click();
    await page.getByText(/Duplicated as DRAFT/i).waitFor({ timeout: 8000 });

    // 3.5 Configure a required custom booking question on the newly created event and test CSV import with it
    await page.getByRole("button", { name: "Questions" }).first().click();
    await page.getByRole("button", { name: "+ Add Question" }).click();
    await page.getByPlaceholder("Question label (e.g. Instagram handle)").first().fill("Instagram Handle");
    await page.locator('input[type="checkbox"]').last().check();
    await page.getByRole("button", { name: "Save Questions" }).click();
    await page.getByText(/Saved 1 booking question/i).waitFor({ timeout: 8000 });

    // 4. Guests tab + CSV import with custom question + A4 Printable Guest List
    await page.getByRole("button", { name: "guests", exact: true }).click();
    await page.getByText("Add Walk-In, Cash, VIP or Comp Guest").waitFor();
    const eventSelect = page.locator("section select").first();
    const targetOptionVal = await eventSelect.locator("option").first().getAttribute("value");
    if (targetOptionVal) await eventSelect.selectOption(targetOptionVal);
    await page.getByText("Expected headers:").waitFor();
    await page.getByText(/Instagram Handle \(required\)/i).waitFor({ timeout: 8000 });
    await page.getByRole("button", { name: "Load Template" }).click();

    const csvPayload = [
      "name,email,phone,tier,type,Instagram Handle",
      `"E2E, Quoted",e2e-csv-ok-${Date.now()}@nightlifez.test,9876500111,,VIP,@e2e.quoted`,
      `"Missing Answer",e2e-csv-fail-${Date.now()}@nightlifez.test,9876500112,,COMP,`
    ].join("\n");
    await page.locator("textarea").last().fill(csvPayload);
    await page.getByRole("button", { name: "Validate & Import Guest List" }).click();
    await page.getByText(/Imported 1 pass\(es\)\. Duplicates skipped: 0\. Errors: 1\./i).waitFor({ timeout: 8000 });
    await page.getByText(/Line 3:.*Instagram Handle.*required/i).waitFor({ timeout: 8000 });

    await page.getByRole("link", { name: "Print A4 / PDF Guest List" }).click();
    await page.waitForURL("**/organiser/guest-list/**");
    await page.getByText("NIGHTLIFEZ · A4 Door Guest List").waitFor({ timeout: 8000 });
    await page.getByText("E2E, Quoted").waitFor({ timeout: 8000 });
    console.log("E2E organiser duplication, custom-question CSV import, and A4 print view passed.");

    // 5. Attendee approval request -> Organiser approve -> Pay link completion
    await page.goto(`${BASE_URL}/o/nightlifez-originals`, { waitUntil: "networkidle" });
    const reqLink = page.getByRole("link", { name: "Request Spot" }).first();
    await reqLink.click();
    await page.waitForURL("**/events/**/book");
    await page.getByRole("button", { name: "1", exact: true }).click();
    await page.getByRole("button", { name: "Proceed", exact: true }).click();
    const igInput = page.locator('input[type="text"]').last();
    if (await igInput.isVisible()) {
      await igInput.fill("@e2e.requester");
    }
    await page.getByRole("button", { name: /Request Spot \(Approval Required/i }).click();
    await page.getByText(/REQUEST SUBMITTED · AWAITING ORGANISER APPROVAL/i).waitFor({ timeout: 8000 });

    await page.goto(`${BASE_URL}/organiser`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "approvals", exact: true }).click();
    await page.getByRole("button", { name: "Approve & Generate Pay Link" }).first().click();
    await page.getByText(/Request approved/i).waitFor({ timeout: 8000 });

    const payHref = await page.locator('a[href^="/bookings/approve/"]').first().getAttribute("href");
    assert.ok(payHref, "Expected approval payment link");
    await page.goto(`${BASE_URL}${payHref}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Complete Demo Payment/i }).click();
    await page.getByText(/Confirmed! Your QR passes are ready below/i).waitFor({ timeout: 8000 });
    console.log("E2E guest approval -> payment -> pass issuance passed.");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
