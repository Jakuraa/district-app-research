import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getMinTierPrice, PULSEPASS_TOKENS, SEED_EVENTS } from "@pulsepass/shared";
import { NativeEventCard, NativeTopBar } from "../../src/components/NativeDiscovery";

export default function EventsTabScreen() {
  const [citySlug, setCitySlug] = useState("all");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"featured" | "price_asc">("featured");

  const filtered = SEED_EVENTS.filter((e) => {
    if (citySlug !== "all" && e.citySlug !== citySlug) return false;
    if (category !== "all" && e.category !== category) return false;
    return true;
  }).sort((a, b) =>
    sortBy === "price_asc"
      ? getMinTierPrice(a.tiers) - getMinTierPrice(b.tiers)
      : Number(b.isFeatured) - Number(a.isFeatured)
  );

  return (
    <View style={styles.root}>
      <NativeTopBar selectedCity={citySlug} onSelectCity={setCitySlug} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Live Events</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {["all", "concerts", "festivals", "comedy", "music", "parties"].map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.chip, category === c && styles.chipActive]}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                {c === "all" ? "All Events" : c.charAt(0).toUpperCase() + c.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sortRow}>
          <Pressable
            onPress={() => setSortBy("featured")}
            style={[styles.sortPill, sortBy === "featured" && styles.sortPillActive]}
          >
            <Text style={styles.sortText}>Relevance</Text>
          </Pressable>
          <Pressable
            onPress={() => setSortBy("price_asc")}
            style={[styles.sortPill, sortBy === "price_asc" && styles.sortPillActive]}
          >
            <Text style={styles.sortText}>Price: Low to High</Text>
          </Pressable>
        </View>

        <View style={styles.list}>
          {filtered.map((evt) => (
            <NativeEventCard key={evt.id} event={evt} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PULSEPASS_TOKENS.colors.surfaceMuted },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
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
  sortRow: { flexDirection: "row", gap: 8 },
  sortPill: {
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.border,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  sortPillActive: {
    borderColor: PULSEPASS_TOKENS.colors.primary,
    backgroundColor: PULSEPASS_TOKENS.colors.primarySoft
  },
  sortText: { fontSize: 11, fontWeight: "700", color: PULSEPASS_TOKENS.colors.ink },
  list: { gap: 12 }
});
