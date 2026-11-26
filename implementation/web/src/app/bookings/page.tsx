"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatInr, SEED_CITIES, type BookingRecord, type RefundRequest } from "@nightlifez/shared";
import { AppHeader } from "@/components/AppHeader";

function DemoQrGraphic({ code, token }: { code: string; token?: string }) {
  const source = token || code;
  const cells: boolean[] = [];
  for (let i = 0; i < 49; i++) {
    const ch = source.charCodeAt(i % source.length) || 65;
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
      <span className="mt-2 font-mono text-[10px] font-bold text-[#5e6473]">{code}</span>
    </div>
  );
}

export default function BookingsPage() {
  const [emailFilter, setEmailFilter] = useState("");
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [loading, setLoading] = useState(true);
  const [refundReasonByBooking, setRefundReasonByBooking] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  async function loadBookings(email?: string) {
    setLoading(true);
    try {
      const qs = email ? `?email=${encodeURIComponent(email)}` : "";
      const [bRes, rRes] = await Promise.all([
        fetch(`/api/bookings${qs}`),
        fetch("/api/refunds")
      ]);
      const bJson = await bRes.json();
      setBookings(bJson.bookings ?? []);
      if (rRes.ok) {
        const rJson = await rRes.json();
        setRefunds(rJson.refunds ?? []);
      }
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
    setNotice(null);
    const res = await fetch(`/api/bookings/${encodeURIComponent(id)}/cancel`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setNotice(json?.error ?? "Could not cancel booking");
      return;
    }
    setNotice("Booking cancelled and inventory restored.");
    await loadBookings(emailFilter || undefined);
  }

  async function handleRequestRefund(bookingId: string) {
    setNotice(null);
    const reason = refundReasonByBooking[bookingId]?.trim() || "Schedule change — requesting sandbox refund review";
    const res = await fetch("/api/refunds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, reason })
    });
    const json = await res.json();
    if (!res.ok) {
      setNotice(json?.error ?? "Could not submit refund request");
      return;
    }
    setNotice("Refund request submitted for review.");
    await loadBookings(emailFilter || undefined);
  }

  const visibleBookings = bookings.filter((b) =>
    tab === "upcoming"
      ? b.status === "CONFIRMED_DEMO" || b.status === "REFUND_PENDING"
      : b.status === "CANCELLED" || b.status === "REFUNDED"
  );

  return (
    <div className="min-h-screen pb-14">
      <AppHeader cities={SEED_CITIES} />

      <main className="mx-auto max-w-4xl space-y-6 px-3 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-[#111319]">Digital Ticket Wallet</h1>
            <p className="text-sm text-[#5e6473]">
              Signed QR passes, validation statuses, cancellations & refund requests (Sandbox Mode).
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
              Active & Pending
            </button>
            <button
              type="button"
              onClick={() => setTab("past")}
              className={`rounded-full px-4 py-1.5 ${
                tab === "past" ? "bg-[#111319] text-white" : "text-[#5e6473]"
              }`}
            >
              Cancelled / Refunded
            </button>
          </div>
        </div>

        {notice ? (
          <div className="rounded-xl bg-[#efeafe] px-4 py-2.5 text-xs font-bold text-[#5b3df5]">
            {notice}
          </div>
        ) : null}

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
            placeholder="Filter by attendee email"
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
              No {tab === "upcoming" ? "active" : "cancelled or refunded"} demo bookings found.
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
            {visibleBookings.map((b) => {
              const linkedRefund = refunds.find((r) => r.bookingId === b.id);
              return (
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
                            : b.status === "REFUND_PENDING"
                            ? "bg-[#fef3c7] text-[#d97706]"
                            : "bg-[#fee2e2] text-[#dc2626]"
                        }`}
                      >
                        {b.status}
                      </span>
                      <h2 className="mt-2 text-lg font-extrabold text-[#111319]">{b.eventTitle}</h2>
                      <p className="text-xs text-[#5e6473]">
                        {b.dateLabel} · {b.venueName}
                      </p>
                      <p className="mt-1 text-xs font-bold text-[#111319]">
                        {b.attendeeName} ({b.attendeeEmail}) · Ref {b.referenceCode}
                      </p>
                      <div className="mt-3 space-y-1 text-xs text-[#5e6473]">
                        {b.items.map((item) => (
                          <div key={item.tierId}>
                            {item.quantity} × {item.tierName} ({formatInr(item.unitPriceInr)})
                          </div>
                        ))}
                      </div>
                      {linkedRefund ? (
                        <div className="mt-2 rounded-xl bg-[#fef3c7] px-3 py-1.5 text-xs font-bold text-[#92400e]">
                          Refund Request: {linkedRefund.status} ({linkedRefund.reason})
                        </div>
                      ) : null}
                    </div>

                    {b.status === "CONFIRMED_DEMO" ? (
                      <DemoQrGraphic
                        code={b.tickets?.[0]?.ticketCode ?? b.referenceCode}
                        token={b.tickets?.[0]?.qrToken}
                      />
                    ) : null}
                  </div>

                  {b.tickets && b.tickets.length > 0 ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {b.tickets.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between rounded-xl border border-[#e4e6f0] bg-[#f6f7fb] px-3 py-2 text-xs"
                        >
                          <div>
                            <div className="font-mono font-bold text-[#111319]">{t.ticketCode}</div>
                            <div className="text-[11px] text-[#5e6473]">
                              {t.tierName}
                              {t.seatLabel ? ` · Seat ${t.seatLabel}` : ""}
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              t.status === "VALID"
                                ? "bg-[#dcfce7] text-[#16a34a]"
                                : t.status === "USED"
                                ? "bg-[#e0e7ff] text-[#4338ca]"
                                : "bg-[#fee2e2] text-[#dc2626]"
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e6f0] pt-3">
                    <div>
                      <span className="text-base font-extrabold text-[#111319]">
                        {formatInr(b.totalInr)}
                      </span>
                      <span className="ml-2 text-[11px] text-[#5e6473]">Sandbox total (no charge)</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/events/${b.eventSlug}`}
                        className="rounded-xl border border-[#e4e6f0] px-3 py-1.5 text-xs font-bold text-[#111319]"
                      >
                        Event Details
                      </Link>
                      {b.status === "CONFIRMED_DEMO" ? (
                        <>
                          <input
                            type="text"
                            value={refundReasonByBooking[b.id] ?? ""}
                            onChange={(e) =>
                              setRefundReasonByBooking((prev) => ({ ...prev, [b.id]: e.target.value }))
                            }
                            placeholder="Refund reason (optional)"
                            className="rounded-xl border border-[#e4e6f0] px-2.5 py-1.5 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => void handleRequestRefund(b.id)}
                            className="rounded-xl border border-[#5b3df5] px-3 py-1.5 text-xs font-bold text-[#5b3df5] hover:bg-[#efeafe]"
                          >
                            Request Refund
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleCancel(b.id)}
                            className="rounded-xl border border-[#dc2626] px-3 py-1.5 text-xs font-bold text-[#dc2626] hover:bg-[#fee2e2]"
                          >
                            Cancel Booking
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
