import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { formatInr, getMinTierPrice, PULSEPASS_TOKENS, SEED_EVENTS } from "@pulsepass/shared";

const CATEGORIES = ["all", "concerts", "festivals", "comedy"] as const;

export default function EventsTab() {
  const router = useRouter();
  const [category, setCategory] = useState<string>("all");

  const filtered =
    category === "all" ? SEED_EVENTS : SEED_EVENTS.filter((e) => e.category === category);

  return (
    <View style={styles.container}>
      <View style={styles.chipRow}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => setCategory(cat)}
            style={[styles.chip, category === cat && styles.chipActive]}
          >
            <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
              {cat.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/events/${item.slug}`)}
            style={styles.rowCard}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>
              {item.dateLabel} · {item.venueName}
            </Text>
            <Text style={styles.price}>{formatInr(getMinTierPrice(item.tiers))} onwards</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PULSEPASS_TOKENS.colors.surfaceMuted, padding: 16 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.border,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  chipActive: {
    backgroundColor: PULSEPASS_TOKENS.colors.primary,
    borderColor: PULSEPASS_TOKENS.colors.primary
  },
  chipText: { fontSize: 11, fontWeight: "700", color: PULSEPASS_TOKENS.colors.ink },
  chipTextActive: { color: "#FFFFFF" },
  list: { gap: 12 },
  rowCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.border,
    gap: 4
  },
  title: { fontSize: 16, fontWeight: "700", color: PULSEPASS_TOKENS.colors.ink },
  meta: { fontSize: 12, color: PULSEPASS_TOKENS.colors.inkMuted },
  price: { fontSize: 14, fontWeight: "800", color: PULSEPASS_TOKENS.colors.primary, marginTop: 4 }
});
