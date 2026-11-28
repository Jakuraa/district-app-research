import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { formatInr, NIGHTLIFEZ_TOKENS, type BookingRecord } from "@nightlifez/shared";
import { useNativeSession } from "../src/lib/session";

function NativeQrMatrix({ code }: { code: string }) {
  const cells: boolean[] = [];
  for (let i = 0; i < 49; i++) {
    const ch = code.charCodeAt(i % code.length) || 65;
    cells.push(((ch + i * 7) % 3) !== 0);
  }
  return (
    <View style={styles.qrBox}>
      <View style={styles.qrGrid}>
        {cells.map((filled, idx) => (
          <View
            key={idx}
            style={[
              styles.qrCell,
              { backgroundColor: filled ? NIGHTLIFEZ_TOKENS.colors.ink : NIGHTLIFEZ_TOKENS.colors.surfaceMuted }
            ]}
          />
        ))}
      </View>
      <Text style={styles.qrCode}>{code}</Text>
    </View>
  );
}

export default function AndroidBookingsWalletScreen() {
  const router = useRouter();
  const { client, session, localBookings, cancelLocalOrRemoteBooking } = useNativeSession();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [remoteBookings, setRemoteBookings] = useState<BookingRecord[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!session.user) return;
    client
      .getBookings(session.user.email ?? undefined)
      .then((res) => setRemoteBookings(res.bookings ?? []))
      .catch(() => {});
  }, [client, session.user]);

  const merged = [...remoteBookings, ...localBookings.filter((lb) => !remoteBookings.some((rb) => rb.id === lb.id))];
  const visible = merged.filter((b) =>
    tab === "upcoming" ? b.status === "CONFIRMED_DEMO" || b.status === "REFUND_PENDING" : b.status === "CANCELLED" || b.status === "REFUNDED"
  );

  async function requestRefund(bookingId: string) {
    setNotice(null);
    try {
      await client.requestRefund(bookingId, "Requested from Android ticket wallet");
      setNotice("Refund request submitted.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not submit refund offline.");
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Digital Ticket Wallet</Text>
      <Text style={styles.subtitle}>
        Signed QR passes, validation statuses & cancellations (Sandbox Mode).
      </Text>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab("upcoming")}
          style={[styles.tabBtn, tab === "upcoming" && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, tab === "upcoming" && styles.tabTextActive]}>
            Active Passes
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("past")}
          style={[styles.tabBtn, tab === "past" && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, tab === "past" && styles.tabTextActive]}>
            Cancelled / Refunded
          </Text>
        </Pressable>
      </View>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {visible.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            {tab === "upcoming" ? "No active passes yet" : "No cancelled passes"}
          </Text>
          <Text style={styles.emptyBody}>
            Reserve tickets on any event screen to display your QR pass here.
          </Text>
          <Pressable onPress={() => router.push("/events")} style={styles.ctaBtn}>
            <Text style={styles.ctaText}>Browse Events</Text>
          </Pressable>
        </View>
      ) : (
        visible.map((b) => (
          <View key={b.id} style={styles.passCard}>
            <View style={styles.passHeader}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.statusPill}>{b.status}</Text>
                <Text style={styles.passTitle}>{b.eventTitle}</Text>
                <Text style={styles.passMeta}>
                  {b.dateLabel} · {b.venueName}
                </Text>
                <Text style={styles.passRef}>Ref: {b.referenceCode}</Text>
              </View>
              {b.status === "CONFIRMED_DEMO" ? (
                <NativeQrMatrix code={b.tickets?.[0]?.ticketCode ?? b.referenceCode} />
              ) : null}
            </View>

            {b.tickets?.map((t) => (
              <View key={t.id} style={styles.ticketRow}>
                <Text style={styles.ticketCode}>{t.ticketCode}</Text>
                <Text style={styles.ticketMeta}>
                  {t.tierName} · {t.status}
                </Text>
              </View>
            ))}

            <View style={styles.passFooter}>
              <Text style={styles.totalText}>{formatInr(b.totalInr)}</Text>
              {b.status === "CONFIRMED_DEMO" ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => void requestRefund(b.id)}
                    style={styles.refundBtn}
                  >
                    <Text style={styles.refundText}>Refund</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void cancelLocalOrRemoteBooking(b.id)}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NIGHTLIFEZ_TOKENS.colors.surfaceMuted },
  content: { padding: 16, gap: 14, paddingBottom: 36 },
  title: { fontSize: 22, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  subtitle: { fontSize: 12, color: NIGHTLIFEZ_TOKENS.colors.inkMuted },
  notice: { fontSize: 12, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.primary },
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
  ctaText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  passCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    gap: 10
  },
  passHeader: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.availableBg,
    color: NIGHTLIFEZ_TOKENS.colors.available,
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999
  },
  passTitle: { fontSize: 16, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  passMeta: { fontSize: 12, color: NIGHTLIFEZ_TOKENS.colors.inkMuted },
  passRef: { fontSize: 11, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.ink },
  qrBox: {
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border
  },
  qrGrid: { width: 70, flexDirection: "row", flexWrap: "wrap", gap: 2 },
  qrCell: { width: 8, height: 8, borderRadius: 1 },
  qrCode: { marginTop: 6, fontSize: 9, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.inkMuted },
  ticketRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.surfaceMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  ticketCode: { fontSize: 11, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  ticketMeta: { fontSize: 11, color: NIGHTLIFEZ_TOKENS.colors.inkMuted },
  passFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: NIGHTLIFEZ_TOKENS.colors.border,
    paddingTop: 10
  },
  totalText: { fontSize: 16, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  refundBtn: {
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  refundText: { fontSize: 11, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.primary },
  cancelBtn: {
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.soldOut,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  cancelText: { fontSize: 11, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.soldOut }
});
