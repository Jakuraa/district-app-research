import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { PULSEPASS_TOKENS, SEED_EVENTS } from "@pulsepass/shared";

export default function SearchTab() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = q
    ? SEED_EVENTS.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.venueName.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
      )
    : SEED_EVENTS;

  return (
    <View style={styles.container}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search events, venues, or cities..."
        style={styles.input}
      />
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No matching events.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/events/${item.slug}`)}
            style={styles.card}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>{item.venueName}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PULSEPASS_TOKENS.colors.surfaceMuted, padding: 16, gap: 12 },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14
  },
  list: { gap: 10 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.border
  },
  title: { fontSize: 15, fontWeight: "700", color: PULSEPASS_TOKENS.colors.ink },
  meta: { fontSize: 12, color: PULSEPASS_TOKENS.colors.inkMuted, marginTop: 2 },
  empty: { textAlign: "center", color: PULSEPASS_TOKENS.colors.inkMuted, marginTop: 24 }
});
