import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

async function run() {
  const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const browser = await chromium.launch({ executablePath, headless: true });

  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();

    // 1. Account page renders phone-first login + non-prod QA directory of all 11 roles
    await page.goto(`${BASE_URL}/account`, { waitUntil: "networkidle" });
    await page.getByText("Log in or sign up").waitFor();
    const qaDir = page.getByTestId("qa-identity-directory");
    await qaDir.waitFor();
    await page.getByText(/Synthetic Role Identities \(11 roles\)/i).waitFor();

    // 2. Test invalid OTP error state & change phone number action
    await page.locator("#nlz-phone-input").fill("9876500002");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByTestId("preview-synthetic-otp").waitFor();
    await page.locator("#nlz-otp-input").fill("000000");
    await page.getByRole("button", { name: "Verify & Continue", exact: true }).click();
    await page.getByText(/Invalid OTP/i).waitFor();

    await page.getByRole("button", { name: /Change phone number/i }).click();
    await page.locator("#nlz-phone-input").waitFor();

    // 3. Log in as multi-org Organiser Owner via OTP and verify workspace switcher
    await page.locator("#nlz-phone-input").fill("9876500005");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    const orgOtp = await page.getByTestId("preview-synthetic-otp").innerText();
    await page.locator("#nlz-otp-input").fill(orgOtp.trim());
    await page.getByRole("button", { name: "Verify & Continue", exact: true }).click();

    await page.getByText(/Meera Nair/i).waitFor({ timeout: 8000 });
    await page.getByText(/NIGHTLIFEZ Originals/i).waitFor();
    await page.getByText(/Harbor Collective/i).waitFor();

    // Switch to Harbor Collective organiser workspace
    await page.getByRole("button", { name: /Harbor Collective/i }).click();
    await page.waitForURL("**/organiser?org=org-harbor-collective");
    await page.getByText(/Organiser Operations Console/i).waitFor({ timeout: 8000 });

    // Sign out
    await page.goto(`${BASE_URL}/account`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Sign Out", exact: true }).click();
    await page.locator("#nlz-phone-input").waitFor({ timeout: 8000 });

    // 4. Log in as Platform Super Admin via OTP and verify /admin
    await page.locator("#nlz-phone-input").fill("9876500002");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    const adminOtp = await page.getByTestId("preview-synthetic-otp").innerText();
    await page.locator("#nlz-otp-input").fill(adminOtp.trim());
    await page.getByRole("button", { name: "Verify & Continue", exact: true }).click();
    await page.getByText(/Nikhil Verma/i).waitFor({ timeout: 8000 });
    await page.getByRole("button", { name: /Platform Console/i }).click();
    await page.waitForURL("**/admin");
    await page.getByText(/Governance, Moderation, Finance & Audit Console/i).waitFor({ timeout: 8000 });

    console.log("Playwright OTP login journeys passed.");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
