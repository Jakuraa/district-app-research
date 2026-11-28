"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatInr,
  SEED_CITIES,
  type MembershipPlan,
  type MembershipRecord,
  type Organization,
  type Promoter,
  type PromoterPayout,
  type TripBookingRecord,
  type TripListing
} from "@nightlifez/shared";

interface PanelProps {
  org: Organization;
  onUpdated: (msg: string) => Promise<void>;
}

export function OrganiserPromotersPanel({ org, onUpdated }: PanelProps) {
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [payouts, setPayouts] = useState<PromoterPayout[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");
  const [payoutTarget, setPayoutTarget] = useState<string | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutRef, setPayoutRef] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/organiser/promoters?organizationId=${encodeURIComponent(org.id)}`);
    if (res.ok) {
      const data = await res.json();
      setPromoters(data.promoters ?? []);
      setPayouts(data.payouts ?? []);
    }
  }, [org.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/organiser/promoters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: org.id,
        name,
        email,
        referralCode: code,
        commissionPercent: Number(percent)
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error ?? "Could not add promoter");
      return;
    }
    setName("");
    setEmail("");
    setCode("");
    await load();
    await onUpdated(`Promoter ${json.promoter.referralCode} added.`);
  }

  async function handlePayout(promoterId: string) {
    setError(null);
    const res = await fetch("/api/organiser/promoters", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: org.id,
        promoterId,
        amountInr: Number(payoutAmount),
        paymentRef: payoutRef
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error ?? "Could not record payout");
      return;
    }
    setPayoutTarget(null);
    setPayoutAmount("");
    setPayoutRef("");
    await load();
    await onUpdated("Promoter commission payout recorded.");
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
        <h2 className="text-base font-extrabold text-[#111319]">Promoters &amp; Referral Commissions</h2>
        <p className="mt-1 text-xs text-[#5e6473]">
          Share referral links (<code className="rounded bg-[#f6f7fb] px-1">?ref=CODE</code>). Commissions are tracked automatically and settled directly by your team.
        </p>
        {error ? <p className="mt-2 text-xs font-bold text-[#dc2626]">{error}</p> : null}
        <form onSubmit={handleCreate} className="mt-3 grid gap-2.5 sm:grid-cols-5">
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Promoter name" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
          <input type="text" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Code (e.g. ARJUN10)" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
          <input type="number" required min={0} max={100} value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="Commission %" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
          <button type="submit" className="rounded-xl bg-[#5b3df5] px-4 py-2 text-xs font-bold text-white">Add Promoter</button>
        </form>
      </div>

      <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
        <h3 className="text-sm font-extrabold text-[#111319]">Active Promoters ({promoters.length})</h3>
        <div className="mt-3 space-y-2 text-xs">
          {promoters.length === 0 ? (
            <p className="text-[#5e6473]">No promoters yet.</p>
          ) : (
            promoters.map((p) => {
              const due = Math.max(0, (p.earnedCommissionInr ?? 0) - (p.paidCommissionInr ?? 0));
              return (
                <div key={p.id} className="rounded-xl bg-[#f6f7fb] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-extrabold text-[#111319]">{p.name}</span> ·{" "}
                      <code className="rounded bg-white px-1.5 py-0.5 font-bold text-[#5b3df5]">{p.referralCode}</code> ·{" "}
                      <span>{p.commissionPercent}%</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span>{p.referredBookings ?? 0} orders ({formatInr(p.referredRevenueInr ?? 0)})</span>
                      <span className="font-bold text-[#16a34a]">Earned: {formatInr(p.earnedCommissionInr ?? 0)}</span>
                      <span className="font-bold text-[#d97706]">Due: {formatInr(due)}</span>
                      <button
                        type="button"
                        onClick={() => setPayoutTarget(payoutTarget === p.id ? null : p.id)}
                        className="rounded-lg bg-[#111319] px-2.5 py-1 font-bold text-white"
                      >
                        Record Payout
                      </button>
                    </div>
                  </div>
                  {payoutTarget === p.id ? (
                    <div className="mt-2 flex flex-wrap gap-2 border-t border-[#e4e6f0] pt-2">
                      <input type="number" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} placeholder="Amount INR" className="rounded-lg border border-[#e4e6f0] bg-white px-2.5 py-1 text-xs" />
                      <input type="text" value={payoutRef} onChange={(e) => setPayoutRef(e.target.value)} placeholder="UPI / Bank Ref" className="flex-1 rounded-lg border border-[#e4e6f0] bg-white px-2.5 py-1 text-xs" />
                      <button type="button" onClick={() => void handlePayout(p.id)} className="rounded-lg bg-[#16a34a] px-3 py-1 font-bold text-white">Save Payout</button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
        {payouts.length > 0 ? (
          <div className="mt-4 border-t border-[#e4e6f0] pt-3 text-xs">
            <div className="font-bold text-[#5e6473]">Recent Commission Payouts ({payouts.length})</div>
            <div className="mt-1.5 space-y-1">
              {payouts.slice(0, 8).map((pay) => (
                <div key={pay.id} className="flex justify-between text-[#111319]">
                  <span>Ref: {pay.paymentRef}</span>
                  <span className="font-bold">{formatInr(pay.amountInr)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function OrganiserTripsPanel({ org, onUpdated }: PanelProps) {
  const [trips, setTrips] = useState<TripListing[]>([]);
  const [bookings, setBookings] = useState<TripBookingRecord[]>([]);
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [citySlug, setCitySlug] = useState("bengaluru");
  const [departureLabel, setDepartureLabel] = useState("Fri, 18 Dec · 9:00 PM");
  const [returnLabel, setReturnLabel] = useState("Sun, 20 Dec · 8:00 PM");
  const [priceInr, setPriceInr] = useState("4999");
  const [advanceInr, setAdvanceInr] = useState("1500");
  const [totalSeats, setTotalSeats] = useState("30");
  const [pickupText, setPickupText] = useState("Indiranagar Metro (9:00 PM), Koramangala Sony Signal (9:30 PM)");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/organiser/trips?organizationId=${encodeURIComponent(org.id)}`);
    if (res.ok) {
      const data = await res.json();
      setTrips(data.trips ?? []);
      setBookings(data.bookings ?? []);
    }
  }, [org.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreateTrip(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const pickupPoints = pickupText
      .split(",")
      .map((item, idx) => {
        const clean = item.trim();
        return {
          id: `pk_${idx + 1}`,
          label: clean,
          timeLabel: departureLabel.split("·")[1]?.trim() || "9:00 PM",
          address: clean
        };
      })
      .filter((p) => p.label.length > 0);

    const res = await fetch("/api/organiser/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: org.id,
        title,
        destination,
        citySlug,
        departureLabel,
        returnLabel,
        priceInr: Number(priceInr),
        advanceInr: Number(advanceInr),
        totalSeats: Number(totalSeats),
        pickupPoints,
        summary
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error ?? "Could not create trip");
      return;
    }
    setTitle("");
    setDestination("");
    setSummary("");
    await load();
    await onUpdated(`Trip "${json.trip.title}" published.`);
  }

  async function handleAction(
    bookingId: string,
    action: "APPROVE_TRAVELLER" | "REJECT_TRAVELLER" | "VERIFY_ADVANCE" | "REJECT_ADVANCE" | "MARK_BOARDED" | "COLLECT_BALANCE"
  ) {
    const res = await fetch("/api/organiser/trips", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: org.id, bookingId, action })
    });
    if (res.ok) {
      await load();
      await onUpdated(`Trip booking updated (${action}).`);
    }
  }

  return (
    <section className="space-y-4">
      <form onSubmit={handleCreateTrip} className="space-y-3 rounded-2xl border border-[#e4e6f0] bg-white p-5">
        <h2 className="text-base font-extrabold text-[#111319]">Create Group Trip &amp; Pickup Manifest</h2>
        {error ? <p className="text-xs font-bold text-[#dc2626]">{error}</p> : null}
        <div className="grid gap-2.5 sm:grid-cols-3">
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Trip title (e.g. Gokarna Beach Weekend)" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
          <input type="text" required value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
          <select value={citySlug} onChange={(e) => setCitySlug(e.target.value)} className="rounded-xl border border-[#e4e6f0] bg-white px-3 py-2 text-xs font-bold">
            {SEED_CITIES.map((c) => (
              <option key={c.slug} value={c.slug}>Departs: {c.name}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-5">
          <input type="text" required value={departureLabel} onChange={(e) => setDepartureLabel(e.target.value)} placeholder="Departure" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
          <input type="text" required value={returnLabel} onChange={(e) => setReturnLabel(e.target.value)} placeholder="Return" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
          <input type="number" required value={priceInr} onChange={(e) => setPriceInr(e.target.value)} placeholder="Total ₹" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
          <input type="number" required value={advanceInr} onChange={(e) => setAdvanceInr(e.target.value)} placeholder="Advance UPI ₹" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
          <input type="number" required value={totalSeats} onChange={(e) => setTotalSeats(e.target.value)} placeholder="Seats" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
        </div>
        <input type="text" required value={pickupText} onChange={(e) => setPickupText(e.target.value)} placeholder="Pickup points (comma-separated)" className="w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
        <textarea required rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Itinerary & inclusions summary" className="w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
        <button type="submit" className="rounded-xl bg-[#5b3df5] px-5 py-2 text-xs font-extrabold text-white">Publish Trip</button>
      </form>

      <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
        <h3 className="text-sm font-extrabold text-[#111319]">Trips ({trips.length}) &amp; Boarding Manifest ({bookings.length} travellers)</h3>
        <div className="mt-3 space-y-2 text-xs">
          {bookings.length === 0 ? (
            <p className="text-[#5e6473]">No traveller requests yet.</p>
          ) : (
            bookings.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f6f7fb] p-3">
                <div>
                  <div className="font-extrabold text-[#111319]">
                    {b.referenceCode} · {b.travellerName} ({b.seats} seats)
                  </div>
                  <div className="text-[#5e6473]">
                    {b.tripTitle ?? b.tripId} · Pickup: {b.pickupPointLabel} · UTR: {b.upiTxRef ?? "—"}
                  </div>
                  <div className="mt-0.5 font-semibold">
                    Paid: {formatInr(b.paidInr)} · Balance: <span className={b.balanceInr > 0 ? "text-[#d97706]" : "text-[#16a34a]"}>{formatInr(b.balanceInr)}</span> · {b.paymentStatus} · {b.boarded ? "BOARDED" : "NOT BOARDED"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {b.paymentStatus === "AWAITING_VERIFICATION" ? (
                    <button type="button" onClick={() => void handleAction(b.id, "VERIFY_ADVANCE")} className="rounded-lg bg-[#16a34a] px-2.5 py-1 font-bold text-white">Verify Advance</button>
                  ) : null}
                  {b.approvalStatus === "PENDING_APPROVAL" ? (
                    <button type="button" onClick={() => void handleAction(b.id, "REJECT_TRAVELLER")} className="rounded-lg bg-[#dc2626] px-2.5 py-1 font-bold text-white">Reject</button>
                  ) : null}
                  {b.balanceInr > 0 ? (
                    <button type="button" onClick={() => void handleAction(b.id, "COLLECT_BALANCE")} className="rounded-lg bg-[#5b3df5] px-2.5 py-1 font-bold text-white">Collect Balance</button>
                  ) : null}
                  {!b.boarded && b.approvalStatus === "APPROVED" ? (
                    <button type="button" onClick={() => void handleAction(b.id, "MARK_BOARDED")} className="rounded-lg bg-[#111319] px-2.5 py-1 font-bold text-white">Mark Boarded</button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export function OrganiserMembershipsPanel({ org, onUpdated }: PanelProps) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [members, setMembers] = useState<MembershipRecord[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceInr, setPriceInr] = useState("1999");
  const [durationDays, setDurationDays] = useState("90");
  const [perksText, setPerksText] = useState("Priority entry, Member-only drops, Private WhatsApp group");
  const [inviteUrl, setInviteUrl] = useState("https://chat.whatsapp.com/nightlifez-vip-circle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/organiser/memberships?organizationId=${encodeURIComponent(org.id)}`);
    if (res.ok) {
      const data = await res.json();
      setPlans(data.plans ?? []);
      setMembers(data.members ?? []);
    }
  }, [org.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/organiser/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: org.id,
        name,
        description,
        priceInr: Number(priceInr),
        durationDays: Number(durationDays),
        perks: perksText.split(",").map((s) => s.trim()).filter(Boolean),
        privateInviteUrl: inviteUrl
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error ?? "Could not create plan");
      return;
    }
    setName("");
    setDescription("");
    await load();
    await onUpdated(`Membership plan "${json.plan.name}" created.`);
  }

  async function handleMemberAction(membershipId: string, action: "ACTIVATE" | "REJECT" | "SEND_REMINDER" | "EXPIRE") {
    const res = await fetch("/api/organiser/memberships", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: org.id, membershipId, action })
    });
    if (res.ok) {
      await load();
      await onUpdated(`Membership updated (${action}).`);
    }
  }

  return (
    <section className="space-y-4">
      <form onSubmit={handleCreatePlan} className="space-y-3 rounded-2xl border border-[#e4e6f0] bg-white p-5">
        <h2 className="text-base font-extrabold text-[#111319]">Create Membership Plan &amp; Gated Invite Link</h2>
        {error ? <p className="text-xs font-bold text-[#dc2626]">{error}</p> : null}
        <div className="grid gap-2.5 sm:grid-cols-3">
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Plan name (e.g. Inner Circle)" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
          <input type="number" required value={priceInr} onChange={(e) => setPriceInr(e.target.value)} placeholder="Price INR" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
          <input type="number" required value={durationDays} onChange={(e) => setDurationDays(e.target.value)} placeholder="Duration (days)" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
        </div>
        <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Plan description" className="w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
        <div className="grid gap-2.5 sm:grid-cols-2">
          <input type="text" required value={perksText} onChange={(e) => setPerksText(e.target.value)} placeholder="Perks (comma-separated)" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
          <input type="url" required value={inviteUrl} onChange={(e) => setInviteUrl(e.target.value)} placeholder="Gated private invite URL (unlocked only when active)" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
        </div>
        <button type="submit" className="rounded-xl bg-[#5b3df5] px-5 py-2 text-xs font-extrabold text-white">Create Membership Plan</button>
      </form>

      <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
        <h3 className="text-sm font-extrabold text-[#111319]">Plans ({plans.length}) &amp; Members ({members.length})</h3>
        <div className="mt-3 space-y-2 text-xs">
          {members.length === 0 ? (
            <p className="text-[#5e6473]">No membership requests yet.</p>
          ) : (
            members.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f6f7fb] p-3">
                <div>
                  <div className="font-extrabold text-[#111319]">{m.referenceCode} · {m.memberName} ({m.memberEmail})</div>
                  <div className="text-[#5e6473]">
                    {m.planName ?? m.planId} · Status: <span className="font-bold">{m.status}</span> · UTR: {m.upiTxRef ?? "—"}
                    {m.expiresAt ? ` · Expires: ${new Date(m.expiresAt).toLocaleDateString("en-IN")}` : ""}
                    {m.reminderSentAt ? " · Reminder Sent" : ""}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {m.status === "AWAITING_VERIFICATION" || m.status === "PENDING_PAYMENT" ? (
                    <>
                      <button type="button" onClick={() => void handleMemberAction(m.id, "ACTIVATE")} className="rounded-lg bg-[#16a34a] px-2.5 py-1 font-bold text-white">Verify &amp; Activate</button>
                      <button type="button" onClick={() => void handleMemberAction(m.id, "REJECT")} className="rounded-lg bg-[#dc2626] px-2.5 py-1 font-bold text-white">Reject</button>
                    </>
                  ) : null}
                  {m.status === "ACTIVE" ? (
                    <>
                      <button type="button" onClick={() => void handleMemberAction(m.id, "SEND_REMINDER")} className="rounded-lg bg-[#5b3df5] px-2.5 py-1 font-bold text-white">Send Renewal Reminder</button>
                      <button type="button" onClick={() => void handleMemberAction(m.id, "EXPIRE")} className="rounded-lg border border-[#dc2626] px-2.5 py-1 font-bold text-[#dc2626]">Expire</button>
                    </>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
