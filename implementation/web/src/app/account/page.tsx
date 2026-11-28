"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  COUNTRY_DIAL_CODES,
  DEFAULT_COUNTRY_CODE,
  DISCOVERY_CATEGORIES,
  SEED_CITIES,
  type AuthSessionView,
  type OtpRequestResult,
  type OtpVerifyResult,
  type PlatformNotification,
  type QaIdentitySpec,
  type SavedItem,
  type SupportCase
} from "@nightlifez/shared";
import { AppHeader } from "@/components/AppHeader";

type AuthStep = "phone" | "otp" | "onboarding";

export default function AccountPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSessionView>({
    user: null,
    assignments: [],
    roles: [],
    workspaces: []
  });
  const [loading, setLoading] = useState(true);

  // Phone-first OTP state
  const [authStep, setAuthStep] = useState<AuthStep>("phone");
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phoneInput, setPhoneInput] = useState("");
  const [challenge, setChallenge] = useState<OtpRequestResult | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [submittingOtp, setSubmittingOtp] = useState(false);

  // Onboarding & profile state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [citySlug, setCitySlug] = useState("bengaluru");
  const [favoriteCategories, setFavoriteCategories] = useState<string[]>(["concerts", "dining"]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Non-prod QA directory
  const [qaDirectory, setQaDirectory] = useState<QaIdentitySpec[]>([]);

  // Authenticated account data
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [caseSubject, setCaseSubject] = useState("");
  const [caseMsg, setCaseMsg] = useState("");

  async function refreshAccount() {
    setLoading(true);
    try {
      const [meRes, notifRes, qaRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/notifications"),
        fetch("/api/auth/qa-directory").catch(() => null)
      ]);
      const meData = (await meRes.json()) as AuthSessionView;
      const notifData = await notifRes.json();
      setSession(meData);
      setNotifications(notifData.notifications ?? []);

      if (qaRes && qaRes.ok) {
        const qaJson = (await qaRes.json()) as { identities?: QaIdentitySpec[] };
        setQaDirectory(qaJson.identities ?? []);
      }

      if (meData.user) {
        setFullName(meData.user.fullName);
        setEmail(meData.user.email ?? "");
        setCitySlug(meData.user.preferredCitySlug);
        setFavoriteCategories(meData.user.favoriteCategories);
        const [savedRes, supRes] = await Promise.all([fetch("/api/saved"), fetch("/api/support")]);
        const savedJson = await savedRes.json();
        const supJson = await supRes.json();
        setSavedItems(savedJson.items ?? []);
        setCases(supJson.cases ?? []);
      } else {
        setSavedItems([]);
        setCases([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAccount();
  }, []);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  async function handleRequestOtp(e?: React.FormEvent, overridePhone?: string, overrideCountry?: string) {
    if (e) e.preventDefault();
    setAuthError(null);
    setNotice(null);
    setSubmittingOtp(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: overridePhone ?? phoneInput,
          countryCode: overrideCountry ?? countryCode,
          purpose: "LOGIN"
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setAuthError(json?.error ?? "Could not send verification code.");
        return;
      }
      const data = json as OtpRequestResult;
      setChallenge(data);
      setOtpCode("");
      setResendCountdown(data.resendAfterSeconds ?? 30);
      setAuthStep("otp");
    } finally {
      setSubmittingOtp(false);
    }
  }

  async function handleResendOtp() {
    if (!challenge || resendCountdown > 0) return;
    setAuthError(null);
    setSubmittingOtp(true);
    try {
      const res = await fetch("/api/auth/otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.challengeId })
      });
      const json = await res.json();
      if (!res.ok) {
        setAuthError(json?.error ?? "Could not resend OTP.");
        if (typeof json?.retryAfterSeconds === "number") {
          setResendCountdown(json.retryAfterSeconds);
        }
        return;
      }
      const data = json as OtpRequestResult;
      setChallenge(data);
      setOtpCode("");
      setResendCountdown(data.resendAfterSeconds ?? 30);
      setNotice("A new 6-digit verification code has been sent.");
    } finally {
      setSubmittingOtp(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    setAuthError(null);
    setNotice(null);
    setSubmittingOtp(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.challengeId,
          code: otpCode.trim()
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setAuthError(json?.error ?? "Invalid verification code.");
        return;
      }
      const verified = json as OtpVerifyResult;
      if (verified.needsOnboarding) {
        setSession(verified);
        setFullName("");
        setEmail("");
        setAuthStep("onboarding");
        setNotice("Phone verified! Complete your profile to continue.");
        return;
      }
      setChallenge(null);
      setOtpCode("");
      setAuthStep("phone");
      await refreshAccount();
      setNotice(verified.isNewUser ? "Welcome to NIGHTLIFEZ!" : "Signed in with verified phone.");
      if (verified.defaultWorkspacePath && verified.defaultWorkspacePath !== "/account") {
        // Keep user on /account if they have multiple workspaces so they can choose,
        // or show instant workspace banner.
      }
    } finally {
      setSubmittingOtp(false);
    }
  }

  async function handleCompleteOnboarding(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: fullName.trim(),
        email: email.trim() ? email.trim() : null,
        preferredCitySlug: citySlug
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setAuthError(json?.error ?? "Could not save profile.");
      return;
    }
    setChallenge(null);
    setOtpCode("");
    setAuthStep("phone");
    await refreshAccount();
    setNotice("Profile completed! Your NIGHTLIFEZ account is ready.");
  }

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    setChallenge(null);
    setOtpCode("");
    setAuthStep("phone");
    setNotice(null);
    setAuthError(null);
    await refreshAccount();
  }

  async function savePreferences(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    setAuthError(null);
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: fullName.trim(),
        email: email.trim() ? email.trim() : null,
        preferredCitySlug: citySlug,
        favoriteCategories
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setAuthError(json?.error ?? "Could not update profile.");
      return;
    }
    await refreshAccount();
    setNotice("Profile & preferences saved.");
  }

  async function submitSupportCase(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: caseSubject,
        category: "BOOKING",
        priority: "MEDIUM",
        message: caseMsg
      })
    });
    if (res.ok) {
      setCaseSubject("");
      setCaseMsg("");
      await refreshAccount();
      setNotice("Support case submitted.");
    }
  }

  function toggleCategory(key: string) {
    setFavoriteCategories((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  }

  const workspaces = session.workspaces ?? [];

  return (
    <div className="min-h-screen pb-14">
      <AppHeader cities={SEED_CITIES} selectedCity={citySlug} />

      <main className="mx-auto max-w-4xl space-y-6 px-3 py-6 sm:px-6">
        {loading ? (
          <div className="rounded-3xl border border-[#e4e6f0] bg-white p-8 text-sm text-[#5e6473]">
            Loading session...
          </div>
        ) : authStep === "onboarding" && session.user ? (
          <section className="mx-auto max-w-md rounded-3xl border border-[#e4e6f0] bg-white p-6 shadow-sm">
            <span className="inline-block rounded-full bg-[#dcfce7] px-3 py-1 text-[11px] font-bold text-[#16a34a]">
              Phone Verified · {session.user.phone}
            </span>
            <h1 className="mt-3 text-2xl font-extrabold text-[#111319]">Complete your profile</h1>
            <p className="mt-1 text-xs text-[#5e6473]">
              Add your name so organisers and venues can issue your passes. Email is optional.
            </p>
            <form onSubmit={handleCompleteOnboarding} className="mt-5 space-y-4">
              <label className="block text-xs font-bold text-[#5e6473]">
                Full Name
                <input
                  type="text"
                  required
                  minLength={2}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Asha Rao"
                  className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2.5 text-sm text-[#111319]"
                />
              </label>
              <label className="block text-xs font-bold text-[#5e6473]">
                Email Address (Optional)
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="asha@example.com"
                  className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2.5 text-sm text-[#111319]"
                />
              </label>
              <label className="block text-xs font-bold text-[#5e6473]">
                Preferred City
                <select
                  value={citySlug}
                  onChange={(e) => setCitySlug(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#e4e6f0] bg-white px-3 py-2.5 text-sm text-[#111319]"
                >
                  {SEED_CITIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name} ({c.state})
                    </option>
                  ))}
                </select>
              </label>
              {authError ? (
                <p role="alert" className="text-xs font-bold text-[#dc2626]">
                  {authError}
                </p>
              ) : null}
              <button
                type="submit"
                className="w-full rounded-xl bg-[#5b3df5] px-6 py-3 text-sm font-bold text-white hover:bg-[#4328d6]"
              >
                Finish &amp; Continue
              </button>
            </form>
          </section>
        ) : !session.user ? (
          <div className="space-y-6">
            <section className="mx-auto max-w-md rounded-3xl border border-[#e4e6f0] bg-white p-6 shadow-sm">
              <span className="inline-block rounded-full bg-[#efeafe] px-3 py-1 text-[11px] font-bold text-[#5b3df5]">
                NIGHTLIFEZ Unified Login
              </span>
              <h1 className="mt-2 text-2xl font-extrabold text-[#111319]">
                {authStep === "phone" ? "Log in or sign up" : "Verify your phone"}
              </h1>
              <p className="mt-1 text-xs text-[#5e6473]">
                {authStep === "phone"
                  ? "One phone-first login for attendees, organisers, venue managers, gate staff, and operations."
                  : `Enter the 6-digit code sent to ${challenge?.maskedPhone ?? "your phone"}.`}
              </p>

              {authStep === "phone" ? (
                <form onSubmit={(e) => void handleRequestOtp(e)} className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="nlz-phone-input" className="block text-xs font-bold text-[#5e6473]">
                      Mobile Number
                    </label>
                    <div className="mt-1.5 flex gap-2">
                      <select
                        aria-label="Country code"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="rounded-xl border border-[#e4e6f0] bg-[#f6f7fb] px-2.5 py-2.5 text-sm font-bold text-[#111319]"
                      >
                        {COUNTRY_DIAL_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <input
                        id="nlz-phone-input"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        required
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="98765 00001"
                        className="min-w-0 flex-1 rounded-xl border border-[#e4e6f0] px-3.5 py-2.5 text-sm font-semibold text-[#111319] focus:border-[#5b3df5] focus:outline-none"
                      />
                    </div>
                  </div>

                  {authError ? (
                    <p role="alert" className="rounded-xl bg-[#fee2e2] px-3 py-2 text-xs font-bold text-[#dc2626]">
                      {authError}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submittingOtp || phoneInput.trim().length < 6}
                    className="w-full rounded-xl bg-[#5b3df5] px-6 py-3 text-sm font-bold text-white hover:bg-[#4328d6] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingOtp ? "Sending OTP..." : "Continue"}
                  </button>

                  <p className="text-center text-[11px] leading-relaxed text-[#5e6473]">
                    By continuing, you agree to NIGHTLIFEZ&apos;s{" "}
                    <Link href="/policies/terms-of-service" className="font-semibold text-[#5b3df5] underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/policies/privacy" className="font-semibold text-[#5b3df5] underline">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </form>
              ) : (
                <form onSubmit={(e) => void handleVerifyOtp(e)} className="mt-5 space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-[#f6f7fb] px-3 py-2 text-xs">
                    <span className="font-bold text-[#111319]">{challenge?.maskedPhone}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthStep("phone");
                        setChallenge(null);
                        setOtpCode("");
                        setAuthError(null);
                        setNotice(null);
                      }}
                      className="font-bold text-[#5b3df5] hover:underline"
                    >
                      Change phone number
                    </button>
                  </div>

                  {challenge?.previewSyntheticOtp ? (
                    <div className="flex items-center justify-between rounded-xl border border-[#ddd6fe] bg-[#f5f3ff] px-3 py-2 text-xs">
                      <div>
                        <span className="font-bold text-[#5b3df5]">Preview QA Synthetic OTP: </span>
                        <code data-testid="preview-synthetic-otp" className="font-mono font-extrabold text-[#111319]">
                          {challenge.previewSyntheticOtp}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOtpCode(challenge.previewSyntheticOtp ?? "")}
                        className="rounded-lg bg-[#5b3df5] px-2.5 py-1 text-[11px] font-bold text-white"
                      >
                        Fill OTP
                      </button>
                    </div>
                  ) : null}

                  <div>
                    <label htmlFor="nlz-otp-input" className="block text-xs font-bold text-[#5e6473]">
                      6-Digit Verification Code
                    </label>
                    <input
                      id="nlz-otp-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="\d{6}"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="••••••"
                      className="mt-1.5 w-full rounded-xl border border-[#e4e6f0] px-4 py-3 text-center font-mono text-xl font-extrabold tracking-[0.4em] text-[#111319] focus:border-[#5b3df5] focus:outline-none"
                    />
                  </div>

                  {authError ? (
                    <p role="alert" className="rounded-xl bg-[#fee2e2] px-3 py-2 text-xs font-bold text-[#dc2626]">
                      {authError}
                    </p>
                  ) : null}
                  {notice ? (
                    <p role="status" className="rounded-xl bg-[#dcfce7] px-3 py-2 text-xs font-bold text-[#16a34a]">
                      {notice}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submittingOtp || otpCode.length !== 6}
                    className="w-full rounded-xl bg-[#5b3df5] px-6 py-3 text-sm font-bold text-white hover:bg-[#4328d6] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingOtp ? "Verifying..." : "Verify & Continue"}
                  </button>

                  <div className="flex items-center justify-between text-xs text-[#5e6473]">
                    <span>Expires in 5 minutes</span>
                    <button
                      type="button"
                      disabled={resendCountdown > 0 || submittingOtp}
                      onClick={() => void handleResendOtp()}
                      className="font-bold text-[#5b3df5] disabled:text-[#9ca3af]"
                    >
                      {resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : "Resend OTP"}
                    </button>
                  </div>
                </form>
              )}
            </section>

            {qaDirectory.length > 0 ? (
              <section
                data-testid="qa-identity-directory"
                className="rounded-3xl border border-[#e4e6f0] bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="inline-block rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-[10px] font-bold text-[#92400e]">
                      NON-PRODUCTION QA DIRECTORY
                    </span>
                    <h2 className="mt-1 text-base font-extrabold text-[#111319]">
                      Synthetic Role Identities ({qaDirectory.length} roles)
                    </h2>
                  </div>
                  <p className="text-xs text-[#5e6473]">
                    Click any identity to prefill phone and request a synthetic preview OTP.
                  </p>
                </div>
                <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {qaDirectory.map((qa) => (
                    <div
                      key={qa.id}
                      className="flex flex-col justify-between rounded-2xl border border-[#e4e6f0] bg-[#f8f9fc] p-3 text-xs"
                    >
                      <div>
                        <div className="font-extrabold text-[#111319]">{qa.fullName}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-[#5b3df5]">{qa.phone}</div>
                        <div className="text-[11px] text-[#5e6473]">{qa.email}</div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {qa.roles.map((r) => (
                            <span
                              key={r.id}
                              className="rounded-full bg-[#efeafe] px-2 py-0.5 text-[10px] font-bold text-[#5b3df5]"
                            >
                              {r.role}
                              {r.organizationId ? ` · ${r.organizationId.replace("org-", "")}` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCountryCode("+91");
                          const localDigits = qa.phone.replace(/^\+91/, "");
                          setPhoneInput(localDigits);
                          void handleRequestOtp(undefined, localDigits, "+91");
                        }}
                        className="mt-3 rounded-xl border border-[#5b3df5] bg-white px-3 py-1.5 text-[11px] font-bold text-[#5b3df5] hover:bg-[#efeafe]"
                      >
                        Use Phone &amp; Send OTP
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <>
            <section className="rounded-3xl border border-[#e4e6f0] bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {session.roles.map((role) => (
                      <span
                        key={role}
                        className="rounded-full bg-[#efeafe] px-2.5 py-0.5 text-[11px] font-bold text-[#5b3df5]"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                  <h1 className="mt-2 text-2xl font-extrabold text-[#111319]">
                    {session.user.fullName}
                  </h1>
                  <p className="text-xs text-[#5e6473]">
                    {session.user.phone ?? "No phone"}
                    {session.user.email ? ` · ${session.user.email}` : " · Phone-first account"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="rounded-xl border border-[#e4e6f0] px-4 py-2 text-xs font-bold text-[#5e6473] hover:border-[#111319]"
                >
                  Sign Out
                </button>
              </div>

              {notice ? (
                <p role="status" className="mt-3 rounded-xl bg-[#dcfce7] px-3 py-2 text-xs font-bold text-[#16a34a]">
                  {notice}
                </p>
              ) : null}
              {authError ? (
                <p role="alert" className="mt-3 rounded-xl bg-[#fee2e2] px-3 py-2 text-xs font-bold text-[#dc2626]">
                  {authError}
                </p>
              ) : null}

              {/* Unified Workspace & Role Context Switcher */}
              <div className="mt-5 rounded-2xl border border-[#e4e6f0] bg-[#f8f9fc] p-4">
                <div className="text-xs font-extrabold text-[#111319]">
                  Permitted Workspaces ({workspaces.length})
                </div>
                <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                  {workspaces.map((ws) => {
                    const href =
                      ws.path === "/organiser" && ws.organizationId
                        ? `/organiser?org=${encodeURIComponent(ws.organizationId)}`
                        : ws.path;
                    return (
                      <button
                        key={ws.key}
                        type="button"
                        onClick={() => router.push(href)}
                        className="flex items-center justify-between rounded-xl border border-[#e4e6f0] bg-white px-3.5 py-2.5 text-left hover:border-[#5b3df5]"
                      >
                        <div>
                          <div className="text-xs font-extrabold text-[#111319]">{ws.label}</div>
                          <div className="text-[11px] text-[#5e6473]">
                            {ws.path}
                            {ws.eventId ? ` · ${ws.eventId}` : ""}
                            {ws.venueSlug ? ` · ${ws.venueSlug}` : ""}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[#5b3df5]">Open →</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={savePreferences} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block text-xs font-bold text-[#5e6473]">
                    Full Name
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-sm text-[#111319]"
                    />
                  </label>
                  <label className="block text-xs font-bold text-[#5e6473]">
                    Contact Email (Optional)
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="optional@example.com"
                      className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-sm text-[#111319]"
                    />
                  </label>
                  <label className="block text-xs font-bold text-[#5e6473]">
                    Preferred City
                    <select
                      value={citySlug}
                      onChange={(e) => setCitySlug(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#e4e6f0] bg-white px-3 py-2 text-sm text-[#111319]"
                    >
                      {SEED_CITIES.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name} ({c.state})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div>
                  <div className="text-xs font-bold text-[#5e6473]">Discovery Interests</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DISCOVERY_CATEGORIES.map((cat) => {
                      const active = favoriteCategories.includes(cat.key);
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => toggleCategory(cat.key)}
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${
                            active
                              ? "border-[#5b3df5] bg-[#efeafe] text-[#5b3df5]"
                              : "border-[#e4e6f0] bg-[#f6f7fb] text-[#5e6473]"
                          }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-[#5b3df5] px-5 py-2.5 text-sm font-bold text-white"
                >
                  Save Profile &amp; Preferences
                </button>
              </form>
            </section>

            {/* Quick Links */}
            <section className="grid gap-3 sm:grid-cols-2">
              <Link
                href={`/bookings${session.user.email ? `?email=${encodeURIComponent(session.user.email)}` : ""}`}
                className="rounded-2xl border border-[#e4e6f0] bg-white p-4 hover:border-[#5b3df5]"
              >
                <div className="text-sm font-extrabold text-[#111319]">Ticket Wallet →</div>
                <p className="mt-1 text-xs text-[#5e6473]">QR passes, cancellations &amp; refunds</p>
              </Link>
              <Link href="/search" className="rounded-2xl border border-[#e4e6f0] bg-white p-4 hover:border-[#5b3df5]">
                <div className="text-sm font-extrabold text-[#111319]">Discover Events &amp; Dining →</div>
                <p className="mt-1 text-xs text-[#5e6473]">Browse live events, venues, and offers</p>
              </Link>
            </section>

            <div className="grid gap-6 md:grid-cols-2">
              <section className="rounded-3xl border border-[#e4e6f0] bg-white p-5">
                <h2 className="text-lg font-extrabold text-[#111319]">
                  Saved Items ({savedItems.length})
                </h2>
                <div className="mt-3 space-y-2 text-xs">
                  {savedItems.length === 0 ? (
                    <p className="text-[#5e6473]">No saved items yet.</p>
                  ) : (
                    savedItems.map((item) => (
                      <div key={item.id} className="rounded-xl bg-[#f6f7fb] px-3 py-2">
                        {item.itemType}: {item.itemSlug}
                      </div>
                    ))
                  )}
                </div>

                <h3 className="mt-5 text-sm font-extrabold text-[#111319]">
                  Notifications ({notifications.length})
                </h3>
                <div className="mt-2 space-y-2 text-xs">
                  {notifications.slice(0, 4).map((n) => (
                    <div key={n.id} className="rounded-xl bg-[#f6f7fb] p-3">
                      <div className="font-bold text-[#111319]">{n.title}</div>
                      <p className="mt-0.5 text-[#5e6473]">{n.body}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-[#e4e6f0] bg-white p-5">
                <h2 className="text-lg font-extrabold text-[#111319]">
                  Support &amp; Helpdesk ({cases.length})
                </h2>
                <form onSubmit={submitSupportCase} className="mt-3 space-y-3">
                  <input
                    type="text"
                    required
                    value={caseSubject}
                    onChange={(e) => setCaseSubject(e.target.value)}
                    placeholder="Issue subject (e.g. Refund status)"
                    className="w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs"
                  />
                  <textarea
                    required
                    value={caseMsg}
                    onChange={(e) => setCaseMsg(e.target.value)}
                    placeholder="Describe your issue..."
                    rows={3}
                    className="w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-[#111319] px-4 py-2 text-xs font-bold text-white"
                  >
                    Submit Support Case
                  </button>
                </form>
                <div className="mt-4 space-y-2 text-xs">
                  {cases.map((c) => (
                    <div key={c.id} className="rounded-xl bg-[#f6f7fb] p-3">
                      <div className="flex justify-between font-bold text-[#111319]">
                        <span>{c.subject}</span>
                        <span>{c.status}</span>
                      </div>
                      <p className="mt-1 text-[#5e6473]">{c.notes[0]?.text}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
