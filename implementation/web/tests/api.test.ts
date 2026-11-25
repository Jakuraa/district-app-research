import test from "node:test";
import assert from "node:assert/strict";
import {
  cancelDemoBooking,
  createDemoBooking,
  getEventDetail,
  getVenueDetail,
  listCitiesAndEvents
} from "../src/lib/repository.ts";

test("listCitiesAndEvents filters by city and category", async () => {
  const all = await listCitiesAndEvents();
  assert.ok(all.cities.length >= 4);
  assert.ok(all.events.length >= 4);

  const blr = await listCitiesAndEvents({ city: "bengaluru" });
  assert.equal(blr.events.length, 1);
  assert.equal(blr.events[0].slug, "solstice-soundwave-bengaluru-2026");
});

test("createDemoBooking decrements quota and cancelDemoBooking restores it", async () => {
  const detailBefore = await getEventDetail("southern-cipher-live-coimbatore-2026");
  assert.ok(detailBefore);
  const tierBefore = detailBefore.event.tiers.find((t) => t.id === "tier-indie-ga");
  assert.ok(tierBefore);
  const initialQuota = tierBefore.remainingQuota;

  const booking = await createDemoBooking({
    eventSlug: "southern-cipher-live-coimbatore-2026",
    attendeeName: "Karthik Raja",
    attendeeEmail: "karthik@example.com",
    offerCode: "CULT15",
    items: [{ tierId: "tier-indie-ga", quantity: 2 }]
  });

  assert.equal(booking.status, "CONFIRMED_DEMO");
  assert.equal(booking.offerCode, "CULT15");
  assert.equal(booking.discountInr, 210); // 15% of 1398 = 210

  const detailAfter = await getEventDetail("southern-cipher-live-coimbatore-2026");
  const tierAfter = detailAfter?.event.tiers.find((t) => t.id === "tier-indie-ga");
  assert.equal(tierAfter?.remainingQuota, initialQuota - 2);

  const cancelled = await cancelDemoBooking(booking.id);
  assert.equal(cancelled.status, "CANCELLED");

  const detailRestored = await getEventDetail("southern-cipher-live-coimbatore-2026");
  const tierRestored = detailRestored?.event.tiers.find((t) => t.id === "tier-indie-ga");
  assert.equal(tierRestored?.remainingQuota, initialQuota);
});

test("getVenueDetail resolves venue timings and upcoming events", async () => {
  const v = await getVenueDetail("skyline-amphitheatre-bengaluru");
  assert.ok(v);
  assert.equal(v.venue.timings.length, 7);
  assert.ok(v.upcomingEvents.length >= 1);
});
