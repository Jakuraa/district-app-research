import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  formatInr,
  getMinTierPrice,
  PULSEPASS_TOKENS,
  SEED_CITIES,
  type PulseEvent
} from "@pulsepass/shared";

interface NativeTopBarProps {
  selectedCity: string;
  onSelectCity: (slug: string) => void;
}

export function NativeTopBar({ selectedCity, onSelectCity }: NativeTopBarProps) {
  const router = useRouter();
  const [cityModalOpen, setCityModalOpen] = useState(false);

  const cityObj = SEED_CITIES.find((c) => c.slug === selectedCity);
  const cityLabel = selectedCity === "all" ? "All Cities" : cityObj?.name ?? selectedCity;
  const locality = selectedCity === "all" ? "India · Pan-city" : cityObj?.locality ?? cityObj?.state ?? "";

  return (
    <SafeAreaView edges={["top"]} style={styles.safeTop}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Select city"
          onPress={() => setCityModalOpen(true)}
          style={styles.cityTrigger}
        >
          <View style={styles.brandDot}>
            <Text style={styles.brandDotText}>P</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cityTitle} numberOfLines={1}>
              {cityLabel} ▾
            </Text>
            <Text style={styles.citySub} numberOfLines={1}>
              {locality}
            </Text>
          </View>
        </Pressable>

        <View style={styles.topActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search"
            onPress={() => router.push("/search")}
            style={styles.iconPill}
          >
            <Text style={styles.iconPillText}>Search</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tickets Wallet"
            onPress={() => router.push("/bookings")}
            style={styles.iconPill}
          >
            <Text style={styles.iconPillText}>Tickets</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Account"
            onPress={() => router.push("/account")}
            style={styles.avatarBtn}
          >
            <Text style={styles.avatarText}>U</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={cityModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCityModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Location</Text>
              <Pressable onPress={() => setCityModalOpen(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => {
                onSelectCity("all");
                setCityModalOpen(false);
              }}
              style={[styles.cityOption, selectedCity === "all" && styles.cityOptionActive]}
            >
              <Text style={styles.cityOptionTitle}>All Cities</Text>
              <Text style={styles.cityOptionSub}>Pan-India Discovery</Text>
            </Pressable>
            {SEED_CITIES.map((c) => (
              <Pressable
                key={c.slug}
                onPress={() => {
                  onSelectCity(c.slug);
                  setCityModalOpen(false);
                }}
                style={[styles.cityOption, selectedCity === c.slug && styles.cityOptionActive]}
              >
                <Text style={styles.cityOptionTitle}>{c.name}</Text>
                <Text style={styles.cityOptionSub}>{c.locality ?? c.state}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export function NativeEventCard({
  event,
  width
}: {
  event: PulseEvent;
  width?: number;
}) {
  const router = useRouter();
  const minPrice = getMinTierPrice(event.tiers);
  const topOffer = event.offers[0];

  return (
    <Pressable
      onPress={() => router.push(`/events/${event.slug}`)}
      style={[styles.eventCard, width ? { width } : undefined]}
    >
      <View style={[styles.posterArea, { backgroundColor: event.accentColor }]}>
        <View style={styles.posterTopRow}>
          <View style={styles.badgeDark}>
            <Text style={styles.badgeText}>{event.category.toUpperCase()}</Text>
          </View>
          <View style={styles.badgePrimary}>
            <Text style={styles.badgeText}>{event.activePhase.replace("_", " ")}</Text>
          </View>
        </View>
        <View style={styles.posterDecorCircle} />
        <Text style={styles.posterHeadline} numberOfLines={2}>
          {event.title}
        </Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardDate}>{event.dateLabel}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.cardVenue} numberOfLines={1}>
          {event.venueName}
        </Text>
        {topOffer ? (
          <View style={styles.offerChip}>
            <Text style={styles.offerChipText} numberOfLines={1}>
              {topOffer.title} · {topOffer.code}
            </Text>
          </View>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={styles.priceText}>{formatInr(minPrice)} onwards</Text>
          <Text style={styles.bookLink}>Book →</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeTop: {
    backgroundColor: PULSEPASS_TOKENS.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: PULSEPASS_TOKENS.colors.border
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10
  },
  cityTrigger: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  brandDot: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: PULSEPASS_TOKENS.colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  brandDotText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  cityTitle: { fontSize: 14, fontWeight: "800", color: PULSEPASS_TOKENS.colors.ink },
  citySub: { fontSize: 11, color: PULSEPASS_TOKENS.colors.inkMuted },
  topActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconPill: {
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.border,
    backgroundColor: PULSEPASS_TOKENS.colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  iconPillText: { fontSize: 11, fontWeight: "700", color: PULSEPASS_TOKENS.colors.ink },
  avatarBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: PULSEPASS_TOKENS.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: { fontSize: 12, fontWeight: "800", color: PULSEPASS_TOKENS.colors.primary },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 8
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: PULSEPASS_TOKENS.colors.ink },
  modalClose: { fontSize: 13, fontWeight: "700", color: PULSEPASS_TOKENS.colors.primary },
  cityOption: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.border
  },
  cityOptionActive: {
    borderColor: PULSEPASS_TOKENS.colors.primary,
    backgroundColor: PULSEPASS_TOKENS.colors.primarySoft
  },
  cityOptionTitle: { fontSize: 14, fontWeight: "700", color: PULSEPASS_TOKENS.colors.ink },
  cityOptionSub: { fontSize: 11, color: PULSEPASS_TOKENS.colors.inkMuted },
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.border
  },
  posterArea: {
    height: 142,
    padding: 12,
    justifyContent: "space-between",
    overflow: "hidden"
  },
  posterDecorCircle: {
    position: "absolute",
    right: -24,
    top: -24,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.14)"
  },
  posterTopRow: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  badgeDark: {
    backgroundColor: "rgba(17,19,25,0.65)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  badgePrimary: {
    backgroundColor: PULSEPASS_TOKENS.colors.primary,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  badgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },
  posterHeadline: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  cardBody: { padding: 12, gap: 4 },
  cardDate: { fontSize: 11, fontWeight: "700", color: PULSEPASS_TOKENS.colors.primary },
  cardTitle: { fontSize: 15, fontWeight: "800", color: PULSEPASS_TOKENS.colors.ink },
  cardVenue: { fontSize: 12, color: PULSEPASS_TOKENS.colors.inkMuted },
  offerChip: {
    backgroundColor: PULSEPASS_TOKENS.colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2
  },
  offerChipText: { fontSize: 10, fontWeight: "700", color: PULSEPASS_TOKENS.colors.primary },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: PULSEPASS_TOKENS.colors.border,
    paddingTop: 8,
    marginTop: 4
  },
  priceText: { fontSize: 14, fontWeight: "800", color: PULSEPASS_TOKENS.colors.ink },
  bookLink: { fontSize: 12, fontWeight: "700", color: PULSEPASS_TOKENS.colors.primary }
});
