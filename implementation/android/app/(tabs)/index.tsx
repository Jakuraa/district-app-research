import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useRouter } from "expo-router";
import {
  formatInr,
  getMinTierPrice,
  PULSEPASS_TOKENS,
  SEED_CITIES,
  SEED_EVENTS
} from "@pulsepass/shared";

export default function DiscoverScreen() {
  const router = useRouter();
  const [citySlug, setCitySlug] = useState<string>("all");
  const [cityModalVisible, setCityModalVisible] = useState(false);

  const visibleEvents =
    citySlug === "all"
      ? SEED_EVENTS
      : SEED_EVENTS.filter((e) => e.citySlug === citySlug);

  const activeCityName =
    citySlug === "all"
      ? "All Cities"
      : SEED_CITIES.find((c) => c.slug === citySlug)?.name ?? citySlug;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.brandTitle}>PulsePass</Text>
          <Text style={styles.subtitle}>Independent Live Discovery</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Select city"
          onPress={() => setCityModalVisible(true)}
          style={styles.cityPill}
        >
          <Text style={styles.cityPillText}>{activeCityName} ▾</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionHeading}>Featured Experiences</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={visibleEvents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.horizontalList}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/events/${item.slug}`)}
            style={styles.card}
          >
            <View style={[styles.cardBanner, { backgroundColor: item.accentColor }]}>
              <Text style={styles.badgeText}>{item.category.toUpperCase()}</Text>
              <Text style={styles.dateText}>{item.dateLabel}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.cardVenue} numberOfLines={1}>
                {item.venueName}
              </Text>
              <Text style={styles.priceText}>
                {formatInr(getMinTierPrice(item.tiers))} onwards
              </Text>
            </View>
          </Pressable>
        )}
      />

      <Modal
        visible={cityModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCityModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Location</Text>
            <Pressable
              onPress={() => {
                setCitySlug("all");
                setCityModalVisible(false);
              }}
              style={styles.cityOption}
            >
              <Text style={styles.cityOptionText}>All Cities</Text>
            </Pressable>
            {SEED_CITIES.map((c) => (
              <Pressable
                key={c.slug}
                onPress={() => {
                  setCitySlug(c.slug);
                  setCityModalVisible(false);
                }}
                style={styles.cityOption}
              >
                <Text style={styles.cityOptionText}>
                  {c.name} · {c.state}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PULSEPASS_TOKENS.colors.surfaceMuted },
  content: { padding: 16, gap: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandTitle: { fontSize: 22, fontWeight: "800", color: PULSEPASS_TOKENS.colors.ink },
  subtitle: { fontSize: 12, color: PULSEPASS_TOKENS.colors.inkMuted },
  cityPill: {
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.border,
    backgroundColor: PULSEPASS_TOKENS.colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  cityPillText: { fontSize: 13, fontWeight: "600", color: PULSEPASS_TOKENS.colors.ink },
  sectionHeading: { fontSize: 18, fontWeight: "700", color: PULSEPASS_TOKENS.colors.ink },
  horizontalList: { gap: 12 },
  card: {
    width: 260,
    backgroundColor: PULSEPASS_TOKENS.colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.border
  },
  cardBanner: { padding: 14, height: 110, justifyContent: "space-between" },
  badgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  dateText: { color: "#F3F4F6", fontSize: 12 },
  cardBody: { padding: 14, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: PULSEPASS_TOKENS.colors.ink },
  cardVenue: { fontSize: 12, color: PULSEPASS_TOKENS.colors.inkMuted },
  priceText: { fontSize: 14, fontWeight: "800", color: PULSEPASS_TOKENS.colors.primary, marginTop: 4 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 10
  },
  modalTitle: { fontSize: 17, fontWeight: "700", marginBottom: 6 },
  cityOption: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.border
  },
  cityOptionText: { fontSize: 14, fontWeight: "600", color: PULSEPASS_TOKENS.colors.ink }
});
