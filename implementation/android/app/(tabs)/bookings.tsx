import { StyleSheet, Text, View } from "react-native";
import { PULSEPASS_TOKENS } from "@pulsepass/shared";

export default function BookingsTab() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.badge}>DEMO TICKET WALLET</Text>
        <Text style={styles.title}>No Active Passes Loaded</Text>
        <Text style={styles.body}>
          Reserve any event pass in demo mode to sync bookings from the PulsePass API backend. No
          real payment or live ticket barcode is issued.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PULSEPASS_TOKENS.colors.surfaceMuted, padding: 16 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: PULSEPASS_TOKENS.colors.border,
    gap: 8
  },
  badge: { fontSize: 11, fontWeight: "700", color: PULSEPASS_TOKENS.colors.primary },
  title: { fontSize: 18, fontWeight: "800", color: PULSEPASS_TOKENS.colors.ink },
  body: { fontSize: 13, color: PULSEPASS_TOKENS.colors.inkMuted, lineHeight: 19 }
});
