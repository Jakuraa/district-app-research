"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { City } from "@pulsepass/shared";

interface AppHeaderProps {
  cities: City[];
  selectedCity?: string;
}

export function AppHeader({ cities, selectedCity = "all" }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [cityModalOpen, setCityModalOpen] = useState(false);

  const activeCityLabel =
    selectedCity === "all"
      ? "All Cities"
      : cities.find((c) => c.slug === selectedCity)?.name ?? selectedCity;

  function chooseCity(slug: string) {
    setCityModalOpen(false);
    const base = pathname.startsWith("/events") && pathname === "/events" ? "/events" : "/";
    router.push(slug === "all" ? base : `${base}?city=${encodeURIComponent(slug)}`);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[#e4e6f0] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-base font-bold tracking-tight text-[#111319] sm:text-lg"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#5b3df5] text-sm font-extrabold text-white">
              P
            </span>
            <span>PulsePass</span>
          </Link>

          <button
            type="button"
            onClick={() => setCityModalOpen(true)}
            aria-label="Select city"
            className="flex min-w-0 items-center gap-1.5 rounded-full border border-[#e4e6f0] bg-[#f6f7fb] px-3 py-1.5 text-xs font-medium text-[#111319] hover:border-[#5b3df5] sm:text-sm"
          >
            <span className="truncate">{activeCityLabel}</span>
            <span aria-hidden="true" className="text-[#5e6473]">
              ▾
            </span>
          </button>
        </div>

        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className={`rounded-full px-3 py-1.5 text-xs font-semibold sm:text-sm ${
              pathname === "/"
                ? "bg-[#efeafe] text-[#5b3df5]"
                : "text-[#5e6473] hover:text-[#111319]"
            }`}
          >
            Discover
          </Link>
          <Link
            href="/events"
            className={`rounded-full px-3 py-1.5 text-xs font-semibold sm:text-sm ${
              pathname.startsWith("/events")
                ? "bg-[#efeafe] text-[#5b3df5]"
                : "text-[#5e6473] hover:text-[#111319]"
            }`}
          >
            Events
          </Link>
          <Link
            href="/search"
            className={`rounded-full px-3 py-1.5 text-xs font-semibold sm:text-sm ${
              pathname.startsWith("/search")
                ? "bg-[#efeafe] text-[#5b3df5]"
                : "text-[#5e6473] hover:text-[#111319]"
            }`}
          >
            Search
          </Link>
          <Link
            href="/bookings"
            className={`rounded-full px-3 py-1.5 text-xs font-semibold sm:text-sm ${
              pathname.startsWith("/bookings")
                ? "bg-[#efeafe] text-[#5b3df5]"
                : "text-[#5e6473] hover:text-[#111319]"
            }`}
          >
            Tickets
          </Link>
        </nav>
      </div>

      {cityModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Select City"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
        >
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-[#e4e6f0] pb-3">
              <h2 className="text-base font-bold">Select Location</h2>
              <button
                type="button"
                onClick={() => setCityModalOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-[#5e6473] hover:bg-[#f6f7fb]"
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => chooseCity("all")}
                className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium ${
                  selectedCity === "all"
                    ? "border-[#5b3df5] bg-[#efeafe] text-[#5b3df5]"
                    : "border-[#e4e6f0] hover:border-[#5b3df5]"
                }`}
              >
                All Cities
              </button>
              {cities.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => chooseCity(c.slug)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium ${
                    selectedCity === c.slug
                      ? "border-[#5b3df5] bg-[#efeafe] text-[#5b3df5]"
                      : "border-[#e4e6f0] hover:border-[#5b3df5]"
                  }`}
                >
                  <div>{c.name}</div>
                  <div className="text-xs text-[#5e6473]">{c.state}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
