import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { NIGHTLIFEZ_TOKENS } from "@nightlifez/shared";

export default function AndroidBookingsWalletScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Digital Ticket Wallet</Text>
      <Text style={styles.subtitle}>
        Demo passes & booking history — no real charges or live gate barcodes.
      </Text>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab("upcoming")}
          style={[styles.tabBtn, tab === "upcoming" && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, tab === "upcoming" && styles.tabTextActive]}>
            Upcoming Passes
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("past")}
          style={[styles.tabBtn, tab === "past" && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, tab === "past" && styles.tabTextActive]}>
            Past / Cancelled
          </Text>
        </Pressable>
      </View>

      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>
          {tab === "upcoming" ? "No active demo passes yet" : "No cancelled passes"}
        </Text>
        <Text style={styles.emptyBody}>
          Reserve tickets on any event screen to preview your QR demo pass here.
        </Text>
        <Pressable onPress={() => router.push("/events")} style={styles.ctaBtn}>
          <Text style={styles.ctaText}>Browse Events</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NIGHTLIFEZ_TOKENS.colors.surfaceMuted },
  content: { padding: 16, gap: 14 },
  title: { fontSize: 22, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  subtitle: { fontSize: 12, color: NIGHTLIFEZ_TOKENS.colors.inkMuted },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border
  },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 999 },
  tabBtnActive: { backgroundColor: NIGHTLIFEZ_TOKENS.colors.primary },
  tabText: { fontSize: 12, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.inkMuted },
  tabTextActive: { color: "#FFFFFF" },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  emptyBody: { fontSize: 12, color: NIGHTLIFEZ_TOKENS.colors.inkMuted, textAlign: "center" },
  ctaBtn: {
    marginTop: 8,
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.primary,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  ctaText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" }
});
