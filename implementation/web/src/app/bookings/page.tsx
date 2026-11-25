"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatInr, SEED_CITIES, type BookingRecord } from "@pulsepass/shared";
import { AppHeader } from "@/components/AppHeader";

export default function BookingsPage() {
  const [emailFilter, setEmailFilter] = useState("");
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadBookings(email?: string) {
    setLoading(true);
    try {
      const qs = email ? `?email=${encodeURIComponent(email)}` : "";
      const res = await fetch(`/api/bookings${qs}`);
      const json = await res.json();
      setBookings(json.bookings ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialEmail = params.get("email") ?? "";
    setEmailFilter(initialEmail);
    void loadBookings(initialEmail || undefined);
  }, []);

  async function handleCancel(id: string) {
    await fetch(`/api/bookings/${encodeURIComponent(id)}/cancel`, { method: "POST" });
    await loadBookings(emailFilter || undefined);
  }

  return (
    <div className="min-h-screen">
      <AppHeader cities={SEED_CITIES} />

      <main className="mx-auto max-w-4xl space-y-6 px-3 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-[#111319]">My Tickets & Bookings</h1>
            <p className="text-sm text-[#5e6473]">
              Synthetic demo ticket wallet — no real charges or live barcodes.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void loadBookings(emailFilter || undefined);
          }}
          className="flex gap-2"
        >
          <input
            type="email"
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            placeholder="Filter by attendee email (optional)"
            className="min-w-0 flex-1 rounded-xl border border-[#e4e6f0] bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#111319] px-4 py-2 text-sm font-semibold text-white"
          >
            Lookup
          </button>
        </form>

        {loading ? (
          <div className="rounded-2xl border border-[#e4e6f0] bg-white p-8 text-center text-sm text-[#5e6473]">
            Loading demo reservations...
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl border border-[#e4e6f0] bg-white p-8 text-center">
            <p className="text-sm text-[#5e6473]">No demo bookings found yet.</p>
            <Link
              href="/events"
              className="mt-3 inline-block rounded-full bg-[#5b3df5] px-5 py-2 text-sm font-semibold text-white"
            >
              Browse Events
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-[#e4e6f0] bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        b.status === "CONFIRMED_DEMO"
                          ? "bg-[#dcfce7] text-[#16a34a]"
                          : "bg-[#fee2e2] text-[#dc2626]"
                      }`}
                    >
                      {b.status === "CONFIRMED_DEMO" ? "CONFIRMED DEMO PASS" : "CANCELLED"}
                    </span>
                    <h2 className="mt-2 text-lg font-bold text-[#111319]">{b.eventTitle}</h2>
                    <p className="text-xs text-[#5e6473]">
                      {b.dateLabel} · {b.venueName}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#111319]">
                      Ref: {b.referenceCode} · {b.attendeeName} ({b.attendeeEmail})
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-extrabold text-[#111319]">
                      {formatInr(b.totalInr)}
                    </div>
                    <div className="text-[11px] text-[#5e6473]">Demo total (no charge)</div>
                  </div>
                </div>

                <div className="mt-3 border-t border-[#e4e6f0] pt-3 text-xs text-[#5e6473]">
                  {b.items.map((item) => (
                    <div key={item.tierId}>
                      {item.quantity} × {item.tierName} ({formatInr(item.unitPriceInr)})
                    </div>
                  ))}
                </div>

                {b.status === "CONFIRMED_DEMO" ? (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleCancel(b.id)}
                      className="rounded-xl border border-[#dc2626] px-3 py-1.5 text-xs font-semibold text-[#dc2626] hover:bg-[#fee2e2]"
                    >
                      Cancel Demo Booking
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
