"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatInr,
  SEED_CITIES,
  type BookingRecord,
  type PulseEvent,
  type Venue
} from "@nightlifez/shared";
import { AppHeader } from "@/components/AppHeader";

export default function VenuePortalPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [headline, setHeadline] = useState("");
  const [openStatusLabel, setOpenStatusLabel] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadPortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/venue-portal");
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Access denied");
        return;
      }
      setVenues(json.venues ?? []);
      setEvents(json.events ?? []);
      setBookings(json.bookings ?? []);
      if (json.venues?.length > 0 && !selectedSlug) {
        const first = json.venues[0] as Venue;
        setSelectedSlug(first.slug);
        setHeadline(first.headline);
        setOpenStatusLabel(first.openStatusLabel);
        setSummary(first.summary);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPortal();
  }, []);

  const activeVenue = venues.find((v) => v.slug === selectedSlug) ?? venues[0];

  async function handleSaveVenue(e: React.FormEvent) {
    e.preventDefault();
    if (!activeVenue) return;
    setNotice(null);
    const res = await fetch("/api/venue-portal", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: activeVenue.slug,
        headline,
        openStatusLabel,
        summary
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setNotice(json?.error ?? "Could not update venue");
      return;
    }
    setNotice("Venue profile updated.");
    await loadPortal();
  }

  return (
    <div className="min-h-screen pb-14">
      <AppHeader cities={SEED_CITIES} />
      <main className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-block rounded-full bg-[#dcfce7] px-3 py-1 text-[11px] font-bold text-[#059669]">
              Venue & Partner Operations
            </span>
            <h1 className="mt-1 text-2xl font-extrabold text-[#111319]">
              Venue Profiles, Sections & Calendar
            </h1>
          </div>
          {venues.length > 0 ? (
            <select
              value={activeVenue?.slug ?? ""}
              onChange={(e) => {
                const v = venues.find((x) => x.slug === e.target.value);
                setSelectedSlug(e.target.value);
                if (v) {
                  setHeadline(v.headline);
                  setOpenStatusLabel(v.openStatusLabel);
                  setSummary(v.summary);
                }
              }}
              className="rounded-xl border border-[#e4e6f0] bg-white px-3 py-2 text-xs font-bold"
            >
              {venues.map((v) => (
                <option key={v.slug} value={v.slug}>
                  {v.name} ({v.approvalStatus ?? "APPROVED"})
                </option>
              ))}
            </select>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#e4e6f0] bg-white p-8 text-sm text-[#5e6473]">
            Loading venue portal...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-[#dc2626] bg-white p-6">
            <h2 className="text-base font-extrabold text-[#dc2626]">Protected Venue Portal</h2>
            <p className="mt-1 text-sm text-[#5e6473]">{error}</p>
            <Link href="/account" className="mt-4 inline-block rounded-xl bg-[#5b3df5] px-4 py-2 text-xs font-bold text-white">
              Sign in with a Venue Manager Account →
            </Link>
          </div>
        ) : activeVenue ? (
          <div className="grid gap-6 lg:grid-cols-12">
            <form onSubmit={handleSaveVenue} className="space-y-4 rounded-2xl border border-[#e4e6f0] bg-white p-5 lg:col-span-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-[#111319]">{activeVenue.name}</h2>
                <Link href={`/venues/${activeVenue.slug}`} className="text-xs font-bold text-[#5b3df5] underline">
                  Public Guide →
                </Link>
              </div>
              {notice ? <p className="rounded-xl bg-[#dcfce7] px-3 py-2 text-xs font-bold text-[#16a34a]">{notice}</p> : null}
              <label className="block text-xs font-bold text-[#5e6473]">
                Headline
                <input type="text" value={headline} onChange={(e) => setHeadline(e.target.value)} className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-bold text-[#5e6473]">
                Operating Status Label
                <input type="text" value={openStatusLabel} onChange={(e) => setOpenStatusLabel(e.target.value)} className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-bold text-[#5e6473]">
                Venue Summary
                <textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-sm" />
              </label>
              <button type="submit" className="rounded-xl bg-[#5b3df5] px-5 py-2.5 text-xs font-extrabold text-white">
                Save Venue Profile
              </button>
            </form>

            <div className="space-y-4 lg:col-span-6">
              <section className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
                <h2 className="text-base font-extrabold text-[#111319]">Configured Sections ({activeVenue.sections.length})</h2>
                <div className="mt-3 space-y-2 text-xs">
                  {activeVenue.sections.map((sec) => (
                    <div key={sec.id} className="flex items-center justify-between rounded-xl bg-[#f6f7fb] px-3 py-2">
                      <div>
                        <span className="font-bold text-[#111319]">{sec.name}</span>
                        <span className="ml-2 text-[#5e6473]">{sec.zoneLabel}</span>
                      </div>
                      <span className="font-bold text-[#5b3df5]">Cap {sec.capacity ?? 250}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
                <h2 className="text-base font-extrabold text-[#111319]">
                  Upcoming Calendar ({events.filter((e) => e.venueSlug === activeVenue.slug).length})
                </h2>
                <div className="mt-3 space-y-2 text-xs">
                  {events
                    .filter((e) => e.venueSlug === activeVenue.slug)
                    .map((evt) => (
                      <div key={evt.id} className="flex items-center justify-between rounded-xl border border-[#e4e6f0] px-3 py-2">
                        <div>
                          <div className="font-bold">{evt.title}</div>
                          <div className="text-[#5e6473]">{evt.dateLabel}</div>
                        </div>
                        <span className="font-bold">{evt.lifecycleStatus ?? "PUBLISHED"}</span>
                      </div>
                    ))}
                </div>
                <div className="mt-3 text-xs text-[#5e6473]">
                  Total venue bookings tracked: <strong>{bookings.length}</strong> (
                  {formatInr(bookings.reduce((s, b) => s + b.totalInr, 0))})
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
