"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  calculatePriceBreakdown,
  formatInr,
  getTierAvailability,
  type BookingRecord,
  type InventoryHold,
  type PaymentState,
  type PulseEvent,
  type Venue
} from "@nightlifez/shared";
import { VenueSectionMap } from "./VenueSectionMap";

interface BookingFlowProps {
  event: PulseEvent;
  venue: Venue | null;
}

export function BookingFlow({ event, venue }: BookingFlowProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    event.sessions?.[0]?.id ?? null
  );
  const [targetQty, setTargetQty] = useState<number | null>(null);
  const [qtyGateDismissed, setQtyGateDismissed] = useState(false);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [selectedSeatsByTier, setSelectedSeatsByTier] = useState<Record<string, string[]>>({});
  const [focusedTierId, setFocusedTierId] = useState<string | null>(
    event.tiers.find((t) => t.remainingQuota > 0)?.id ?? null
  );
  const [tierSort, setTierSort] = useState<"default" | "price_asc" | "price_desc">("default");
  const [promoInput, setPromoInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [activeHold, setActiveHold] = useState<InventoryHold | null>(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number>(0);
  const [holding, setHolding] = useState(false);
  const [simulateOutcome, setSimulateOutcome] = useState<"CONFIRMED" | "FAILED">("CONFIRMED");
  const [idempotencyKey] = useState<string>(() => `idem_${Math.random().toString(36).slice(2, 14)}`);
  const [paymentState, setPaymentState] = useState<PaymentState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) {
          setAttendeeName((prev) => prev || data.user.fullName || "");
          setAttendeeEmail((prev) => prev || data.user.email || "");
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeHold) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(activeHold.expiresAt).getTime() - Date.now()) / 1000));
      setHoldSecondsLeft(diff);
      if (diff === 0) setActiveHold(null);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [activeHold]);

  const sortedTiers = useMemo(() => {
    const copy = event.tiers.slice();
    if (tierSort === "price_asc") copy.sort((a, b) => a.priceInr - b.priceInr);
    if (tierSort === "price_desc") copy.sort((a, b) => b.priceInr - a.priceInr);
    return copy;
  }, [event.tiers, tierSort]);

  const selections = useMemo(
    () =>
      Object.entries(selectedQuantities)
        .filter(([, q]) => q > 0)
        .map(([tierId, quantity]) => ({
          tierId,
          quantity,
          seatLabels: selectedSeatsByTier[tierId] ?? []
        })),
    [selectedQuantities, selectedSeatsByTier]
  );

  const breakdown = useMemo(
    () =>
      calculatePriceBreakdown({
        tiers: event.tiers,
        selections,
        offers: event.offers,
        offerCode: appliedCode
      }),
    [event.tiers, event.offers, selections, appliedCode]
  );

  function proceedFromQtyGate() {
    if (!targetQty) return;
    setQtyGateDismissed(true);
    const firstAvailable = event.tiers.find((t) => t.remainingQuota >= targetQty);
    if (firstAvailable) {
      setFocusedTierId(firstAvailable.id);
      setSelectedQuantities({
        [firstAvailable.id]: Math.min(targetQty, firstAvailable.maxPerOrder)
      });
    }
  }

  function updateTierQuantity(tierId: string, delta: number, maxAllowed: number) {
    setFocusedTierId(tierId);
    setSelectedQuantities((prev) => {
      const current = prev[tierId] ?? 0;
      const otherTotal = Object.entries(prev)
        .filter(([id]) => id !== tierId)
        .reduce((acc, [, q]) => acc + q, 0);
      const next = Math.max(0, Math.min(maxAllowed, 10 - otherTotal, current + delta));
      return { ...prev, [tierId]: next };
    });
  }

  function handleSelectFromMap(tierId: string) {
    setFocusedTierId(tierId);
    const tier = event.tiers.find((t) => t.id === tierId);
    if (!tier || tier.remainingQuota <= 0) return;
    if ((selectedQuantities[tierId] ?? 0) === 0) {
      updateTierQuantity(tierId, targetQty ?? 1, Math.min(tier.maxPerOrder, tier.remainingQuota));
    }
  }

  function handleToggleSeat(tierId: string, seatLabel: string) {
    const tier = event.tiers.find((t) => t.id === tierId);
    if (!tier || tier.remainingQuota <= 0) return;
    setSelectedSeatsByTier((prev) => {
      const currentSeats = prev[tierId] ?? [];
      const exists = currentSeats.includes(seatLabel);
      const nextSeats = exists
        ? currentSeats.filter((s) => s !== seatLabel)
        : currentSeats.length >= Math.min(tier.maxPerOrder, 10)
        ? currentSeats
        : [...currentSeats, seatLabel];
      setSelectedQuantities((qPrev) => ({
        ...qPrev,
        [tierId]: Math.max(nextSeats.length, exists ? nextSeats.length : 1)
      }));
      return { ...prev, [tierId]: nextSeats };
    });
  }

  async function lockInventoryHold() {
    if (selections.length === 0) return;
    const primary = selections[0];
    setHolding(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventSlug: event.slug,
          tierId: primary.tierId,
          quantity: primary.quantity,
          seatLabels: primary.seatLabels
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Could not lock inventory hold");
      setActiveHold(json.hold);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not hold tickets");
    } finally {
      setHolding(false);
    }
  }

  async function submitDemoReservation(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (selections.length === 0) {
      setSubmitError("Select at least 1 ticket before reserving.");
      return;
    }
    setSubmitting(true);
    setPaymentState("PENDING");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventSlug: event.slug,
          attendeeName,
          attendeeEmail,
          offerCode: breakdown.appliedOfferCode,
          sessionId: selectedSessionId,
          holdId: activeHold?.id ?? null,
          idempotencyKey: simulateOutcome === "CONFIRMED" ? idempotencyKey : undefined,
          simulatePaymentOutcome: simulateOutcome,
          items: selections
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setPaymentState("FAILED");
        throw new Error(json?.error ?? "Reservation failed");
      }
      setPaymentState("CONFIRMED");
      setConfirmedBooking(json.booking);
    } catch (err) {
      setPaymentState("FAILED");
      setSubmitError(err instanceof Error ? err.message : "Could not complete reservation");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmedBooking) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-[#16a34a] bg-white p-6 shadow-sm sm:p-8">
        <span className="inline-block rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-extrabold text-[#16a34a]">
          DEMO RESERVATION CONFIRMED · NO CHARGE
        </span>
        <h2 className="mt-3 text-2xl font-extrabold text-[#111319]">
          Reference: {confirmedBooking.referenceCode}
        </h2>
        <p className="mt-1 text-sm text-[#5e6473]">
          {confirmedBooking.eventTitle} · {confirmedBooking.dateLabel}
        </p>

        <div className="mt-4 space-y-2 rounded-2xl bg-[#f6f7fb] p-4 text-sm">
          {confirmedBooking.items.map((item) => (
            <div key={item.tierId} className="flex justify-between">
              <span>
                {item.quantity} × {item.tierName}
                {item.seatLabels && item.seatLabels.length > 0 ? ` (${item.seatLabels.join(", ")})` : ""}
              </span>
              <span className="font-bold">{formatInr(item.quantity * item.unitPriceInr)}</span>
            </div>
          ))}
          {confirmedBooking.discountInr > 0 ? (
            <div className="flex justify-between text-[#16a34a]">
              <span>Offer ({confirmedBooking.offerCode})</span>
              <span>-{formatInr(confirmedBooking.discountInr)}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-[#5e6473]">
            <span>Convenience fee & GST</span>
            <span>{formatInr(confirmedBooking.convenienceFeeInr + confirmedBooking.gstInr)}</span>
          </div>
          <div className="flex justify-between border-t border-[#e4e6f0] pt-2 text-base font-extrabold">
            <span>Total Demo Value</span>
            <span>{formatInr(confirmedBooking.totalInr)}</span>
          </div>
        </div>

        {confirmedBooking.tickets && confirmedBooking.tickets.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-[#e4e6f0] p-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-[#5b3df5]">
              Issued Digital QR Passes ({confirmedBooking.tickets.length})
            </h3>
            <div className="mt-2 space-y-1.5 text-xs">
              {confirmedBooking.tickets.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f6f7fb] px-3 py-2">
                  <span className="font-mono font-bold text-[#111319]">{t.ticketCode}</span>
                  <span className="text-[#5e6473]">
                    {t.tierName}
                    {t.seatLabel ? ` · Seat ${t.seatLabel}` : ""}
                  </span>
                  <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-bold text-[#16a34a]">
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={`/bookings?email=${encodeURIComponent(confirmedBooking.attendeeEmail)}`}
            className="rounded-xl bg-[#5b3df5] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#4328d6]"
          >
            Open Digital Ticket Wallet
          </Link>
          <Link
            href="/events"
            className="rounded-xl border border-[#e4e6f0] px-5 py-2.5 text-sm font-bold text-[#111319]"
          >
            Browse More Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {event.sessions && event.sessions.length > 0 ? (
        <section className="rounded-2xl border border-[#e4e6f0] bg-white p-4 sm:p-5">
          <h2 className="text-sm font-extrabold text-[#111319]">1. Choose Show / Session</h2>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {event.sessions.map((ses) => (
              <button
                key={ses.id}
                type="button"
                onClick={() => setSelectedSessionId(ses.id)}
                className={`rounded-xl border px-4 py-2.5 text-left text-xs font-bold transition ${
                  selectedSessionId === ses.id
                    ? "border-[#5b3df5] bg-[#efeafe] text-[#5b3df5]"
                    : "border-[#e4e6f0] bg-[#f6f7fb] text-[#111319]"
                }`}
              >
                <div>{ses.label}</div>
                <div className="mt-0.5 text-[10px] font-semibold opacity-75">
                  {ses.status.replace("_", " ")}
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!qtyGateDismissed ? (
        <div
          role="region"
          aria-label="Select initial ticket count"
          className="rounded-3xl border border-[#e4e6f0] bg-white p-5 shadow-sm sm:p-6"
        >
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#5b3df5]">
            Before you go!
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-[#111319]">Select number of tickets</h2>
          <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-10">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setTargetQty(num)}
                className={`rounded-xl border py-3 text-sm font-extrabold transition ${
                  targetQty === num
                    ? "border-[#5b3df5] bg-[#5b3df5] text-white"
                    : "border-[#e4e6f0] bg-white text-[#111319] hover:border-[#5b3df5]"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setQtyGateDismissed(true)}
              className="text-xs font-bold text-[#5e6473] underline"
            >
              Skip & pick tiers manually
            </button>
            <button
              type="button"
              disabled={!targetQty}
              onClick={proceedFromQtyGate}
              className="rounded-xl bg-[#111319] px-6 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#d1d5db]"
            >
              Proceed
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          {venue ? (
            <VenueSectionMap
              sections={venue.sections}
              tiers={event.tiers}
              selectedTierId={focusedTierId}
              selectedSeats={focusedTierId ? selectedSeatsByTier[focusedTierId] ?? [] : []}
              onSelectTier={handleSelectFromMap}
              onToggleSeat={handleToggleSeat}
            />
          ) : null}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-extrabold text-[#111319]">Ticket Tiers & Sections</h2>
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setTierSort("price_asc")}
                  className={`rounded-full border px-3 py-1 font-bold ${
                    tierSort === "price_asc"
                      ? "border-[#5b3df5] bg-[#efeafe] text-[#5b3df5]"
                      : "border-[#e4e6f0] bg-white"
                  }`}
                >
                  Lowest Price
                </button>
                <button
                  type="button"
                  onClick={() => setTierSort("price_desc")}
                  className={`rounded-full border px-3 py-1 font-bold ${
                    tierSort === "price_desc"
                      ? "border-[#5b3df5] bg-[#efeafe] text-[#5b3df5]"
                      : "border-[#e4e6f0] bg-white"
                  }`}
                >
                  Highest Price
                </button>
              </div>
            </div>

            {sortedTiers.map((tier) => {
              const avail = getTierAvailability(tier);
              const qty = selectedQuantities[tier.id] ?? 0;
              const maxAllowed = Math.min(tier.maxPerOrder, tier.remainingQuota);

              return (
                <div
                  key={tier.id}
                  className={`rounded-2xl border bg-white p-4 transition ${
                    focusedTierId === tier.id ? "border-[#5b3df5] shadow-sm" : "border-[#e4e6f0]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-extrabold text-[#111319] sm:text-base">
                          {tier.name}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            avail === "SOLD_OUT"
                              ? "bg-[#fee2e2] text-[#dc2626]"
                              : avail === "NEARLY_SOLD"
                              ? "bg-[#fef3c7] text-[#d97706]"
                              : "bg-[#dcfce7] text-[#16a34a]"
                          }`}
                        >
                          {avail === "SOLD_OUT"
                            ? "Sold out"
                            : avail === "NEARLY_SOLD"
                            ? `Nearly sold (${tier.remainingQuota} left)`
                            : "Available"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#5e6473]">{tier.description}</p>
                      <p className="mt-2 text-base font-extrabold text-[#111319]">
                        {formatInr(tier.priceInr)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {avail === "SOLD_OUT" ? (
                        <span className="rounded-xl bg-[#f6f7fb] px-3 py-2 text-xs font-bold text-[#5e6473]">
                          Unavailable
                        </span>
                      ) : (
                        <div className="flex items-center gap-2 rounded-xl border border-[#e4e6f0] bg-[#f6f7fb] p-1">
                          <button
                            type="button"
                            aria-label={`Decrease ${tier.name}`}
                            onClick={() => updateTierQuantity(tier.id, -1, maxAllowed)}
                            disabled={qty <= 0}
                            className="h-9 w-9 rounded-lg bg-white text-sm font-bold disabled:opacity-40"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-extrabold">{qty}</span>
                          <button
                            type="button"
                            aria-label={`Increase ${tier.name}`}
                            onClick={() => updateTierQuantity(tier.id, 1, maxAllowed)}
                            disabled={qty >= maxAllowed || breakdown.totalQuantity >= 10}
                            className="h-9 w-9 rounded-lg bg-white text-sm font-bold disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="space-y-4 lg:col-span-5">
          {activeHold ? (
            <div className="rounded-2xl border border-[#16a34a] bg-[#dcfce7] p-4 text-xs text-[#111319]">
              <div className="flex items-center justify-between font-extrabold text-[#16a34a]">
                <span>INVENTORY HOLD ACTIVE</span>
                <span>
                  {Math.floor(holdSecondsLeft / 60)}:{String(holdSecondsLeft % 60).padStart(2, "0")}
                </span>
              </div>
              <p className="mt-1 text-[#374151]">
                {activeHold.quantity} ticket(s) locked server-side ({activeHold.id}). Complete checkout before timer expires.
              </p>
            </div>
          ) : selections.length > 0 ? (
            <button
              type="button"
              disabled={holding}
              onClick={() => void lockInventoryHold()}
              className="w-full rounded-2xl border border-[#5b3df5] bg-[#efeafe] px-4 py-2.5 text-xs font-extrabold text-[#5b3df5] hover:bg-[#e4dbff]"
            >
              {holding ? "Locking 10-min Hold..." : "Lock Tickets with 10-Minute Inventory Hold"}
            </button>
          ) : null}

          <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
            <h2 className="text-base font-extrabold text-[#111319]">Offers & Promo Codes</h2>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder="Enter promo code"
                aria-label="Promo code"
                className="min-w-0 flex-1 rounded-xl border border-[#e4e6f0] px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => setAppliedCode(promoInput.trim() || null)}
                className="rounded-xl bg-[#111319] px-4 py-2 text-sm font-bold text-white"
              >
                Apply
              </button>
            </div>

            {breakdown.offerRejectionReason ? (
              <p className="mt-2 text-xs font-semibold text-[#dc2626]">
                {breakdown.offerRejectionReason}
              </p>
            ) : null}

            <div className="mt-3 space-y-2">
              {event.offers.map((offer) => (
                <button
                  key={offer.id}
                  type="button"
                  onClick={() => {
                    setPromoInput(offer.code);
                    setAppliedCode(offer.code);
                  }}
                  className={`w-full rounded-xl border p-3 text-left text-xs transition ${
                    breakdown.appliedOfferCode === offer.code
                      ? "border-[#5b3df5] bg-[#efeafe]"
                      : "border-[#e4e6f0] hover:border-[#5b3df5]"
                  }`}
                >
                  <div className="flex items-center justify-between font-extrabold text-[#111319]">
                    <span>{offer.title}</span>
                    <span className="rounded bg-white px-2 py-0.5 text-[11px] text-[#5b3df5]">
                      {offer.code}
                    </span>
                  </div>
                  <p className="mt-1 text-[#5e6473]">{offer.description}</p>
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={submitDemoReservation}
            className="space-y-4 rounded-2xl border border-[#e4e6f0] bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-[#111319]">Booking Summary</h2>
              {paymentState ? (
                <span className="rounded-full bg-[#efeafe] px-2.5 py-0.5 text-[10px] font-bold text-[#5b3df5]">
                  {paymentState}
                </span>
              ) : null}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#5e6473]">Tickets ({breakdown.totalQuantity})</span>
                <span className="font-bold">{formatInr(breakdown.subtotalInr)}</span>
              </div>
              {breakdown.discountInr > 0 ? (
                <div className="flex justify-between text-[#16a34a]">
                  <span>Offer ({breakdown.appliedOfferCode})</span>
                  <span>-{formatInr(breakdown.discountInr)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-[#5e6473]">
                <span>Platform fee (6%)</span>
                <span>{formatInr(breakdown.convenienceFeeInr)}</span>
              </div>
              <div className="flex justify-between text-[#5e6473]">
                <span>GST (18% on fee)</span>
                <span>{formatInr(breakdown.gstInr)}</span>
              </div>
              <div className="flex justify-between border-t border-[#e4e6f0] pt-2 text-base font-extrabold">
                <span>Total</span>
                <span>{formatInr(breakdown.totalInr)}</span>
              </div>
            </div>

            {event.partialReservePercent ? (
              <div className="rounded-xl bg-[#f3e8ff] px-3 py-2 text-xs font-bold text-[#7c3aed]">
                Partial demo reserve available: {event.partialReservePercent}% upfront option noted
              </div>
            ) : null}

            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-[#5e6473]">
                Attendee Name
                <input
                  type="text"
                  required
                  value={attendeeName}
                  onChange={(e) => setAttendeeName(e.target.value)}
                  placeholder="Asha Rao"
                  className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-sm text-[#111319]"
                />
              </label>
              <label className="block text-xs font-bold text-[#5e6473]">
                Attendee Email
                <input
                  type="email"
                  required
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  placeholder="asha@example.com"
                  className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-sm text-[#111319]"
                />
              </label>
              <label className="block text-xs font-bold text-[#5e6473]">
                Sandbox Payment Adapter Mode
                <select
                  value={simulateOutcome}
                  onChange={(e) => setSimulateOutcome(e.target.value as "CONFIRMED" | "FAILED")}
                  className="mt-1 w-full rounded-xl border border-[#e4e6f0] bg-white px-3 py-2 text-xs font-semibold text-[#111319]"
                >
                  <option value="CONFIRMED">Approve Sandbox Payment (No Real Charge)</option>
                  <option value="FAILED">Simulate Payment Decline (Test Error Handling)</option>
                </select>
              </label>
            </div>

            {submitError ? (
              <p className="text-xs font-bold text-[#dc2626]">{submitError}</p>
            ) : null}

            <button
              type="submit"
              disabled={submitting || breakdown.totalQuantity === 0}
              className="w-full rounded-xl bg-[#5b3df5] py-3.5 text-sm font-extrabold text-white transition hover:bg-[#4328d6] disabled:cursor-not-allowed disabled:bg-[#cbd5e1]"
            >
              {submitting ? "Authorizing Demo Pass..." : "Confirm Demo Reservation (No Charge)"}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
