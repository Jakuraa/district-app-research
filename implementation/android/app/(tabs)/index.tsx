import { useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  DISCOVERY_CATEGORIES,
  formatInr,
  getMinTierPrice,
  PULSEPASS_TOKENS,
  SEED_ARTISTS,
  SEED_COLLECTIONS,
  SEED_EVENTS,
  SEED_VENUES
} from "@pulsepass/shared";
import { NativeEventCard, NativeTopBar } from "../../src/components/NativeDiscovery";

export default function ForYouScreen() {
  const router = useRouter();
  const [citySlug, setCitySlug] = useState<string>("all");

  const visibleEvents =
    citySlug === "all"
      ? SEED_EVENTS
      : SEED_EVENTS.filter((e) => e.citySlug === citySlug);

  const featured = visibleEvents.filter((e) => e.isFeatured);
  const heroEvent = featured[0] ?? visibleEvents[0] ?? SEED_EVENTS[0];
  const trending = visibleEvents.filter((e) => e.id !== heroEvent?.id);

  return (
    <View style={styles.root}>
      <NativeTopBar selectedCity={citySlug} onSelectCity={setCitySlug} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* 1. Hero Banner */}
        {heroEvent ? (
          <Pressable
            onPress={() => router.push(`/events/${heroEvent.slug}`)}
            style={styles.heroCard}
          >
            <View style={[styles.heroArt, { backgroundColor: heroEvent.accentColor }]}>
              <Text style={styles.heroBadge}>FEATURED · {heroEvent.category.toUpperCase()}</Text>
              <Text style={styles.heroTitle}>{heroEvent.title}</Text>
              <Text style={styles.heroMeta}>{heroEvent.dateLabel}</Text>
              <Text style={styles.heroVenue}>{heroEvent.venueName}</Text>
              <View style={styles.heroFooter}>
                <Text style={styles.heroPrice}>
                  {formatInr(getMinTierPrice(heroEvent.tiers))} onwards
                </Text>
                <View style={styles.heroBtn}>
                  <Text style={styles.heroBtnText}>Book tickets</Text>
                </View>
              </View>
            </View>
          </Pressable>
        ) : null}

        {/* 2. Featured Experiences Rail */}
        <Text style={styles.sectionHeading}>Featured Experiences</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={featured.length > 0 ? featured : visibleEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.rail}
          renderItem={({ item }) => <NativeEventCard event={item} width={264} />}
        />

        {/* 3. Artists Rail */}
        <Text style={styles.sectionHeading}>Artists on Tour</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SEED_ARTISTS}
          keyExtractor={(item) => item.slug}
          contentContainerStyle={styles.rail}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                item.upcomingEventSlugs[0]
                  ? router.push(`/events/${item.upcomingEventSlugs[0]}`)
                  : router.push("/events")
              }
              style={styles.artistCard}
            >
              <View style={styles.artistAvatar}>
                <Text style={styles.artistInitial}>{item.name.slice(0, 2).toUpperCase()}</Text>
              </View>
              <Text style={styles.artistName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.artistRole} numberOfLines={1}>
                {item.role}
              </Text>
            </Pressable>
          )}
        />

        {/* 4. Trending Near City */}
        {trending.length > 0 ? (
          <>
            <Text style={styles.sectionHeading}>Trending Near You</Text>
            <View style={styles.stackList}>
              {trending.slice(0, 3).map((evt) => (
                <NativeEventCard key={evt.id} event={evt} />
              ))}
            </View>
          </>
        ) : null}

        {/* 5. Discover by Category */}
        <Text style={styles.sectionHeading}>Discover by Category</Text>
        <View style={styles.catGrid}>
          {DISCOVERY_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.key}
              onPress={() => {
                if (cat.key === "dining") router.push("/dining");
                else if (cat.key === "movies") router.push("/movies");
                else if (cat.key === "activities" || cat.key === "sports") router.push("/play");
                else router.push("/events");
              }}
              style={styles.catTile}
            >
              <View style={[styles.catIcon, { backgroundColor: cat.color }]}>
                <Text style={styles.catIconText}>{cat.label.slice(0, 2).toUpperCase()}</Text>
              </View>
              <Text style={styles.catLabel}>{cat.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* 6. Popular Venues */}
        <Text style={styles.sectionHeading}>Popular Venues</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SEED_VENUES}
          keyExtractor={(v) => v.slug}
          contentContainerStyle={styles.rail}
          renderItem={({ item }) => (
            <View style={styles.venueCard}>
              <Text style={styles.venueName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.venueSub} numberOfLines={1}>
                {item.headline}
              </Text>
              <Text style={styles.venueStatus}>{item.openStatusLabel}</Text>
            </View>
          )}
        />

        {/* 7. Editorial Collections */}
        <Text style={styles.sectionHeading}>Editorial Collections</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SEED_COLLECTIONS}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.rail}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push("/events")} style={styles.collectionCard}>
              <Text style={styles.collectionBadge}>{item.badge}</Text>
              <Text style={styles.collectionTitle}>{item.title}</Text>
              <Text style={styles.collectionSub}>{item.subtitle}</Text>
            </Pressable>
          )}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PULSEPASS_TOKENS.colors.surfaceMuted },
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  heroCard: { borderRadius: 22, overflow: "hidden" },
  heroArt: { padding: 20, gap: 8 },
  heroBadge: { color: "#E9D5FF", fontSize: 11, fontWeight: "800" },
  heroTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  heroMeta: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  heroVenue: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  heroFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8
  },
  heroPrice: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  heroBtn: {
    backgroundColor: "#111319",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  heroBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  sectionHeading: { fontSize: 18, fontWeight: "800", color: PULSEPASS_TOKENS.colors.ink },
  rail: { gap: 12 },
  stackList: { gap: 12 },
  artistCard: {
    width: 116,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.border
  },
  artistAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PULSEPASS_TOKENS.colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  artistInitial: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  artistName: { marginTop: 8, fontSize: 12, fontWeight: "800", color: PULSEPASS_TOKENS.colors.ink },
  artistRole: { fontSize: 10, color: PULSEPASS_TOKENS.colors.inkMuted },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catTile: {
    width: "31%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.border
  },
  catIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  catIconText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  catLabel: { fontSize: 11, fontWeight: "700", color: PULSEPASS_TOKENS.colors.ink },
  venueCard: {
    width: 220,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.border,
    gap: 4
  },
  venueName: { fontSize: 14, fontWeight: "800", color: PULSEPASS_TOKENS.colors.ink },
  venueSub: { fontSize: 11, color: PULSEPASS_TOKENS.colors.inkMuted },
  venueStatus: { fontSize: 11, fontWeight: "700", color: PULSEPASS_TOKENS.colors.available },
  collectionCard: {
    width: 240,
    backgroundColor: "#111319",
    borderRadius: 16,
    padding: 16,
    gap: 6
  },
  collectionBadge: { color: "#C4B5FD", fontSize: 10, fontWeight: "800" },
  collectionTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  collectionSub: { color: "rgba(255,255,255,0.75)", fontSize: 11 }
});
