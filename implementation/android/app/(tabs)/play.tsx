import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatInr, NIGHTLIFEZ_TOKENS, SEED_ACTIVITIES } from "@nightlifez/shared";
import { NativeTopBar } from "../../src/components/NativeDiscovery";

export default function PlayScreen() {
  const [citySlug, setCitySlug] = useState("all");
  const [category, setCategory] = useState("all");

  const items = SEED_ACTIVITIES.filter((a) => {
    if (citySlug !== "all" && a.citySlug !== citySlug) return false;
    if (category !== "all" && a.category !== category) return false;
    return true;
  });

  return (
    <View style={styles.root}>
      <NativeTopBar selectedCity={citySlug} onSelectCity={setCitySlug} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.demoTag}>
          <Text style={styles.demoTagText}>Demo Activity Partner Inventory</Text>
        </View>
        <Text style={styles.title}>Play & Activities</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {["all", "sports", "recreation", "workshops", "adventure"].map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.chip, category === c && styles.chipActive]}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                {c === "all" ? "All Play" : c.charAt(0).toUpperCase() + c.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {items.map((a) => (
          <View key={a.id} style={styles.card}>
            <Text style={styles.catBadge}>{a.category.toUpperCase()}</Text>
            <Text style={styles.cardTitle}>{a.title}</Text>
            <Text style={styles.meta}>
              {a.venueName} · {a.durationLabel}
            </Text>
            <Text style={styles.price}>{formatInr(a.priceInr)} per session</Text>
            <View style={styles.slots}>
              {a.slots.map((s) => (
                <View key={s.id} style={styles.slotRow}>
                  <Text style={styles.slotLabel}>{s.label}</Text>
                  <Text style={styles.slotAvail}>{s.remaining} spots left</Text>
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
  root: { flex: 1, backgroundColor: NIGHTLIFEZ_TOKENS.colors.surfaceMuted },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  demoTag: {
    alignSelf: "flex-start",
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  demoTagText: { fontSize: 11, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.primary },
  title: { fontSize: 22, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  chips: { gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7
  },
  chipActive: {
    borderColor: NIGHTLIFEZ_TOKENS.colors.primary,
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.primary
  },
  chipText: { fontSize: 12, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.ink },
  chipTextActive: { color: "#FFFFFF" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    gap: 6
  },
  catBadge: { fontSize: 10, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.primary },
  cardTitle: { fontSize: 16, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  meta: { fontSize: 12, color: NIGHTLIFEZ_TOKENS.colors.inkMuted },
  price: { fontSize: 15, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  slots: { gap: 6, marginTop: 4 },
  slotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  slotLabel: { fontSize: 12, fontWeight: "600", color: NIGHTLIFEZ_TOKENS.colors.ink },
  slotAvail: { fontSize: 11, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.available }
});
