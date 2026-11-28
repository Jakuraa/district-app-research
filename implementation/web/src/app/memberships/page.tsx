"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { formatInr, SEED_CITIES, type MembershipPlan, type MembershipRecord } from "@nightlifez/shared";
import { AppHeader } from "@/components/AppHeader";

export default function MembershipsPage() {
  const [plans, setPlans] = useState<Omit<MembershipPlan, "privateInviteUrl">[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Omit<MembershipPlan, "privateInviteUrl"> | null>(null);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [result, setResult] = useState<{
    membership: MembershipRecord;
    upiUri: string | null;
    payeeName: string | null;
    upiId: string | null;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [upiTxRef, setUpiTxRef] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  // Lookup gated invite link
  const [lookupRef, setLookupRef] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupResult, setLookupResult] = useState<MembershipRecord | null>(null);

  useEffect(() => {
    fetch("/api/memberships")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!result?.upiUri) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(result.upiUri, { width: 220, margin: 1 }).then(setQrDataUrl).catch(() => {});
  }, [result?.upiUri]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlan) return;
    setMsg(null);
    const res = await fetch("/api/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: selectedPlan.id, memberName, memberEmail, memberPhone })
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg(json?.error ?? "Could not create membership request");
      return;
    }
    setResult(json);
  }

  async function handleSubmitUtr(e: React.FormEvent) {
    e.preventDefault();
    if (!result) return;
    const res = await fetch("/api/memberships", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenceCode: result.membership.referenceCode, upiTxRef })
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg(json?.error ?? "Could not submit UTR");
      return;
    }
    setResult({ ...result, membership: json.membership });
    setMsg("UTR submitted! Your private invite link unlocks once the organiser verifies payment.");
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(
      `/api/memberships?referenceCode=${encodeURIComponent(lookupRef)}&email=${encodeURIComponent(lookupEmail)}`
    );
    const json = await res.json();
    setLookupResult(json.membership ?? null);
  }

  return (
    <div className="min-h-screen pb-14">
      <AppHeader cities={SEED_CITIES} />
      <main className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-6">
        <div>
          <span className="inline-block rounded-full bg-[#efeafe] px-3 py-1 text-[11px] font-bold text-[#5b3df5]">
            Organiser Clubs &amp; Inner Circles
          </span>
          <h1 className="mt-1 text-2xl font-extrabold text-[#111319] sm:text-3xl">
            Memberships &amp; Private Communities
          </h1>
          <p className="mt-1 text-sm text-[#5e6473]">
            Join organiser-run memberships via Direct UPI to unlock private event drops and gated community invite links.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#e4e6f0] bg-white p-8 text-sm text-[#5e6473]">Loading membership plans...</div>
        ) : plans.length === 0 ? (
          <div className="rounded-2xl border border-[#e4e6f0] bg-white p-8 text-center">
            <h2 className="text-base font-extrabold text-[#111319]">No active membership plans yet</h2>
            <p className="mt-1 text-xs text-[#5e6473]">Organisers can create membership plans from the Organiser Console.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => (
              <div key={p.id} className="flex flex-col justify-between rounded-2xl border border-[#e4e6f0] bg-white p-5">
                <div>
                  <div className="text-[11px] font-bold text-[#5b3df5]">{p.organizationName ?? "Verified Club"} · {p.durationDays} days</div>
                  <h2 className="mt-1 text-lg font-extrabold text-[#111319]">{p.name}</h2>
                  <p className="mt-1 text-xs text-[#5e6473]">{p.description}</p>
                  <ul className="mt-3 space-y-1 text-xs text-[#374151]">
                    {p.perks.map((perk, idx) => (
                      <li key={idx}>• {perk}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[#e4e6f0] pt-3">
                  <div className="text-base font-extrabold text-[#111319]">{formatInr(p.priceInr)}</div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlan(p);
                      setResult(null);
                      setMsg(null);
                    }}
                    className="rounded-xl bg-[#5b3df5] px-4 py-2 text-xs font-bold text-white"
                  >
                    Join Plan
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedPlan ? (
          <section className="rounded-3xl border border-[#5b3df5] bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#111319]">Join: {selectedPlan.name}</h2>
              <button type="button" onClick={() => setSelectedPlan(null)} className="text-xs font-bold text-[#5e6473]">Close</button>
            </div>
            {msg ? <div className="mt-3 rounded-xl bg-[#efeafe] px-3 py-2 text-xs font-bold text-[#5b3df5]">{msg}</div> : null}

            {!result ? (
              <form onSubmit={handleJoin} className="mt-4 grid gap-3 sm:grid-cols-2">
                <input type="text" required value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Full Name" className="rounded-xl border border-[#e4e6f0] px-3 py-2.5 text-sm" />
                <input type="email" required value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="Email" className="rounded-xl border border-[#e4e6f0] px-3 py-2.5 text-sm" />
                <input type="tel" required value={memberPhone} onChange={(e) => setMemberPhone(e.target.value)} placeholder="Phone (+91...)" className="rounded-xl border border-[#e4e6f0] px-3 py-2.5 text-sm" />
                <button type="submit" className="rounded-xl bg-[#5b3df5] py-2.5 text-sm font-extrabold text-white">
                  Continue to Direct UPI ({formatInr(selectedPlan.priceInr)})
                </button>
              </form>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-[#f6f7fb] p-4 text-xs">
                  <div className="font-extrabold text-[#111319]">Membership Ref: {result.membership.referenceCode}</div>
                  <div>Status: {result.membership.status}</div>
                </div>
                {result.upiUri && qrDataUrl ? (
                  <div className="flex flex-wrap items-center gap-4">
                    <img src={qrDataUrl} alt="Organiser UPI QR" className="h-44 w-44 rounded-xl border border-[#e4e6f0] p-2" />
                    <form onSubmit={handleSubmitUtr} className="flex-1 space-y-2">
                      <div className="text-xs font-bold">Pay {result.payeeName} ({result.upiId})</div>
                      <a href={result.upiUri} className="inline-block rounded-xl bg-[#111319] px-4 py-2 text-xs font-bold text-white">Open UPI App</a>
                      <input type="text" required value={upiTxRef} onChange={(e) => setUpiTxRef(e.target.value)} placeholder="Enter 12-digit UTR / Reference" className="w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-sm" />
                      <button type="submit" className="rounded-xl bg-[#16a34a] px-4 py-2 text-xs font-bold text-white">Submit UTR</button>
                    </form>
                  </div>
                ) : (
                  <p className="text-xs text-[#d97706]">Organiser Direct UPI is not yet configured for this brand.</p>
                )}
              </div>
            )}
          </section>
        ) : null}

        <section className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
          <h2 className="text-base font-extrabold text-[#111319]">Access Gated Private Invite Link</h2>
          <p className="mt-1 text-xs text-[#5e6473]">Enter your membership reference and email to check active status and unlock your private invite link.</p>
          <form onSubmit={handleLookup} className="mt-3 flex flex-wrap gap-2">
            <input type="text" required value={lookupRef} onChange={(e) => setLookupRef(e.target.value)} placeholder="Reference (e.g. MEM-XXXXXX)" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
            <input type="email" required value={lookupEmail} onChange={(e) => setLookupEmail(e.target.value)} placeholder="Member Email" className="flex-1 rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
            <button type="submit" className="rounded-xl bg-[#111319] px-4 py-2 text-xs font-bold text-white">Check Status</button>
          </form>
          {lookupResult ? (
            <div className="mt-3 rounded-xl bg-[#f6f7fb] p-3 text-xs">
              <div className="font-bold">{lookupResult.planName} · Status: {lookupResult.status}</div>
              {lookupResult.privateInviteUrl ? (
                <a href={lookupResult.privateInviteUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block font-extrabold text-[#5b3df5] underline">
                  Open Private Invite Link ↗
                </a>
              ) : (
                <div className="mt-1 text-[#5e6473]">Private invite link is locked until your membership is ACTIVE.</div>
              )}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
