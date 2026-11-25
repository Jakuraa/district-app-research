import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatInr, getMinTierPrice, PULSEPASS_TOKENS, SEED_EVENTS } from "@pulsepass/shared";

export default function EventDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const event = SEED_EVENTS.find((e) => e.slug === slug) ?? SEED_EVENTS[0];
  const minPrice = getMinTierPrice(event.tiers);

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.hero, { backgroundColor: event.accentColor }]}>
          <Text style={styles.phaseBadge}>{event.activePhase.replace("_", " ")}</Text>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.meta}>{event.dateLabel}</Text>
          <Text style={styles.meta}>{event.venueName}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.body}>{event.summary}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sales Timeline</Text>
          {event.salesTimeline.map((step) => (
            <View key={step.label} style={styles.timelineRow}>
              <Text style={styles.timelineLabel}>{step.label}</Text>
              <Text style={styles.timelineState}>{step.state.toUpperCase()}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Offers</Text>
          {event.offers.map((offer) => (
            <View key={offer.id} style={styles.offerCard}>
              <Text style={styles.offerTitle}>
                {offer.title} ({offer.code})
              </Text>
              <Text style={styles.offerDesc}>{offer.description}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Facilities & Policies</Text>
          {event.facilities.map((fac) => (
            <Text key={fac} style={styles.bullet}>
              • {fac}
            </Text>
          ))}
          {event.policies.map((pol) => (
            <Text key={pol} style={styles.bullet}>
              • {pol}
            </Text>
          ))}
        </View>
      </ScrollView>

      <View style={styles.stickyBar}>
        <View>
          <Text style={styles.stickyPrice}>{formatInr(minPrice)} onwards</Text>
          <Text style={styles.stickyOffers}>{event.offers.length} offers available</Text>
        </View>
        <Pressable
          onPress={() => router.push(`/events/${event.slug}/book`)}
          style={styles.bookButton}
        >
          <Text style={styles.bookButtonText}>Book tickets</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PULSEPASS_TOKENS.colors.surfaceMuted },
  scroll: { paddingBottom: 90 },
  hero: { padding: 20, gap: 6 },
  phaseBadge: { color: "#E0E7FF", fontSize: 11, fontWeight: "700" },
  title: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  meta: { color: "#F3F4F6", fontSize: 13 },
  section: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.border,
    gap: 8
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: PULSEPASS_TOKENS.colors.ink },
  body: { fontSize: 13, color: PULSEPASS_TOKENS.colors.inkMuted, lineHeight: 19 },
  timelineRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  timelineLabel: { fontSize: 13, fontWeight: "600", color: PULSEPASS_TOKENS.colors.ink },
  timelineState: { fontSize: 11, fontWeight: "700", color: PULSEPASS_TOKENS.colors.primary },
  offerCard: {
    backgroundColor: PULSEPASS_TOKENS.colors.primarySoft,
    borderRadius: 10,
    padding: 10
  },
  offerTitle: { fontSize: 13, fontWeight: "700", color: PULSEPASS_TOKENS.colors.primary },
  offerDesc: { fontSize: 12, color: PULSEPASS_TOKENS.colors.inkMuted, marginTop: 2 },
  bullet: { fontSize: 13, color: PULSEPASS_TOKENS.colors.inkMuted },
  stickyBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: PULSEPASS_TOKENS.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  stickyPrice: { fontSize: 17, fontWeight: "800", color: PULSEPASS_TOKENS.colors.ink },
  stickyOffers: { fontSize: 11, color: PULSEPASS_TOKENS.colors.inkMuted },
  bookButton: {
    backgroundColor: PULSEPASS_TOKENS.colors.ink,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 11
  },
  bookButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" }
});
