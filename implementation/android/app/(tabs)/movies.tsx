import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatInr, NIGHTLIFEZ_TOKENS, SEED_MOVIES } from "@nightlifez/shared";
import { NativeTopBar } from "../../src/components/NativeDiscovery";

export default function MoviesScreen() {
  const [citySlug, setCitySlug] = useState("all");
  const [language, setLanguage] = useState("all");

  const items = SEED_MOVIES.filter((m) => {
    if (language !== "all" && m.language !== language) return false;
    if (citySlug !== "all" && !m.showtimes.some((s) => s.citySlug === citySlug)) return false;
    return true;
  });

  return (
    <View style={styles.root}>
      <NativeTopBar selectedCity={citySlug} onSelectCity={setCitySlug} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.demoTag}>
          <Text style={styles.demoTagText}>Demo Cinema Showtime Schedule</Text>
        </View>
        <Text style={styles.title}>Movies & Showtimes</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {["all", "Hindi", "Tamil", "English", "Malayalam"].map((lang) => (
            <Pressable
              key={lang}
              onPress={() => setLanguage(lang)}
              style={[styles.chip, language === lang && styles.chipActive]}
            >
              <Text style={[styles.chipText, language === lang && styles.chipTextActive]}>
                {lang === "all" ? "All Languages" : lang}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {items.map((m) => (
          <View key={m.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.movieTitle}>{m.title}</Text>
                <Text style={styles.meta}>
                  {m.language} · {m.genres.join(", ")} · {m.durationLabel} · {m.certificate}
                </Text>
              </View>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>★ {m.rating.toFixed(1)}</Text>
              </View>
            </View>
            <Text style={styles.synopsis}>{m.synopsis}</Text>
            <View style={styles.showtimeList}>
              {m.showtimes.map((sh) => (
                <View key={sh.id} style={styles.showtimeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cinema}>{sh.cinemaName}</Text>
                    <Text style={styles.showMeta}>
                      {sh.dateLabel} · {sh.format}
                    </Text>
                  </View>
                  <View style={styles.timePill}>
                    <Text style={styles.timeText}>{sh.timeLabel}</Text>
                    <Text style={styles.priceText}>{formatInr(sh.priceInr)}</Text>
                  </View>
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
    gap: 8
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  movieTitle: { fontSize: 17, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  meta: { fontSize: 12, color: NIGHTLIFEZ_TOKENS.colors.inkMuted, marginTop: 2 },
  ratingBadge: {
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.available,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  ratingText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  synopsis: { fontSize: 12, color: NIGHTLIFEZ_TOKENS.colors.inkSecondary, lineHeight: 17 },
  showtimeList: { gap: 8, marginTop: 4 },
  showtimeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.surfaceMuted,
    borderRadius: 12,
    padding: 10,
    gap: 10
  },
  cinema: { fontSize: 12, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.ink },
  showMeta: { fontSize: 11, color: NIGHTLIFEZ_TOKENS.colors.inkMuted },
  timePill: {
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.primary,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center"
  },
  timeText: { fontSize: 12, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.primary },
  priceText: { fontSize: 10, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.ink }
});
