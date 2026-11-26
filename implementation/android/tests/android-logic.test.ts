import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALL_ROLES,
  calculatePriceBreakdown,
  normalizePhoneNumber,
  otpRequestSchema,
  otpVerifySchema,
  SEED_EVENTS,
  SYNTHETIC_QA_IDENTITIES
} from "../../shared/src/index.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("Android Expo app configuration defines independent package id and EAS APK/AAB profiles", () => {
  const appJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../app.json"), "utf8"));
  const easJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../eas.json"), "utf8"));
  const pkgJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8"));

  assert.equal(appJson.expo.android.package, "com.jakuraa.nightlifez");
  assert.equal(appJson.expo.scheme, "nightlifez");
  assert.equal(appJson.expo.android.edgeToEdgeEnabled, undefined);
  assert.ok(pkgJson.dependencies["expo-constants"]);
  assert.ok(pkgJson.dependencies["expo-linking"]);
  assert.ok(pkgJson.dependencies["expo-camera"]);
  assert.equal(easJson.build.preview.android.buildType, "apk");
  assert.equal(easJson.build.production.android.buildType, "app-bundle");
});

test("Android booking screen shares deterministic pricing rules from @nightlifez/shared", () => {
  const event = SEED_EVENTS[3]; // Tides & Tempo Goa
  const breakdown = calculatePriceBreakdown({
    tiers: event.tiers,
    selections: [{ tierId: "tier-tide-ga", quantity: 2 }],
    offers: event.offers,
    offerCode: "GOASUN500",
    now: new Date("2026-11-26T00:00:00Z")
  });
  assert.equal(breakdown.subtotalInr, 7998);
  assert.equal(breakdown.discountInr, 500);
  assert.equal(breakdown.appliedOfferCode, "GOASUN500");
});

test("Android phone-first OTP schemas, normalization, and QA role parity match backend", () => {
  assert.equal(normalizePhoneNumber("98765 00001", "+91"), "+919876500001");
  assert.equal(otpRequestSchema.parse({ phone: "9876500001" }).countryCode, "+91");
  assert.throws(() => otpVerifySchema.parse({ challengeId: "otp_123456", code: "123" }));

  const qaRoles = new Set(SYNTHETIC_QA_IDENTITIES.flatMap((q) => q.roles.map((r) => r.role)));
  for (const role of ALL_ROLES) {
    assert.ok(qaRoles.has(role), `Missing Android QA identity for role: ${role}`);
  }
});
