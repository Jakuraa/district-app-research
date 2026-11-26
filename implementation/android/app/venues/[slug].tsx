import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { NIGHTLIFEZ_TOKENS, SEED_EVENTS, SEED_VENUES } from "@nightlifez/shared";
import { NativeEventCard } from "../../src/components/NativeDiscovery";

export default function NativeVenueDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const venue = SEED_VENUES.find((v) => v.slug === slug) ?? SEED_VENUES[0];
  const upcoming = SEED_EVENTS.filter((e) => e.venueSlug === venue.slug);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>{venue.headline}</Text>
        <Text style={styles.title}>{venue.name}</Text>
        <Text style={styles.meta}>{venue.address}</Text>
        <Text style={styles.body}>{venue.summary}</Text>
        <Text style={styles.status}>{venue.openStatusLabel}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Venue Sections</Text>
        {venue.sections.map((s) => (
          <View key={s.id} style={styles.row}>
            <Text style={styles.rowName}>{s.name}</Text>
            <Text style={styles.rowSub}>{s.zoneLabel}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Weekly Timings</Text>
        {venue.timings.map((t) => (
          <View key={t.day} style={styles.row}>
            <Text style={styles.rowName}>{t.day}</Text>
            <Text style={styles.rowSub}>{t.hours}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Facilities</Text>
        <View style={styles.chips}>
          {venue.facilities.map((f) => (
            <View key={f} style={styles.chip}>
              <Text style={styles.chipText}>{f}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.sectionHeading}>Happening Here ({upcoming.length})</Text>
      {upcoming.map((evt) => (
        <NativeEventCard key={evt.id} event={evt} />
      ))}

      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NIGHTLIFEZ_TOKENS.colors.surfaceMuted },
  content: { padding: 16, gap: 14, paddingBottom: 36 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    gap: 8
  },
  eyebrow: { fontSize: 11, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.primary, textTransform: "uppercase" },
  title: { fontSize: 22, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  meta: { fontSize: 12, color: NIGHTLIFEZ_TOKENS.colors.inkMuted },
  body: { fontSize: 13, color: NIGHTLIFEZ_TOKENS.colors.ink, lineHeight: 19 },
  status: { fontSize: 12, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.available },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  sectionHeading: { fontSize: 17, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  rowName: { fontSize: 13, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.ink },
  rowSub: { fontSize: 12, color: NIGHTLIFEZ_TOKENS.colors.inkMuted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  chipText: { fontSize: 11, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.ink },
  backBtn: { alignItems: "center", paddingVertical: 10 },
  backText: { fontSize: 13, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.primary }
});
