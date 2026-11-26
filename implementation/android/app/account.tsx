import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { DISCOVERY_CATEGORIES, hasPermission, NIGHTLIFEZ_TOKENS, SEED_CITIES } from "@nightlifez/shared";
import { useNativeSession } from "../src/lib/session";

export default function AndroidAccountScreen() {
  const router = useRouter();
  const {
    session,
    apiBaseUrl,
    setApiBaseUrl,
    savedEventSlugs,
    notifications,
    signIn,
    signUp,
    signOut
  } = useNativeSession();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [citySlug, setCitySlug] = useState(session.user?.preferredCitySlug ?? "bengaluru");
  const [interests, setInterests] = useState<string[]>(
    session.user?.favoriteCategories ?? ["concerts", "dining"]
  );
  const [serverUrlInput, setServerUrlInput] = useState(apiBaseUrl);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canAccessStaff =
    session.user !== null && hasPermission(session.assignments, "staff:events:read");

  function toggleInterest(key: string) {
    setInterests((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleAuth() {
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
        setStatusMsg("Signed in successfully.");
      } else {
        await signUp(email.trim(), password, fullName.trim());
        setStatusMsg("Account created and signed in.");
      }
      setPassword("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Authentication failed");
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!session.user ? (
        <View style={styles.card}>
          <Text style={styles.badge}>NIGHTLIFEZ IDENTITY · SANDBOX SESSION</Text>
          <Text style={styles.title}>{mode === "signin" ? "Sign In" : "Create Account"}</Text>

          <View style={styles.tabRow}>
            <Pressable
              onPress={() => setMode("signin")}
              style={[styles.tabPill, mode === "signin" && styles.tabPillActive]}
            >
              <Text style={[styles.tabText, mode === "signin" && { color: "#FFFFFF" }]}>Sign In</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("signup")}
              style={[styles.tabPill, mode === "signup" && styles.tabPillActive]}
            >
              <Text style={[styles.tabText, mode === "signup" && { color: "#FFFFFF" }]}>Sign Up</Text>
            </Pressable>
          </View>

          {mode === "signup" ? (
            <>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Asha Rao"
                style={styles.input}
              />
            </>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="asha@nightlifez.test"
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Minimum 8 characters"
            style={styles.input}
          />

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          {statusMsg ? <Text style={styles.savedNote}>{statusMsg}</Text> : null}

          <Pressable onPress={() => void handleAuth()} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>
              {mode === "signin" ? "Sign In to NIGHTLIFEZ" : "Create NIGHTLIFEZ Account"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.badge}>{session.roles.join(" · ").toUpperCase()}</Text>
          <Text style={styles.title}>{session.user.fullName}</Text>
          <Text style={styles.meta}>{session.user.email}</Text>

          <View style={styles.actionsRow}>
            <Pressable onPress={() => router.push("/bookings")} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Ticket Wallet</Text>
            </Pressable>
            {canAccessStaff ? (
              <Pressable onPress={() => router.push("/staff")} style={styles.primaryPillBtn}>
                <Text style={styles.primaryPillText}>Open Staff QR Scanner</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable onPress={() => void signOut()} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.label}>Preferred City</Text>
        <View style={styles.chips}>
          {SEED_CITIES.map((c) => (
            <Pressable
              key={c.slug}
              onPress={() => setCitySlug(c.slug)}
              style={[styles.chip, citySlug === c.slug && styles.chipActive]}
            >
              <Text style={[styles.chipText, citySlug === c.slug && styles.chipTextActive]}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Discovery Interests</Text>
        <View style={styles.chips}>
          {DISCOVERY_CATEGORIES.map((cat) => {
            const active = interests.includes(cat.key);
            return (
              <Pressable
                key={cat.key}
                onPress={() => toggleInterest(cat.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Saved Events ({savedEventSlugs.length})</Text>
        {savedEventSlugs.length === 0 ? (
          <Text style={styles.meta}>Tap Save Event on any event screen to bookmark it here.</Text>
        ) : (
          savedEventSlugs.map((slug) => (
            <Pressable key={slug} onPress={() => router.push(`/events/${slug}`)} style={styles.savedRow}>
              <Text style={styles.savedLink}>{slug} →</Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notifications ({notifications.length})</Text>
        {notifications.slice(0, 4).map((n) => (
          <View key={n.id} style={styles.notifBox}>
            <Text style={styles.notifTitle}>{n.title}</Text>
            <Text style={styles.meta}>{n.body}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>API Endpoint (Preview / Sandbox)</Text>
        <TextInput
          value={serverUrlInput}
          onChangeText={setServerUrlInput}
          autoCapitalize="none"
          style={styles.input}
        />
        <Pressable
          onPress={() => {
            void setApiBaseUrl(serverUrlInput);
            setStatusMsg("API endpoint updated.");
          }}
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryBtnText}>Save Endpoint</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NIGHTLIFEZ_TOKENS.colors.surfaceMuted },
  content: { padding: 16, gap: 14, paddingBottom: 36 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border
  },
  badge: { fontSize: 10, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.primary },
  title: { fontSize: 20, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  meta: { fontSize: 12, color: NIGHTLIFEZ_TOKENS.colors.inkMuted },
  tabRow: { flexDirection: "row", gap: 8 },
  tabPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border
  },
  tabPillActive: {
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.primary,
    borderColor: NIGHTLIFEZ_TOKENS.colors.primary
  },
  tabText: { fontSize: 12, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.inkMuted },
  label: { fontSize: 12, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.inkMuted, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  chipActive: {
    borderColor: NIGHTLIFEZ_TOKENS.colors.primary,
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.primarySoft
  },
  chipText: { fontSize: 11, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.inkMuted },
  chipTextActive: { color: NIGHTLIFEZ_TOKENS.colors.primary },
  saveBtn: {
    marginTop: 6,
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center"
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center"
  },
  secondaryBtnText: { fontSize: 12, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.ink },
  primaryPillBtn: {
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.ink,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryPillText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  signOutBtn: { paddingVertical: 6 },
  signOutText: { fontSize: 12, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.soldOut },
  savedRow: { paddingVertical: 6 },
  savedLink: { fontSize: 13, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.primary },
  notifBox: {
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.surfaceMuted,
    borderRadius: 10,
    padding: 10,
    gap: 2
  },
  notifTitle: { fontSize: 12, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink },
  errorText: { fontSize: 12, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.soldOut },
  savedNote: { fontSize: 12, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.available }
});
