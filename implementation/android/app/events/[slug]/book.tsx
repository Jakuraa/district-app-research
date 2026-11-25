import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  calculatePriceBreakdown,
  formatInr,
  getTierAvailability,
  PULSEPASS_TOKENS,
  SEED_EVENTS
} from "@pulsepass/shared";

export default function AndroidBookScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const event = SEED_EVENTS.find((e) => e.slug === slug) ?? SEED_EVENTS[0];
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [promoCode, setPromoCode] = useState<string>("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [reservedRef, setReservedRef] = useState<string | null>(null);

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

  function adjustQty(tierId: string, delta: number, maxAllowed: number) {
    setQuantities((prev) => {
      const next = Math.max(0, Math.min(maxAllowed, (prev[tierId] ?? 0) + delta));
      return { ...prev, [tierId]: next };
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{event.title}</Text>
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

      <View style={styles.summaryCard}>
        <Text style={styles.summaryRow}>Subtotal: {formatInr(breakdown.subtotalInr)}</Text>
        <Text style={styles.summaryRow}>Discount: -{formatInr(breakdown.discountInr)}</Text>
        <Text style={styles.summaryRow}>
          Fees + GST: {formatInr(breakdown.convenienceFeeInr + breakdown.gstInr)}
        </Text>
        <Text style={styles.totalRow}>Total Demo: {formatInr(breakdown.totalInr)}</Text>
      </View>

      {reservedRef ? (
        <Text style={styles.confirmed}>Demo Pass Reserved: {reservedRef} (No Charge)</Text>
      ) : (
        <Pressable
          disabled={breakdown.totalQuantity === 0}
          onPress={() => setReservedRef("PP-ANDROID-DEMO")}
          style={[styles.confirmBtn, breakdown.totalQuantity === 0 && { opacity: 0.45 }]}
        >
          <Text style={styles.confirmText}>Reserve Demo Pass</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PULSEPASS_TOKENS.colors.surfaceMuted },
  content: { padding: 16, gap: 12 },
  heading: { fontSize: 18, fontWeight: "800", color: PULSEPASS_TOKENS.colors.ink },
  tierCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.border
  },
  tierName: { fontSize: 15, fontWeight: "700", color: PULSEPASS_TOKENS.colors.ink },
  tierPrice: { fontSize: 14, fontWeight: "800", color: PULSEPASS_TOKENS.colors.primary },
  tierStatus: { fontSize: 11, color: PULSEPASS_TOKENS.colors.inkMuted },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: PULSEPASS_TOKENS.colors.surfaceMuted,
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
    borderColor: PULSEPASS_TOKENS.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  applyBtn: {
    backgroundColor: PULSEPASS_TOKENS.colors.ink,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: "center"
  },
  applyText: { color: "#FFFFFF", fontWeight: "700" },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.border,
    gap: 4
  },
  summaryRow: { fontSize: 13, color: PULSEPASS_TOKENS.colors.inkMuted },
  totalRow: { fontSize: 16, fontWeight: "800", color: PULSEPASS_TOKENS.colors.ink, marginTop: 4 },
  confirmBtn: {
    backgroundColor: PULSEPASS_TOKENS.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center"
  },
  confirmText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  confirmed: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "800",
    color: PULSEPASS_TOKENS.colors.available,
    paddingVertical: 12
  }
});
