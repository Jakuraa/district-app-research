import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatInr, PULSEPASS_TOKENS, SEED_RESTAURANTS } from "@pulsepass/shared";
import { NativeTopBar } from "../../src/components/NativeDiscovery";

export default function DiningScreen() {
  const [citySlug, setCitySlug] = useState("all");
  const [cuisine, setCuisine] = useState("all");

  const items = SEED_RESTAURANTS.filter((r) => {
    if (citySlug !== "all" && r.citySlug !== citySlug) return false;
    if (cuisine !== "all" && !r.cuisines.some((c) => c.toLowerCase().includes(cuisine.toLowerCase()))) {
      return false;
    }
    return true;
  });

  return (
    <View style={styles.root}>
      <NativeTopBar selectedCity={citySlug} onSelectCity={setCitySlug} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.demoTag}>
          <Text style={styles.demoTagText}>Demo Restaurant Partner Inventory</Text>
        </View>
        <Text style={styles.title}>Dining & Table Offers</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {["all", "Coastal", "Pan-Asian", "South Indian", "Goan"].map((c) => (
            <Pressable
              key={c}
              onPress={() => setCuisine(c)}
              style={[styles.chip, cuisine === c && styles.chipActive]}
            >
              <Text style={[styles.chipText, cuisine === c && styles.chipTextActive]}>
                {c === "all" ? "All Cuisines" : c}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {items.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardName}>{r.name}</Text>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>{r.rating.toFixed(1)} ★</Text>
              </View>
            </View>
            <Text style={styles.meta}>
              {r.cuisines.join(", ")} · {formatInr(r.budgetForTwoInr)} for two
            </Text>
            <Text style={styles.locality}>
              {r.locality} · {r.distanceKm} km away
            </Text>
            {r.offerText ? (
              <View style={styles.offerBar}>
                <Text style={styles.offerText}>{r.offerText}</Text>
              </View>
            ) : null}
            <View style={styles.slotRow}>
              {r.availableSlots.map((s) => (
                <View key={s} style={styles.slotPill}>
                  <Text style={styles.slotText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PULSEPASS_TOKENS.colors.surfaceMuted },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  demoTag: {
    alignSelf: "flex-start",
    backgroundColor: PULSEPASS_TOKENS.colors.availableBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  demoTagText: { fontSize: 11, fontWeight: "700", color: PULSEPASS_TOKENS.colors.available },
  title: { fontSize: 22, fontWeight: "800", color: PULSEPASS_TOKENS.colors.ink },
  chips: { gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.border,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7
  },
  chipActive: {
    borderColor: PULSEPASS_TOKENS.colors.primary,
    backgroundColor: PULSEPASS_TOKENS.colors.primary
  },
  chipText: { fontSize: 12, fontWeight: "700", color: PULSEPASS_TOKENS.colors.ink },
  chipTextActive: { color: "#FFFFFF" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.border,
    gap: 6
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardName: { fontSize: 16, fontWeight: "800", color: PULSEPASS_TOKENS.colors.ink, flex: 1 },
  ratingBadge: {
    backgroundColor: PULSEPASS_TOKENS.colors.available,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  ratingText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  meta: { fontSize: 12, color: PULSEPASS_TOKENS.colors.inkMuted },
  locality: { fontSize: 11, color: PULSEPASS_TOKENS.colors.inkMuted },
  offerBar: {
    backgroundColor: PULSEPASS_TOKENS.colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  offerText: { fontSize: 11, fontWeight: "700", color: PULSEPASS_TOKENS.colors.primary },
  slotRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  slotPill: {
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  slotText: { fontSize: 11, fontWeight: "700", color: PULSEPASS_TOKENS.colors.primary }
});
