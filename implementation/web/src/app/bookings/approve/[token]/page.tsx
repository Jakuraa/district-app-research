"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatInr, SEED_CITIES, type BookingRecord } from "@nightlifez/shared";
import { AppHeader } from "@/components/AppHeader";

export default function ApprovedBookingPaymentPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/bookings/approve/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Approval link not found");
        setBooking(json.booking);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load approval"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCompletePayment() {
    setPaying(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/approve/${encodeURIComponent(token)}`, {
        method: "POST"
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Payment failed");
      setBooking(json.booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete payment");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] pb-16">
      <AppHeader cities={SEED_CITIES} />
      <main className="mx-auto max-w-2xl px-3 py-8 sm:px-6">
        {loading ? (
          <div className="rounded-2xl border border-[#e4e6f0] bg-white p-6 text-sm text-[#5e6473]">
            Loading approved booking request...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[#dc2626] bg-white p-6">
            <h1 className="text-lg font-extrabold text-[#dc2626]">Approval Link Unavailable</h1>
            <p className="mt-1 text-sm text-[#5e6473]">{error}</p>
            <Link href="/events" className="mt-4 inline-block rounded-xl bg-[#5b3df5] px-4 py-2 text-xs font-bold text-white">
              Browse Events
            </Link>
          </div>
        ) : booking ? (
          <div className="space-y-4 rounded-3xl border border-[#e4e6f0] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-[#efeafe] px-3 py-1 text-xs font-extrabold text-[#5b3df5]">
                {booking.status}
              </span>
              <span className="font-mono text-xs font-bold text-[#5e6473]">{booking.referenceCode}</span>
            </div>

            <h1 className="text-2xl font-extrabold text-[#111319]">{booking.eventTitle}</h1>
            <p className="text-sm text-[#5e6473]">
              {booking.dateLabel} · {booking.venueName}
            </p>

            <div className="space-y-2 rounded-2xl bg-[#f6f7fb] p-4 text-sm">
              <div className="flex justify-between">
                <span>Attendee</span>
                <span className="font-bold">{booking.attendeeName} ({booking.attendeeEmail})</span>
              </div>
              {booking.items.map((item) => (
                <div key={item.tierId} className="flex justify-between">
                  <span>{item.quantity} × {item.tierName}</span>
                  <span className="font-bold">{formatInr(item.quantity * item.unitPriceInr)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-[#e4e6f0] pt-2 font-extrabold">
                <span>Total (Demo Mode · No Real Charge)</span>
                <span className="text-[#5b3df5]">{formatInr(booking.totalInr)}</span>
              </div>
            </div>

            {booking.status === "EXPIRED" ? (
              <div className="rounded-xl bg-[#fee2e2] p-4 text-xs font-bold text-[#dc2626]">
                This approval link has expired ({booking.approvalExpiresAt}). Please submit a new request on the event page.
              </div>
            ) : booking.status === "APPROVED_AWAITING_PAYMENT" ? (
              <div className="space-y-3">
                {booking.approvalExpiresAt ? (
                  <p className="text-xs text-[#5e6473]">
                    Link expires at: <strong>{new Date(booking.approvalExpiresAt).toLocaleString()}</strong>
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={paying}
                  onClick={() => void handleCompletePayment()}
                  className="w-full rounded-2xl bg-[#5b3df5] py-3 text-sm font-extrabold text-white disabled:opacity-60"
                >
                  {paying ? "Confirming Demo Payment..." : `Complete Demo Payment (${formatInr(booking.totalInr)}) & Get Passes`}
                </button>
              </div>
            ) : booking.status === "CONFIRMED_DEMO" ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-[#dcfce7] p-3 text-xs font-bold text-[#16a34a]">
                  Confirmed! Your QR passes are ready below.
                </div>
                {booking.tickets?.map((t) => (
                  <div key={t.id} className="rounded-xl border border-[#e4e6f0] p-3 text-xs">
                    <div className="flex justify-between font-bold">
                      <span>{t.holderName} · {t.tierName}</span>
                      <span className="font-mono text-[#5b3df5]">{t.ticketCode}</span>
                    </div>
                    <div className="mt-1 truncate font-mono text-[10px] text-[#5e6473]">{t.qrToken}</div>
                  </div>
                ))}
                <Link href="/bookings" className="inline-block rounded-xl bg-[#111319] px-4 py-2 text-xs font-bold text-white">
                  View All Passes →
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
