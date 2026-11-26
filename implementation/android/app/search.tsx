import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  NIGHTLIFEZ_TOKENS,
  SEED_ACTIVITIES,
  SEED_EVENTS,
  SEED_MOVIES,
  SEED_RESTAURANTS
} from "@nightlifez/shared";
import { NativeEventCard } from "../src/components/NativeDiscovery";

export default function AndroidSearchScreen() {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const matchedEvents = needle
    ? SEED_EVENTS.filter(
        (e) =>
          e.title.toLowerCase().includes(needle) ||
          e.venueName.toLowerCase().includes(needle) ||
          e.category.toLowerCase().includes(needle)
      )
    : SEED_EVENTS;

  const matchedMovies = needle
    ? SEED_MOVIES.filter((m) => m.title.toLowerCase().includes(needle))
    : [];
  const matchedDining = needle
    ? SEED_RESTAURANTS.filter(
        (r) =>
          r.name.toLowerCase().includes(needle) ||
          r.cuisines.some((c) => c.toLowerCase().includes(needle))
      )
    : [];
  const matchedPlay = needle
    ? SEED_ACTIVITIES.filter((a) => a.title.toLowerCase().includes(needle))
    : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search events, movies, dining, or play..."
        style={styles.input}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {["Solstice", "Coimbatore", "Comedy", "Tamarind", "Padel"].map((term) => (
          <Pressable key={term} onPress={() => setQuery(term)} style={styles.chip}>
            <Text style={styles.chipText}>{term}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {matchedEvents.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.heading}>Events ({matchedEvents.length})</Text>
          {matchedEvents.map((evt) => (
            <NativeEventCard key={evt.id} event={evt} />
          ))}
        </View>
      ) : null}

      {matchedMovies.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.heading}>Movies ({matchedMovies.length})</Text>
          {matchedMovies.map((m) => (
            <View key={m.id} style={styles.simpleCard}>
              <Text style={styles.simpleTitle}>{m.title}</Text>
              <Text style={styles.simpleMeta}>
                {m.language} · {m.genres.join(", ")}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {matchedDining.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.heading}>Dining ({matchedDining.length})</Text>
          {matchedDining.map((r) => (
            <View key={r.id} style={styles.simpleCard}>
              <Text style={styles.simpleTitle}>{r.name}</Text>
              <Text style={styles.simpleMeta}>
                {r.cuisines.join(", ")} · {r.locality}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {matchedPlay.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.heading}>Play ({matchedPlay.length})</Text>
          {matchedPlay.map((a) => (
            <View key={a.id} style={styles.simpleCard}>
              <Text style={styles.simpleTitle}>{a.title}</Text>
              <Text style={styles.simpleMeta}>{a.venueName}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NIGHTLIFEZ_TOKENS.colors.surfaceMuted },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14
  },
  chips: { gap: 8 },
  chip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  chipText: { fontSize: 12, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.ink },
  section: { gap: 10 },
  heading: { fontSize: 16, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  simpleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border
  },
  simpleTitle: { fontSize: 14, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  simpleMeta: { fontSize: 12, color: NIGHTLIFEZ_TOKENS.colors.inkMuted }
});
