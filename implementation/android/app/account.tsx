import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { DISCOVERY_CATEGORIES, NIGHTLIFEZ_TOKENS, SEED_CITIES } from "@nightlifez/shared";

export default function AndroidAccountScreen() {
  const [name, setName] = useState("Asha Rao");
  const [email, setEmail] = useState("asha@example.com");
  const [citySlug, setCitySlug] = useState("bengaluru");
  const [interests, setInterests] = useState<string[]>(["concerts", "dining"]);
  const [saved, setSaved] = useState(false);

  function toggleInterest(key: string) {
    setInterests((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.badge}>LOCAL DEMO PROFILE · NO EXTERNAL AUTH</Text>
        <Text style={styles.title}>Account & Preferences</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} />

        <Text style={styles.label}>Email</Text>
        <TextInput value={email} onChangeText={setEmail} style={styles.input} />

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

        <Text style={styles.label}>Interests</Text>
        <View style={styles.chips}>
          {DISCOVERY_CATEGORIES.map((cat) => {
            const active = interests.includes(cat.key);
            return (
              <Pressable
                key={cat.key}
                onPress={() => toggleInterest(cat.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={() => setSaved(true)} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Save Demo Preferences</Text>
        </Pressable>
        {saved ? <Text style={styles.savedNote}>Preferences updated in demo session.</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NIGHTLIFEZ_TOKENS.colors.surfaceMuted },
  content: { padding: 16, paddingBottom: 32 },
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
    marginTop: 8,
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center"
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  savedNote: { fontSize: 12, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.available, textAlign: "center" }
});
