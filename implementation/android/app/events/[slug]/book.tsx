import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  calculatePriceBreakdown,
  formatInr,
  getTierAvailability,
  NIGHTLIFEZ_TOKENS,
  SEED_EVENTS,
  SEED_VENUES,
  type BookingRecord
} from "@nightlifez/shared";
import { useNativeSession } from "../../../src/lib/session";

export default function AndroidBookScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { client, session, recordBooking } = useNativeSession();
  const event = SEED_EVENTS.find((e) => e.slug === slug) ?? SEED_EVENTS[0];
  const venue = SEED_VENUES.find((v) => v.slug === event.venueSlug) ?? null;

  const [targetQty, setTargetQty] = useState<number | null>(null);
  const [qtyGateDone, setQtyGateDone] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [promoCode, setPromoCode] = useState<string>("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [attendeeName, setAttendeeName] = useState(session.user?.fullName ?? "Asha Rao");
  const [attendeeEmail, setAttendeeEmail] = useState(session.user?.email ?? "asha@nightlifez.test");
  const [holdStatus, setHoldStatus] = useState<string | null>(null);
  const [holdId, setHoldId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reservedBooking, setReservedBooking] = useState<BookingRecord | null>(null);

  const selections = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, q]) => q > 0)
        .map(([tierId, quantity]) => ({ tierId, quantity })),
    [quantities]
  );

  const breakdown = useMemo(
    () =>
      calculatePriceBreakdown({
        tiers: event.tiers,
        selections,
        offers: event.offers,
        offerCode: appliedCode
      }),
    [event, selections, appliedCode]
  );

  function proceedQtyGate() {
    if (!targetQty) return;
    setQtyGateDone(true);
    const first = event.tiers.find((t) => t.remainingQuota >= targetQty);
    if (first) {
      setQuantities({ [first.id]: Math.min(targetQty, first.maxPerOrder) });
    }
  }

  function adjustQty(tierId: string, delta: number, maxAllowed: number) {
    setQuantities((prev) => {
      const next = Math.max(0, Math.min(maxAllowed, (prev[tierId] ?? 0) + delta));
      return { ...prev, [tierId]: next };
    });
  }

  async function lockHold() {
    if (selections.length === 0) return;
    try {
      const res = await client.createHold({
        eventSlug: event.slug,
        tierId: selections[0].tierId,
        quantity: selections[0].quantity,
        seatLabels: selectedSeats
      });
      setHoldId(res.hold.id);
      setHoldStatus(`10-min Hold Locked (${res.hold.id})`);
    } catch {
      setHoldStatus("Offline local hold active (10 min)");
    }
  }

  async function submitBooking() {
    if (breakdown.totalQuantity === 0) return;
    setSubmitting(true);
    try {
      const res = await client.createBooking({
        eventSlug: event.slug,
        attendeeName: attendeeName.trim() || "NIGHTLIFEZ Guest",
        attendeeEmail: attendeeEmail.trim() || "guest@nightlifez.test",
        offerCode: breakdown.appliedOfferCode,
        holdId,
        items: selections.map((s) => ({ ...s, seatLabels: selectedSeats }))
      });
      await recordBooking(res.booking);
      setReservedBooking(res.booking);
    } catch {
      const refCode = `NLZ-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
      const offlineBooking: BookingRecord = {
        id: `bkg_local_${Date.now()}`,
        referenceCode: refCode,
        attendeeEmail: attendeeEmail.trim() || "guest@nightlifez.test",
        attendeeName: attendeeName.trim() || "NIGHTLIFEZ Guest",
        eventId: event.id,
        eventSlug: event.slug,
        eventTitle: event.title,
        venueName: event.venueName,
        dateLabel: event.dateLabel,
        offerCode: breakdown.appliedOfferCode,
        subtotalInr: breakdown.subtotalInr,
        discountInr: breakdown.discountInr,
        convenienceFeeInr: breakdown.convenienceFeeInr,
        gstInr: breakdown.gstInr,
        totalInr: breakdown.totalInr,
        status: "CONFIRMED_DEMO",
        paymentMode: "DEMO_NO_CHARGE",
        createdAt: new Date().toISOString(),
        items: selections.map((s) => {
          const t = event.tiers.find((x) => x.id === s.tierId)!;
          return {
            tierId: s.tierId,
            tierName: t.name,
            quantity: s.quantity,
            unitPriceInr: t.priceInr,
            seatLabels: selectedSeats
          };
        }),
        tickets: [
          {
            id: `tkt_${Date.now()}`,
            bookingId: `bkg_local_${Date.now()}`,
            eventId: event.id,
            tierId: selections[0].tierId,
            tierName: event.tiers.find((x) => x.id === selections[0].tierId)?.name ?? "Pass",
            holderName: attendeeName.trim() || "NIGHTLIFEZ Guest",
            holderEmail: attendeeEmail.trim() || "guest@nightlifez.test",
            ticketCode: `NLZ-TKT-${refCode.slice(-6)}`,
            qrToken: `NLZ-OFFLINE-${refCode}`,
            seatLabel: selectedSeats[0] ?? null,
            status: "VALID",
            checkedInAt: null,
            checkedInBy: null
          }
        ]
      };
      await recordBooking(offlineBooking);
      setReservedBooking(offlineBooking);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{event.title}</Text>

      {!qtyGateDone ? (
        <View style={styles.gateCard}>
          <Text style={styles.gateEyebrow}>BEFORE YOU GO!</Text>
          <Text style={styles.gateTitle}>Select number of tickets</Text>
          <View style={styles.qtyGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <Pressable
                key={num}
                onPress={() => setTargetQty(num)}
                style={[styles.qtyCell, targetQty === num && styles.qtyCellActive]}
              >
                <Text style={[styles.qtyCellText, targetQty === num && { color: "#FFFFFF" }]}>
                  {num}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            disabled={!targetQty}
            onPress={proceedQtyGate}
            style={[styles.proceedBtn, !targetQty && { opacity: 0.4 }]}
          >
            <Text style={styles.proceedText}>Proceed</Text>
          </Pressable>
        </View>
      ) : null}

      {venue ? (
        <View style={styles.venueMapCard}>
          <Text style={styles.mapTitle}>Venue Sections · MAIN STAGE</Text>
          <View style={styles.mapSections}>
            {venue.sections.map((sec) => (
              <View key={sec.id} style={[styles.mapZone, { borderColor: sec.color }]}>
                <Text style={styles.mapZoneName}>{sec.name}</Text>
                <Text style={styles.mapZoneSub}>{sec.zoneLabel}</Text>
                {sec.seatRows?.map((row) => (
                  <View key={row.rowLabel} style={styles.seatRow}>
                    <Text style={styles.seatRowLabel}>{row.rowLabel}:</Text>
                    {Array.from({ length: row.seatCount }, (_, idx) => {
                      const seat = `${row.rowLabel}-${idx + 1}`;
                      const blocked = (row.unavailableSeats ?? []).includes(seat);
                      const picked = selectedSeats.includes(seat);
                      return (
                        <Pressable
                          key={seat}
                          disabled={blocked}
                          onPress={() =>
                            setSelectedSeats((prev) =>
                              prev.includes(seat) ? prev.filter((x) => x !== seat) : [...prev, seat]
                            )
                          }
                          style={[
                            styles.seatPill,
                            blocked && { opacity: 0.3 },
                            picked && { backgroundColor: NIGHTLIFEZ_TOKENS.colors.primary }
                          ]}
                        >
                          <Text style={[styles.seatText, picked && { color: "#FFFFFF" }]}>
                            {idx + 1}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {event.tiers.map((tier) => {
        const avail = getTierAvailability(tier);
        const qty = quantities[tier.id] ?? 0;
        const maxAllowed = Math.min(tier.maxPerOrder, tier.remainingQuota);
        return (
          <View key={tier.id} style={styles.tierCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.tierName}>{tier.name}</Text>
              <Text style={styles.tierPrice}>{formatInr(tier.priceInr)}</Text>
              <Text style={styles.tierStatus}>{avail.replace("_", " ")}</Text>
            </View>
            {avail !== "SOLD_OUT" ? (
              <View style={styles.stepper}>
                <Pressable onPress={() => adjustQty(tier.id, -1, maxAllowed)} style={styles.stepBtn}>
                  <Text style={styles.stepText}>-</Text>
                </Pressable>
                <Text style={styles.qtyVal}>{qty}</Text>
                <Pressable onPress={() => adjustQty(tier.id, 1, maxAllowed)} style={styles.stepBtn}>
                  <Text style={styles.stepText}>+</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}

      <View style={styles.promoBox}>
        <TextInput
          value={promoCode}
          onChangeText={setPromoCode}
          placeholder="Promo code"
          style={styles.input}
        />
        <Pressable onPress={() => setAppliedCode(promoCode.trim() || null)} style={styles.applyBtn}>
          <Text style={styles.applyText}>Apply</Text>
        </Pressable>
      </View>

      {breakdown.totalQuantity > 0 ? (
        <Pressable onPress={() => void lockHold()} style={styles.holdBtn}>
          <Text style={styles.holdBtnText}>
            {holdStatus ?? "Lock 10-Min Inventory Hold"}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryRow}>Subtotal: {formatInr(breakdown.subtotalInr)}</Text>
        <Text style={styles.summaryRow}>Discount: -{formatInr(breakdown.discountInr)}</Text>
        <Text style={styles.summaryRow}>
          Fees + GST: {formatInr(breakdown.convenienceFeeInr + breakdown.gstInr)}
        </Text>
        <Text style={styles.totalRow}>Total Demo: {formatInr(breakdown.totalInr)}</Text>
        <TextInput
          value={attendeeName}
          onChangeText={setAttendeeName}
          placeholder="Attendee Name"
          style={[styles.input, { marginTop: 8 }]}
        />
        <TextInput
          value={attendeeEmail}
          onChangeText={setAttendeeEmail}
          autoCapitalize="none"
          placeholder="Attendee Email"
          style={[styles.input, { marginTop: 6 }]}
        />
      </View>

      {reservedBooking ? (
        <View style={styles.confirmedBox}>
          <Text style={styles.confirmed}>
            Demo Pass Reserved: {reservedBooking.referenceCode} (No Charge)
          </Text>
          <Pressable onPress={() => router.push("/bookings")} style={styles.confirmBtn}>
            <Text style={styles.confirmText}>Open Digital Ticket Wallet</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          disabled={submitting || breakdown.totalQuantity === 0}
          onPress={() => void submitBooking()}
          style={[styles.confirmBtn, (submitting || breakdown.totalQuantity === 0) && { opacity: 0.45 }]}
        >
          <Text style={styles.confirmText}>
            {submitting ? "Reserving..." : "Reserve Demo Pass (No Charge)"}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NIGHTLIFEZ_TOKENS.colors.surfaceMuted },
  content: { padding: 16, gap: 12, paddingBottom: 36 },
  heading: { fontSize: 18, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  gateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    gap: 8
  },
  gateEyebrow: { fontSize: 10, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.primary },
  gateTitle: { fontSize: 16, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  qtyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  qtyCell: {
    width: "30%",
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center"
  },
  qtyCellActive: {
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.primary,
    borderColor: NIGHTLIFEZ_TOKENS.colors.primary
  },
  qtyCellText: { fontSize: 14, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  proceedBtn: {
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.ink,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 4
  },
  proceedText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  venueMapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    gap: 8
  },
  mapTitle: { fontSize: 12, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  mapSections: { gap: 6 },
  mapZone: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 8,
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.surfaceMuted,
    gap: 4
  },
  mapZoneName: { fontSize: 12, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  mapZoneSub: { fontSize: 10, color: NIGHTLIFEZ_TOKENS.colors.inkMuted },
  seatRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4, marginTop: 4 },
  seatRowLabel: { fontSize: 10, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.inkMuted },
  seatPill: {
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.borderStrong,
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3
  },
  seatText: { fontSize: 10, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.ink },
  tierCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border
  },
  tierName: { fontSize: 15, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.ink },
  tierPrice: { fontSize: 14, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.primary },
  tierStatus: { fontSize: 11, color: NIGHTLIFEZ_TOKENS.colors.inkMuted },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  stepText: { fontSize: 16, fontWeight: "800" },
  qtyVal: { fontSize: 15, fontWeight: "700", minWidth: 18, textAlign: "center" },
  promoBox: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  applyBtn: {
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.ink,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: "center"
  },
  applyText: { color: "#FFFFFF", fontWeight: "700" },
  holdBtn: {
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.primarySoft,
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center"
  },
  holdBtnText: { color: NIGHTLIFEZ_TOKENS.colors.primary, fontSize: 12, fontWeight: "800" },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    gap: 4
  },
  summaryRow: { fontSize: 13, color: NIGHTLIFEZ_TOKENS.colors.inkMuted },
  totalRow: { fontSize: 16, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink, marginTop: 4 },
  confirmBtn: {
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center"
  },
  confirmText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  confirmedBox: { gap: 10 },
  confirmed: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "800",
    color: NIGHTLIFEZ_TOKENS.colors.available,
    paddingVertical: 8
  }
});
