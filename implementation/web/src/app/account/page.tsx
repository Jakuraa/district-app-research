"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DISCOVERY_CATEGORIES,
  SEED_CITIES,
  type AuthSessionView,
  type PlatformNotification,
  type SavedItem,
  type SupportCase
} from "@nightlifez/shared";
import { AppHeader } from "@/components/AppHeader";

export default function AccountPage() {
  const [session, setSession] = useState<AuthSessionView>({
    user: null,
    assignments: [],
    roles: []
  });
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [citySlug, setCitySlug] = useState("bengaluru");
  const [favoriteCategories, setFavoriteCategories] = useState<string[]>(["concerts", "dining"]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [caseSubject, setCaseSubject] = useState("");
  const [caseMsg, setCaseMsg] = useState("");

  async function refreshAccount() {
    setLoading(true);
    try {
      const [meRes, notifRes] = await Promise.all([fetch("/api/auth/me"), fetch("/api/notifications")]);
      const meData = (await meRes.json()) as AuthSessionView;
      const notifData = await notifRes.json();
      setSession(meData);
      setNotifications(notifData.notifications ?? []);
      if (meData.user) {
        setFullName(meData.user.fullName);
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

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setNotice(null);
    const endpoint = mode === "signin" ? "/api/auth/signin" : "/api/auth/signup";
    const payload =
      mode === "signin"
        ? { email, password }
        : { email, password, fullName, preferredCitySlug: citySlug, favoriteCategories };
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) {
      setAuthError(json?.error ?? "Authentication failed");
      return;
    }
    setPassword("");
    await refreshAccount();
    setNotice(mode === "signin" ? "Signed in." : "Account created and signed in.");
  }

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    await refreshAccount();
  }

  async function savePreferences(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, preferredCitySlug: citySlug, favoriteCategories })
    });
    if (res.ok) {
      await refreshAccount();
      setNotice("Preferences saved to your account.");
    }
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

  return (
    <div className="min-h-screen pb-14">
      <AppHeader cities={SEED_CITIES} selectedCity={citySlug} />

      <main className="mx-auto max-w-4xl space-y-6 px-3 py-6 sm:px-6">
        {loading ? (
          <div className="rounded-3xl border border-[#e4e6f0] bg-white p-8 text-sm text-[#5e6473]">
            Loading session...
          </div>
        ) : !session.user ? (
          <section className="rounded-3xl border border-[#e4e6f0] bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="inline-block rounded-full bg-[#efeafe] px-3 py-1 text-[11px] font-bold text-[#5b3df5]">
                  NIGHTLIFEZ Identity & RBAC Session
                </span>
                <h1 className="mt-2 text-2xl font-extrabold text-[#111319]">
                  {mode === "signin" ? "Sign in to NIGHTLIFEZ" : "Create NIGHTLIFEZ Account"}
                </h1>
              </div>
              <div className="flex rounded-full border border-[#e4e6f0] p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`rounded-full px-4 py-1.5 ${
                    mode === "signin" ? "bg-[#5b3df5] text-white" : "text-[#5e6473]"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`rounded-full px-4 py-1.5 ${
                    mode === "signup" ? "bg-[#5b3df5] text-white" : "text-[#5e6473]"
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            <form onSubmit={handleAuthSubmit} className="mt-5 space-y-4">
              {mode === "signup" ? (
                <label className="block text-xs font-bold text-[#5e6473]">
                  Full Name
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Asha Rao"
                    className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2.5 text-sm text-[#111319]"
                  />
                </label>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-[#5e6473]">
                  Email Address
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="asha@nightlifez.test"
                    className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2.5 text-sm text-[#111319]"
                  />
                </label>
                <label className="block text-xs font-bold text-[#5e6473]">
                  Password
                  <input
                    type="password"
                    required
                    minLength={mode === "signup" ? 8 : 1}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2.5 text-sm text-[#111319]"
                  />
                </label>
              </div>
              {authError ? <p className="text-xs font-bold text-[#dc2626]">{authError}</p> : null}
              <button
                type="submit"
                className="rounded-xl bg-[#5b3df5] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#4328d6]"
              >
                {mode === "signin" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <div className="mt-6 rounded-2xl bg-[#f6f7fb] p-4 text-xs text-[#5e6473]">
              <p className="font-bold text-[#111319]">Sandbox Role Directory (for authorized QA)</p>
              <p className="mt-1">
                Seeded sandbox test accounts: <code className="font-mono">asha@nightlifez.test</code> (Attendee),{" "}
                <code className="font-mono">organiser@nightlifez.test</code> (Organiser),{" "}
                <code className="font-mono">venue@nightlifez.test</code> (Venue Manager),{" "}
                <code className="font-mono">staff@nightlifez.test</code> (Gate Staff),{" "}
                <code className="font-mono">admin@nightlifez.test</code> (Platform Admin).
              </p>
            </div>
          </section>
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
                  <p className="text-xs text-[#5e6473]">{session.user.email}</p>
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
                <p className="mt-3 rounded-xl bg-[#dcfce7] px-3 py-2 text-xs font-bold text-[#16a34a]">
                  {notice}
                </p>
              ) : null}

              <form onSubmit={savePreferences} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
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
                  Save Profile & Preferences
                </button>
              </form>
            </section>

            {/* Role Portals */}
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link href={`/bookings?email=${encodeURIComponent(session.user.email)}`} className="rounded-2xl border border-[#e4e6f0] bg-white p-4 hover:border-[#5b3df5]">
                <div className="text-sm font-extrabold text-[#111319]">Ticket Wallet →</div>
                <p className="mt-1 text-xs text-[#5e6473]">QR passes, cancellations & refunds</p>
              </Link>
              <Link href="/organiser" className="rounded-2xl border border-[#e4e6f0] bg-white p-4 hover:border-[#5b3df5]">
                <div className="text-sm font-extrabold text-[#111319]">Organiser Console →</div>
                <p className="mt-1 text-xs text-[#5e6473]">Events, tiers, offers & analytics</p>
              </Link>
              <Link href="/venue-portal" className="rounded-2xl border border-[#e4e6f0] bg-white p-4 hover:border-[#5b3df5]">
                <div className="text-sm font-extrabold text-[#111319]">Venue Portal →</div>
                <p className="mt-1 text-xs text-[#5e6473]">Sections, schedules & policies</p>
              </Link>
              <Link href="/staff" className="rounded-2xl border border-[#e4e6f0] bg-white p-4 hover:border-[#5b3df5]">
                <div className="text-sm font-extrabold text-[#111319]">Staff Check-In →</div>
                <p className="mt-1 text-xs text-[#5e6473]">QR scan & offline queue sync</p>
              </Link>
            </section>

            <div className="grid gap-6 md:grid-cols-2">
              <section className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
                <h2 className="text-base font-extrabold text-[#111319]">Saved Events & Venues</h2>
                {savedItems.length === 0 ? (
                  <p className="mt-2 text-xs text-[#5e6473]">No saved items yet. Tap Save Event on any event page.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {savedItems.map((s) => (
                      <Link
                        key={s.id}
                        href={s.itemType === "venue" ? `/venues/${s.itemSlug}` : `/events/${s.itemSlug}`}
                        className="block rounded-xl border border-[#e4e6f0] bg-[#f6f7fb] px-3 py-2 text-xs font-bold text-[#5b3df5]"
                      >
                        {s.itemType.toUpperCase()}: {s.itemSlug}
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
                <h2 className="text-base font-extrabold text-[#111319]">Notifications</h2>
                <div className="mt-3 space-y-2">
                  {notifications.slice(0, 5).map((n) => (
                    <div key={n.id} className="rounded-xl bg-[#f6f7fb] p-3 text-xs">
                      <div className="font-bold text-[#111319]">{n.title}</div>
                      <div className="mt-0.5 text-[#5e6473]">{n.body}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
              <h2 className="text-base font-extrabold text-[#111319]">Support & Help Desk</h2>
              <form onSubmit={submitSupportCase} className="mt-3 space-y-3">
                <input
                  type="text"
                  required
                  value={caseSubject}
                  onChange={(e) => setCaseSubject(e.target.value)}
                  placeholder="Subject (e.g. Need wheelchair ramp confirmation)"
                  className="w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-sm"
                />
                <textarea
                  required
                  rows={2}
                  value={caseMsg}
                  onChange={(e) => setCaseMsg(e.target.value)}
                  placeholder="Describe your booking or access question..."
                  className="w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-[#111319] px-4 py-2 text-xs font-bold text-white"
                >
                  Open Support Case
                </button>
              </form>
              {cases.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {cases.map((c) => (
                    <div key={c.id} className="rounded-xl border border-[#e4e6f0] p-3 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span>{c.subject}</span>
                        <span className="rounded-full bg-[#efeafe] px-2 py-0.5 text-[10px] text-[#5b3df5]">
                          {c.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[#5e6473]">{c.notes[c.notes.length - 1]?.text}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
