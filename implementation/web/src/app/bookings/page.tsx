"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatInr, SEED_CITIES, type BookingRecord } from "@nightlifez/shared";
import { AppHeader } from "@/components/AppHeader";

function DemoQrGraphic({ code }: { code: string }) {
  // Deterministic visual QR-style matrix derived from booking reference code
  const cells: boolean[] = [];
  for (let i = 0; i < 49; i++) {
    const ch = code.charCodeAt(i % code.length) || 65;
    cells.push(((ch + i * 7) % 3) !== 0);
  }
  return (
    <div className="inline-flex flex-col items-center rounded-2xl border border-[#e4e6f0] bg-white p-3">
      <div className="grid grid-cols-7 gap-1">
        {cells.map((filled, idx) => (
          <span
            key={idx}
            className={`h-2.5 w-2.5 rounded-[2px] ${filled ? "bg-[#111319]" : "bg-[#f6f7fb]"}`}
          />
        ))}
      </div>
      <span className="mt-2 font-mono text-[10px] font-bold text-[#5e6473]">{code} · DEMO</span>
    </div>
  );
}

export default function BookingsPage() {
  const [emailFilter, setEmailFilter] = useState("");
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
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

  const visibleBookings = bookings.filter((b) =>
    tab === "upcoming" ? b.status === "CONFIRMED_DEMO" : b.status === "CANCELLED"
  );

  return (
    <div className="min-h-screen pb-14">
      <AppHeader cities={SEED_CITIES} />

      <main className="mx-auto max-w-4xl space-y-6 px-3 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-[#111319]">Digital Ticket Wallet</h1>
            <p className="text-sm text-[#5e6473]">
              Demo passes & booking history — no real charges or live venue gate barcodes.
            </p>
          </div>
          <div className="flex rounded-full border border-[#e4e6f0] bg-white p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setTab("upcoming")}
              className={`rounded-full px-4 py-1.5 ${
                tab === "upcoming" ? "bg-[#5b3df5] text-white" : "text-[#5e6473]"
              }`}
            >
              Upcoming Passes
            </button>
            <button
              type="button"
              onClick={() => setTab("past")}
              className={`rounded-full px-4 py-1.5 ${
                tab === "past" ? "bg-[#111319] text-white" : "text-[#5e6473]"
              }`}
            >
              Cancelled / Past
            </button>
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
            className="min-w-0 flex-1 rounded-xl border border-[#e4e6f0] bg-white px-3.5 py-2.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#111319] px-5 py-2.5 text-sm font-bold text-white"
          >
            Lookup
          </button>
        </form>

        {loading ? (
          <div className="rounded-2xl border border-[#e4e6f0] bg-white p-8 text-center text-sm text-[#5e6473]">
            Loading digital ticket wallet...
          </div>
        ) : visibleBookings.length === 0 ? (
          <div className="rounded-3xl border border-[#e4e6f0] bg-white p-8 text-center">
            <p className="text-sm text-[#5e6473]">
              No {tab === "upcoming" ? "upcoming" : "cancelled"} demo bookings found.
            </p>
            <Link
              href="/events"
              className="mt-4 inline-block rounded-full bg-[#5b3df5] px-5 py-2.5 text-xs font-bold text-white"
            >
              Explore Events
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleBookings.map((b) => (
              <div
                key={b.id}
                className="rounded-3xl border border-[#e4e6f0] bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        b.status === "CONFIRMED_DEMO"
                          ? "bg-[#dcfce7] text-[#16a34a]"
                          : "bg-[#fee2e2] text-[#dc2626]"
                      }`}
                    >
                      {b.status === "CONFIRMED_DEMO" ? "CONFIRMED DEMO PASS" : "CANCELLED"}
                    </span>
                    <h2 className="mt-2 text-lg font-extrabold text-[#111319]">{b.eventTitle}</h2>
                    <p className="text-xs text-[#5e6473]">
                      {b.dateLabel} · {b.venueName}
                    </p>
                    <p className="mt-1 text-xs font-bold text-[#111319]">
                      {b.attendeeName} ({b.attendeeEmail})
                    </p>
                    <div className="mt-3 space-y-1 text-xs text-[#5e6473]">
                      {b.items.map((item) => (
                        <div key={item.tierId}>
                          {item.quantity} × {item.tierName} ({formatInr(item.unitPriceInr)})
                        </div>
                      ))}
                    </div>
                  </div>

                  {b.status === "CONFIRMED_DEMO" ? (
                    <DemoQrGraphic code={b.referenceCode} />
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e6f0] pt-3">
                  <div>
                    <span className="text-base font-extrabold text-[#111319]">
                      {formatInr(b.totalInr)}
                    </span>
                    <span className="ml-2 text-[11px] text-[#5e6473]">Demo total (no charge)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/events/${b.eventSlug}`}
                      className="rounded-xl border border-[#e4e6f0] px-3 py-1.5 text-xs font-bold text-[#111319]"
                    >
                      Event Details
                    </Link>
                    {b.status === "CONFIRMED_DEMO" ? (
                      <button
                        type="button"
                        onClick={() => void handleCancel(b.id)}
                        className="rounded-xl border border-[#dc2626] px-3 py-1.5 text-xs font-bold text-[#dc2626] hover:bg-[#fee2e2]"
                      >
                        Cancel Demo Booking
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
