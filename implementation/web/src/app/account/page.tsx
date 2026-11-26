"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DISCOVERY_CATEGORIES, SEED_CITIES, type DemoUserProfile } from "@nightlifez/shared";
import { AppHeader } from "@/components/AppHeader";

const STORAGE_KEY = "nightlifez_demo_profile_v1";

export default function AccountPage() {
  const [profile, setProfile] = useState<DemoUserProfile>({
    name: "",
    email: "",
    preferredCitySlug: "bengaluru",
    favoriteCategories: ["concerts", "dining"],
    isSignedIn: false
  });
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setProfile(JSON.parse(raw) as DemoUserProfile);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  function saveProfile(next: DemoUserProfile) {
    setProfile(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  }

  function handleDemoSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!profile.name.trim() || !profile.email.trim()) return;
    saveProfile({ ...profile, isSignedIn: true });
  }

  function toggleCategory(key: string) {
    const exists = profile.favoriteCategories.includes(key);
    const nextCats = exists
      ? profile.favoriteCategories.filter((c) => c !== key)
      : [...profile.favoriteCategories, key];
    saveProfile({ ...profile, favoriteCategories: nextCats });
  }

  return (
    <div className="min-h-screen pb-14">
      <AppHeader cities={SEED_CITIES} selectedCity={profile.preferredCitySlug} />

      <main className="mx-auto max-w-3xl space-y-6 px-3 py-6 sm:px-6">
        <div className="rounded-3xl border border-[#e4e6f0] bg-white p-6">
          <span className="inline-block rounded-full bg-[#efeafe] px-3 py-1 text-[11px] font-bold text-[#5b3df5]">
            Local Demo Profile · No External Auth Provider
          </span>
          <h1 className="mt-2 text-2xl font-extrabold text-[#111319]">
            {profile.isSignedIn ? `Welcome, ${profile.name}` : "Sign in or Register (Demo)"}
          </h1>
          <p className="mt-1 text-sm text-[#5e6473]">
            Save your preferred city, interest categories, and quick-access email for your digital ticket wallet.
          </p>

          <form onSubmit={handleDemoSignIn} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold text-[#5e6473]">
                Full Name
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Asha Rao"
                  className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2.5 text-sm text-[#111319]"
                />
              </label>
              <label className="block text-xs font-bold text-[#5e6473]">
                Email Address
                <input
                  type="email"
                  required
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="asha@example.com"
                  className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2.5 text-sm text-[#111319]"
                />
              </label>
            </div>

            <label className="block text-xs font-bold text-[#5e6473]">
              Home City
              <select
                value={profile.preferredCitySlug}
                onChange={(e) => saveProfile({ ...profile, preferredCitySlug: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[#e4e6f0] bg-white px-3 py-2.5 text-sm text-[#111319]"
              >
                {SEED_CITIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name} ({c.state})
                  </option>
                ))}
              </select>
            </label>

            <div>
              <div className="text-xs font-bold text-[#5e6473]">Interests</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {DISCOVERY_CATEGORIES.map((cat) => {
                  const active = profile.favoriteCategories.includes(cat.key);
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

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                className="rounded-xl bg-[#5b3df5] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#4328d6]"
              >
                {profile.isSignedIn ? "Update Demo Profile" : "Continue as Demo User"}
              </button>
              {profile.isSignedIn ? (
                <button
                  type="button"
                  onClick={() => saveProfile({ ...profile, isSignedIn: false })}
                  className="rounded-xl border border-[#e4e6f0] px-4 py-2.5 text-sm font-bold text-[#5e6473]"
                >
                  Sign Out
                </button>
              ) : null}
              {savedNotice ? (
                <span className="text-xs font-bold text-[#16a34a]">Preferences saved</span>
              ) : null}
            </div>
          </form>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href={
              profile.email
                ? `/bookings?email=${encodeURIComponent(profile.email)}`
                : "/bookings"
            }
            className="rounded-2xl border border-[#e4e6f0] bg-white p-5 transition hover:border-[#5b3df5]"
          >
            <h2 className="text-base font-extrabold text-[#111319]">My Tickets & Wallet →</h2>
            <p className="mt-1 text-xs text-[#5e6473]">
              View confirmed demo passes, QR codes, and cancellation options.
            </p>
          </Link>
          <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
            <h2 className="text-base font-extrabold text-[#111319]">Support & Help</h2>
            <p className="mt-1 text-xs text-[#5e6473]">
              NIGHTLIFEZ is running in clean-room demo mode. Demo bookings can be cancelled anytime to restore tier inventory.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
