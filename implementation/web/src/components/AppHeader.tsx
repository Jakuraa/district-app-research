"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { City } from "@pulsepass/shared";

interface AppHeaderProps {
  cities: City[];
  selectedCity?: string;
}

const SECONDARY_TABS = [
  { href: "/", label: "For You", match: (p: string) => p === "/" },
  { href: "/dining", label: "Dining", match: (p: string) => p.startsWith("/dining") },
  { href: "/movies", label: "Movies", match: (p: string) => p.startsWith("/movies") },
  { href: "/events", label: "Events", match: (p: string) => p.startsWith("/events") },
  { href: "/play", label: "Play", match: (p: string) => p.startsWith("/play") }
] as const;

export function AppHeader({ cities, selectedCity = "all" }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState("all");

  const activeCity = cities.find((c) => c.slug === selectedCity);
  const activeCityLabel = selectedCity === "all" ? "All Cities" : activeCity?.name ?? selectedCity;
  const activeLocality =
    selectedCity === "all"
      ? "India · Pan-city discovery"
      : activeCity?.locality ?? activeCity?.state ?? "";

  function chooseCity(slug: string) {
    setCityModalOpen(false);
    const base = pathname === "/events" || pathname === "/dining" || pathname === "/movies" || pathname === "/play"
      ? pathname
      : "/";
    router.push(slug === "all" ? base : `${base}?city=${encodeURIComponent(slug)}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (searchScope !== "all") params.set("type", searchScope);
    if (selectedCity !== "all") params.set("city", selectedCity);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#e4e6f0] bg-white/95 backdrop-blur-md">
      {/* Primary Header Row */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2.5 px-3 py-2.5 sm:px-6 lg:flex-nowrap lg:gap-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-base font-extrabold tracking-tight text-[#111319] sm:text-lg"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <rect width="32" height="32" rx="9" fill="#5B3DF5" />
              <path
                d="M7 18H11L13.5 11L17.5 22L20.5 14L22.5 18H25"
                stroke="#FFFFFF"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>PulsePass</span>
          </Link>

          <button
            type="button"
            onClick={() => setCityModalOpen(true)}
            aria-label="Select city"
            className="flex min-w-0 items-center gap-2 rounded-full border border-[#e4e6f0] bg-[#f6f7fb] px-3 py-1.5 text-left transition hover:border-[#5b3df5]"
          >
            <span className="text-[#5b3df5]" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold text-[#111319] sm:text-sm">
                {activeCityLabel}
              </span>
              <span className="hidden truncate text-[10px] text-[#5e6473] sm:block">
                {activeLocality}
              </span>
            </span>
            <span aria-hidden="true" className="text-xs text-[#5e6473]">
              ▾
            </span>
          </button>
        </div>

        {/* Unified Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="order-3 flex w-full items-center overflow-hidden rounded-full border border-[#e4e6f0] bg-[#f6f7fb] pl-3 pr-1.5 transition focus-within:border-[#5b3df5] focus-within:bg-white lg:order-2 lg:max-w-lg lg:flex-1"
        >
          <select
            aria-label="Search category"
            value={searchScope}
            onChange={(e) => setSearchScope(e.target.value)}
            className="hidden bg-transparent pr-2 text-xs font-semibold text-[#5e6473] outline-none sm:block"
          >
            <option value="all">All</option>
            <option value="events">Events</option>
            <option value="movies">Movies</option>
            <option value="dining">Dining</option>
            <option value="play">Play</option>
          </select>
          <span className="hidden h-4 w-px bg-[#cbd0e0] sm:block" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, movies, dining, artists..."
            aria-label="Search PulsePass"
            className="min-w-0 flex-1 bg-transparent px-2.5 py-2 text-xs text-[#111319] placeholder:text-[#5e6473] outline-none sm:text-sm"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-[#5b3df5] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#4328d6]"
          >
            Search
          </button>
        </form>

        {/* Account & Tickets */}
        <div className="order-2 flex shrink-0 items-center gap-2 lg:order-3">
          <Link
            href="/bookings"
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
              pathname.startsWith("/bookings")
                ? "border-[#5b3df5] bg-[#efeafe] text-[#5b3df5]"
                : "border-[#e4e6f0] bg-white text-[#111319] hover:border-[#5b3df5]"
            }`}
          >
            Tickets
          </Link>
          <Link
            href="/account"
            aria-label="Account and profile"
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
              pathname.startsWith("/account")
                ? "border-[#5b3df5] bg-[#efeafe] text-[#5b3df5]"
                : "border-[#e4e6f0] bg-[#f6f7fb] text-[#111319] hover:border-[#5b3df5]"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Secondary Category Navigation */}
      <nav
        aria-label="Discovery categories"
        className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-3 sm:gap-2 sm:px-6"
      >
        {SECONDARY_TABS.map((tab) => {
          const active = tab.match(pathname);
          const href =
            selectedCity !== "all" && tab.href !== "/"
              ? `${tab.href}?city=${encodeURIComponent(selectedCity)}`
              : selectedCity !== "all" && tab.href === "/"
              ? `/?city=${encodeURIComponent(selectedCity)}`
              : tab.href;

          return (
            <Link
              key={tab.href}
              href={href}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-xs font-bold transition sm:px-4 sm:text-sm ${
                active
                  ? "border-[#5b3df5] text-[#5b3df5]"
                  : "border-transparent text-[#5e6473] hover:text-[#111319]"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* City Selector Dialog / Bottom Sheet */}
      {cityModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Select City"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
        >
          <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-[#e4e6f0] pb-3">
              <div>
                <h2 className="text-base font-extrabold text-[#111319]">Select Location</h2>
                <p className="text-xs text-[#5e6473]">Personalize events, dining, movies & play</p>
              </div>
              <button
                type="button"
                onClick={() => setCityModalOpen(false)}
                className="rounded-full bg-[#f6f7fb] px-3 py-1.5 text-xs font-bold text-[#111319] hover:bg-[#e4e6f0]"
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => chooseCity("all")}
                className={`rounded-2xl border p-3 text-left transition ${
                  selectedCity === "all"
                    ? "border-[#5b3df5] bg-[#efeafe] text-[#5b3df5]"
                    : "border-[#e4e6f0] hover:border-[#5b3df5]"
                }`}
              >
                <div className="text-sm font-bold">All Cities</div>
                <div className="text-[11px] text-[#5e6473]">Pan-India</div>
              </button>
              {cities.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => chooseCity(c.slug)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    selectedCity === c.slug
                      ? "border-[#5b3df5] bg-[#efeafe] text-[#5b3df5]"
                      : "border-[#e4e6f0] hover:border-[#5b3df5]"
                  }`}
                >
                  <div className="text-sm font-bold">{c.name}</div>
                  <div className="truncate text-[11px] text-[#5e6473]">{c.locality ?? c.state}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
