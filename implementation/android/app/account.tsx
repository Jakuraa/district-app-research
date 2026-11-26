import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import {
  COUNTRY_DIAL_CODES,
  DEFAULT_COUNTRY_CODE,
  DISCOVERY_CATEGORIES,
  hasPermission,
  NIGHTLIFEZ_TOKENS,
  SEED_CITIES,
  type OtpRequestResult,
  type QaIdentitySpec
} from "@nightlifez/shared";
import { useNativeSession } from "../src/lib/session";

type AuthStep = "phone" | "otp" | "onboarding";

export default function AndroidAccountScreen() {
  const router = useRouter();
  const {
    session,
    apiBaseUrl,
    setApiBaseUrl,
    savedEventSlugs,
    notifications,
    requestOtp,
    resendOtp,
    verifyOtp,
    updateProfile,
    signOut
  } = useNativeSession();

  const [authStep, setAuthStep] = useState<AuthStep>("phone");
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phoneInput, setPhoneInput] = useState("");
  const [challenge, setChallenge] = useState<OtpRequestResult | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState(session.user?.fullName ?? "");
  const [email, setEmail] = useState(session.user?.email ?? "");
  const [citySlug, setCitySlug] = useState(session.user?.preferredCitySlug ?? "bengaluru");
  const [interests, setInterests] = useState<string[]>(
    session.user?.favoriteCategories ?? ["concerts", "dining"]
  );
  const [serverUrlInput, setServerUrlInput] = useState(apiBaseUrl);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [qaDirectory, setQaDirectory] = useState<QaIdentitySpec[]>([]);

  const otpInputRef = useRef<TextInput>(null);

  const canAccessStaff =
    session.user !== null && hasPermission(session.assignments, "staff:events:read");

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/auth/qa-directory`);
        if (res.ok) {
          const json = (await res.json()) as { identities?: QaIdentitySpec[] };
          setQaDirectory(json.identities ?? []);
        }
      } catch {
        // Ignore if offline or production
      }
    })();
  }, [apiBaseUrl]);

  function toggleInterest(key: string) {
    setInterests((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleRequestOtp(overridePhone?: string, overrideCountry?: string) {
    setErrorMsg(null);
    setStatusMsg(null);
    setSubmitting(true);
    try {
      const res = await requestOtp((overridePhone ?? phoneInput).trim(), overrideCountry ?? countryCode);
      setChallenge(res);
      setOtpCode("");
      setResendCountdown(res.resendAfterSeconds ?? 30);
      setAuthStep("otp");
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not send OTP");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendOtp() {
    if (!challenge || resendCountdown > 0) return;
    setErrorMsg(null);
    setStatusMsg(null);
    setSubmitting(true);
    try {
      const res = await resendOtp(challenge.challengeId);
      setChallenge(res);
      setOtpCode("");
      setResendCountdown(res.resendAfterSeconds ?? 30);
      setStatusMsg("A new 6-digit OTP has been sent.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not resend OTP");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp() {
    if (!challenge) return;
    setErrorMsg(null);
    setStatusMsg(null);
    setSubmitting(true);
    try {
      const res = await verifyOtp(challenge.challengeId, otpCode.trim());
      if (res.needsOnboarding) {
        setFullName("");
        setEmail("");
        setAuthStep("onboarding");
        setStatusMsg("Phone verified! Complete your profile.");
        return;
      }
      setChallenge(null);
      setOtpCode("");
      setAuthStep("phone");
      setStatusMsg(res.isNewUser ? "Welcome to NIGHTLIFEZ!" : "Signed in with verified phone.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "OTP verification failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompleteOnboarding() {
    setErrorMsg(null);
    setStatusMsg(null);
    setSubmitting(true);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        email: email.trim() ? email.trim() : null,
        preferredCitySlug: citySlug
      });
      setChallenge(null);
      setOtpCode("");
      setAuthStep("phone");
      setStatusMsg("Profile completed.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {authStep === "onboarding" && session.user ? (
        <View style={styles.card}>
          <Text style={styles.badge}>PHONE VERIFIED · {session.user.phone}</Text>
          <Text style={styles.title}>Complete your profile</Text>
          <Text style={styles.meta}>Add your name for passes and check-in. Email is optional.</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Asha Rao"
            style={styles.input}
            returnKeyType="next"
          />

          <Text style={styles.label}>Email (Optional)</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="asha@example.com"
            style={styles.input}
            returnKeyType="done"
          />

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          {statusMsg ? <Text style={styles.savedNote}>{statusMsg}</Text> : null}

          <Pressable
            disabled={submitting || fullName.trim().length < 2}
            onPress={() => void handleCompleteOnboarding()}
            style={styles.saveBtn}
          >
            <Text style={styles.saveBtnText}>Finish &amp; Continue</Text>
          </Pressable>
        </View>
      ) : !session.user ? (
        <>
          <View style={styles.card}>
            <Text style={styles.badge}>NIGHTLIFEZ UNIFIED LOGIN</Text>
            <Text style={styles.title}>
              {authStep === "phone" ? "Log in or sign up" : "Verify your phone"}
            </Text>
            <Text style={styles.meta}>
              {authStep === "phone"
                ? "Phone-first sign in for attendees, organisers, venue managers, and gate staff."
                : `Enter the 6-digit code sent to ${challenge?.maskedPhone ?? "your phone"}.`}
            </Text>

            {authStep === "phone" ? (
              <>
                <Text style={styles.label}>Country Code</Text>
                <View style={styles.chips}>
                  {COUNTRY_DIAL_CODES.slice(0, 4).map((c) => (
                    <Pressable
                      key={c.code}
                      onPress={() => setCountryCode(c.code)}
                      style={[styles.chip, countryCode === c.code && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, countryCode === c.code && styles.chipTextActive]}>
                        {c.flag} {c.code}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>Mobile Number</Text>
                <TextInput
                  value={phoneInput}
                  onChangeText={setPhoneInput}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  placeholder="98765 00001"
                  style={styles.input}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleRequestOtp()}
                />

                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                <Pressable
                  disabled={submitting || phoneInput.trim().length < 6}
                  onPress={() => void handleRequestOtp()}
                  style={[styles.saveBtn, (submitting || phoneInput.trim().length < 6) && styles.btnDisabled]}
                >
                  <Text style={styles.saveBtnText}>{submitting ? "Sending OTP..." : "Continue"}</Text>
                </Pressable>
                <Text style={styles.legalNote}>
                  By continuing, you agree to NIGHTLIFEZ Terms of Service &amp; Privacy Policy.
                </Text>
              </>
            ) : (
              <>
                <View style={styles.phoneHeaderRow}>
                  <Text style={styles.meta}>{challenge?.maskedPhone}</Text>
                  <Pressable
                    onPress={() => {
                      setAuthStep("phone");
                      setChallenge(null);
                      setOtpCode("");
                      setErrorMsg(null);
                      setStatusMsg(null);
                    }}
                  >
                    <Text style={styles.linkText}>Change phone number</Text>
                  </Pressable>
                </View>

                {challenge?.previewSyntheticOtp ? (
                  <View style={styles.previewOtpBox}>
                    <Text style={styles.previewOtpText}>
                      Preview QA OTP: {challenge.previewSyntheticOtp}
                    </Text>
                    <Pressable onPress={() => setOtpCode(challenge.previewSyntheticOtp ?? "")}>
                      <Text style={styles.linkText}>Fill</Text>
                    </Pressable>
                  </View>
                ) : null}

                <Text style={styles.label}>6-Digit OTP</Text>
                <TextInput
                  ref={otpInputRef}
                  value={otpCode}
                  onChangeText={(txt) => setOtpCode(txt.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  maxLength={6}
                  placeholder="••••••"
                  style={[styles.input, styles.otpInput]}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (otpCode.length === 6) void handleVerifyOtp();
                  }}
                />

                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
                {statusMsg ? <Text style={styles.savedNote}>{statusMsg}</Text> : null}

                <Pressable
                  disabled={submitting || otpCode.length !== 6}
                  onPress={() => void handleVerifyOtp()}
                  style={[styles.saveBtn, (submitting || otpCode.length !== 6) && styles.btnDisabled]}
                >
                  <Text style={styles.saveBtnText}>{submitting ? "Verifying..." : "Verify & Continue"}</Text>
                </Pressable>

                <View style={styles.phoneHeaderRow}>
                  <Text style={styles.meta}>Expires in 5 minutes</Text>
                  <Pressable disabled={resendCountdown > 0 || submitting} onPress={() => void handleResendOtp()}>
                    <Text style={[styles.linkText, resendCountdown > 0 && { color: NIGHTLIFEZ_TOKENS.colors.inkMuted }]}>
                      {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend OTP"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>

          {qaDirectory.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.badge}>NON-PRODUCTION QA DIRECTORY</Text>
              <Text style={styles.sectionTitle}>Tap an identity to test</Text>
              {qaDirectory.map((qa) => (
                <Pressable
                  key={qa.id}
                  onPress={() => {
                    setCountryCode("+91");
                    const digits = qa.phone.replace(/^\+91/, "");
                    setPhoneInput(digits);
                    void handleRequestOtp(digits, "+91");
                  }}
                  style={styles.qaRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifTitle}>{qa.fullName}</Text>
                    <Text style={styles.meta}>
                      {qa.phone} · {qa.roles.map((r) => r.role).join(", ")}
                    </Text>
                  </View>
                  <Text style={styles.linkText}>Send OTP →</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.badge}>{session.roles.join(" · ").toUpperCase()}</Text>
          <Text style={styles.title}>{session.user.fullName}</Text>
          <Text style={styles.meta}>
            {session.user.phone ?? "No phone"}
            {session.user.email ? ` · ${session.user.email}` : ""}
          </Text>

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

          <Pressable
            onPress={() => {
              setAuthStep("phone");
              setChallenge(null);
              setOtpCode("");
              void signOut();
            }}
            style={styles.signOutBtn}
          >
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
  label: { fontSize: 12, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.inkMuted, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: NIGHTLIFEZ_TOKENS.colors.ink
  },
  otpInput: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 8
  },
  phoneHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  linkText: { fontSize: 12, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.primary },
  previewOtpBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.primarySoft,
    padding: 10,
    borderRadius: 12
  },
  previewOtpText: { fontSize: 12, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.primary },
  legalNote: { fontSize: 11, color: NIGHTLIFEZ_TOKENS.colors.inkMuted, textAlign: "center" },
  qaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: NIGHTLIFEZ_TOKENS.colors.border
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.surfaceMuted
  },
  chipActive: {
    borderColor: NIGHTLIFEZ_TOKENS.colors.primary,
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.primarySoft
  },
  chipText: { fontSize: 12, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.inkMuted },
  chipTextActive: { color: NIGHTLIFEZ_TOKENS.colors.primary },
  saveBtn: {
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4
  },
  btnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: NIGHTLIFEZ_TOKENS.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center"
  },
  secondaryBtnText: { fontSize: 12, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.ink },
  primaryPillBtn: {
    backgroundColor: NIGHTLIFEZ_TOKENS.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryPillText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  signOutBtn: {
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center"
  },
  signOutText: { fontSize: 12, fontWeight: "700", color: "#DC2626" },
  savedNote: { fontSize: 12, fontWeight: "700", color: "#16A34A" },
  errorText: { fontSize: 12, fontWeight: "700", color: "#DC2626" },
  savedRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: NIGHTLIFEZ_TOKENS.colors.border
  },
  savedLink: { fontSize: 13, fontWeight: "700", color: NIGHTLIFEZ_TOKENS.colors.primary },
  notifBox: { backgroundColor: NIGHTLIFEZ_TOKENS.colors.surfaceMuted, borderRadius: 12, padding: 10, gap: 3 },
  notifTitle: { fontSize: 13, fontWeight: "800", color: NIGHTLIFEZ_TOKENS.colors.ink }
});
