import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { NIGHTLIFEZ_TOKENS, type PulseEvent, type TicketScanLog } from "@nightlifez/shared";
import { useNativeSession } from "../src/lib/session";

interface OfflineScanItem {
  clientScanId: string;
  ticketCodeOrToken: string;
  scannedAt: string;
}

const OFFLINE_QUEUE_KEY = "nlz_native_offline_scans_v1";

export default function NativeStaffScannerScreen() {
  const router = useRouter();
  const { client, session } = useNativeSession();
  const [permission, requestPermission] = useCameraPermissions();

  const [events, setEvents] = useState<PulseEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [recentScans, setRecentScans] = useState<TicketScanLog[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<OfflineScanItem[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [lastOutcome, setLastOutcome] = useState<{
    valid: boolean;
    result: string;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(OFFLINE_QUEUE_KEY)
      .then((raw) => {
        if (raw) setOfflineQueue(JSON.parse(raw) as OfflineScanItem[]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!session.user) return;
    client
      .getStaffEvents()
      .then((res) => {
        setEvents(res.events ?? []);
        setRecentScans(res.recentScans ?? []);
        if (res.events?.length > 0 && !selectedEventId) {
          setSelectedEventId(res.events[0].id);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load assigned events");
      });
  }, [client, session.user]);

  async function saveQueue(next: OfflineScanItem[]) {
    setOfflineQueue(next);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(next));
  }

  async function processCode(code: string) {
    if (!selectedEventId || !code.trim()) return;
    const clean = code.trim();
    if (offlineMode) {
      const item: OfflineScanItem = {
        clientScanId: `andr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ticketCodeOrToken: clean,
        scannedAt: new Date().toISOString()
      };
      await saveQueue([item, ...offlineQueue]);
      setManualCode("");
      setLastOutcome({
        valid: true,
        result: "QUEUED_OFFLINE",
        message: "Queued locally on device. Sync when gate connectivity returns."
      });
      return;
    }

    try {
      const res = await client.verifyTicketScan({
        eventId: selectedEventId,
        ticketCodeOrToken: clean,
        deviceId: "android-native-gate"
      });
      setLastOutcome({ valid: res.valid, result: res.result, message: res.message });
      setManualCode("");
      const refreshed = await client.getStaffEvents();
      setRecentScans(refreshed.recentScans ?? []);
    } catch (err) {
      setLastOutcome({
        valid: false,
        result: "SCAN_ERROR",
        message: err instanceof Error ? err.message : "Verification failed"
      });
    }
  }

  async function syncQueue() {
    if (!selectedEventId || offlineQueue.length === 0) return;
    try {
      const res = await client.syncOfflineScans({
        eventId: selectedEventId,
        deviceId: "android-native-gate",
        scans: offlineQueue
      });
      const conflicts = res.results.filter((r) => !r.valid);
      await saveQueue([]);
      setLastOutcome({
        valid: conflicts.length === 0,
        result: conflicts.length > 0 ? "SYNC_CONFLICTS" : "SYNC_COMPLETE",
        message: `Synced ${res.results.length} scan(s). ${conflicts.length} conflict/rejected item(s).`
      });
    } catch (err) {
      setLastOutcome({
        valid: false,
        result: "SYNC_FAILED",
        message: err instanceof Error ? err.message : "Network unreachable"
      });
    }
  }

  if (!session.user) {
    return (
      <View style={styles.centerCard}>
        <Text style={styles.title}>Staff Sign-In Required</Text>
        <Text style={styles.meta}>Sign in with an assigned gate staff or organiser account.</Text>
        <Pressable onPress={() => router.push("/account")} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Go to Account Sign-In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Staff & Box-Office Scanner</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Text style={styles.label}>Assigned Events ({events.length})</Text>
      <View style={styles.chips}>
        {events.map((evt) => (
          <Pressable
            key={evt.id}
            onPress={() => setSelectedEventId(evt.id)}
            style={[styles.chip, selectedEventId === evt.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, selectedEventId === evt.id && { color: NIGHTLIFEZ_TOKENS.colors.primary }]}>
              {evt.title}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Offline Scan Queue Mode</Text>
          <Switch value={offlineMode} onValueChange={setOfflineMode} />
        </View>

        {!permission?.granted ? (
          <Pressable onPress={() => void requestPermission()} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Grant Camera Permission for QR Scanner</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setCameraActive((v) => !v)}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>
              {cameraActive ? "Close Camera Scanner" : "Open Native QR Camera"}
            </Text>
          </Pressable>
        )}

        {cameraActive && permission?.granted ? (
          <View style={styles.cameraWrap}>
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={({ data }) => {
                setCameraActive(false);
                void processCode(data);
              }}
            />
          </View>
        ) : null}

        <Text style={styles.label}>Manual Ticket Code / QR Token</Text>
        <TextInput
          value={manualCode}
          onChangeText={setManualCode}
          placeholder="NLZ-TKT-XXXXXX"
          style={styles.input}
        />
        <Pressable onPress={() => void processCode(manualCode)} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>
            {offlineMode ? "Queue Offline Scan" : "Verify & Check In"}
          </Text>
        </Pressable>

        {lastOutcome ? (
          <View
            style={[
              styles.resultBanner,
              {
                backgroundColor: lastOutcome.valid
                  ? NIGHTLIFEZ_TOKENS.colors.availableBg
                  : NIGHTLIFEZ_TOKENS.colors.soldOutBg
              }
            ]}
          >
            <Text style={styles.resultTitle}>{lastOutcome.result}</Text>
            <Text style={styles.meta}>{lastOutcome.message}</Text>
          </View>
        ) : null}
      </View>

      {offlineQueue.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.label}>Pending Offline Scans ({offlineQueue.length})</Text>
          <Pressable onPress={() => void syncQueue()} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Sync Offline Scans Now</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>Recent Check-In History ({recentScans.length})</Text>
        {recentScans.slice(0, 8).map((s) => (
          <View key={s.id} style={styles.scanRow}>
            <Text style={styles.scanCode}>{s.ticketCode}</Text>
            <Text style={styles.scanStatus}>{s.result}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NIGHTLIFEZ_TOKENS.colors.surfaceMuted },
  content: { padding: 16, gap: 12, paddingBottom: 36 },
  centerCard: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  label: { fontSize: 12, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  meta: { fontSize: 12, color: NIGHTLIFEZ_TOKENS.colors.inkMuted },
  errorText: { fontSize: 12, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.soldOut },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  chipActive: {
    borderColor: NIGHTLIFEZ_TOKENS.colors.primary,
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.primarySoft
  },
  chipText: { fontSize: 11, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.ink },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    gap: 10
  },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cameraWrap: { height: 220, borderRadius: 12, overflow: "hidden" },
  camera: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14
  },
  primaryBtn: {
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center"
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center"
  },
  secondaryBtnText: { fontSize: 12, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.ink },
  resultBanner: { borderRadius: 10, padding: 12, gap: 4 },
  resultTitle: { fontSize: 13, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  scanRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: NIGHTLIFEZ_TOKENS.colors.border
  },
  scanCode: { fontSize: 12, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.ink },
  scanStatus: { fontSize: 11, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.primary }
});
