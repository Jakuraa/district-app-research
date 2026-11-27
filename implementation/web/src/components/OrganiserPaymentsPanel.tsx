"use client";

import { useCallback, useEffect, useState } from "react";
import { formatInr, type BookingRecord, type Organization } from "@nightlifez/shared";

interface OrganiserPaymentsPanelProps {
  org: Organization;
  onUpdated: (msg: string) => Promise<void>;
}

export function OrganiserPaymentsPanel({ org, onUpdated }: OrganiserPaymentsPanelProps) {
  const [upiEnabled, setUpiEnabled] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [payeeDisplayName, setPayeeDisplayName] = useState(org.name);
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [payments, setPayments] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profRes, listRes] = await Promise.all([
        fetch(`/api/organiser/organizations/${encodeURIComponent(org.id)}/payment-profile`),
        fetch(`/api/organiser/payments?organizationId=${encodeURIComponent(org.id)}`)
      ]);
      const profJson = await profRes.json();
      if (profRes.ok && profJson.profile) {
        setUpiEnabled(Boolean(profJson.profile.upiEnabled));
        setUpiId(profJson.profile.upiId ?? "");
        setPayeeDisplayName(profJson.profile.payeeDisplayName ?? org.name);
        setPaymentInstructions(profJson.profile.paymentInstructions ?? "");
      } else if (!profRes.ok) {
        setError(profJson?.error ?? "Unable to load payment settings");
      }

      const listJson = await listRes.json();
      if (listRes.ok) {
        setPayments(listJson.payments ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [org.id, org.name]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/organiser/organizations/${encodeURIComponent(org.id)}/payment-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upiEnabled,
          upiId: upiId.trim() || null,
          payeeDisplayName: payeeDisplayName.trim() || null,
          paymentInstructions: paymentInstructions.trim() || null
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Could not save payment settings");
        return;
      }
      await onUpdated("Organiser Direct UPI settings saved.");
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleVerify(booking: BookingRecord, decision: "APPROVE" | "REJECT") {
    setError(null);
    const res = await fetch(`/api/organiser/payments/${encodeURIComponent(booking.id)}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        expectedAmountInr: booking.totalInr,
        reason: decision === "REJECT" ? "Credit not found in organiser UPI app" : undefined
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error ?? "Verification failed");
      return;
    }
    await loadData();
    await onUpdated(
      decision === "APPROVE"
        ? `Payment verified for ${booking.referenceCode}. QR passes issued.`
        : `Payment rejected for ${booking.referenceCode}. Inventory released.`
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-[#111319]">
              Direct-to-Organiser UPI Settings ({org.name})
            </h2>
            <p className="mt-1 text-xs text-[#5e6473]">
              Attendees pay your UPI ID directly. NIGHTLIFEZ never collects, holds, or pools your funds. Live gateway collection remains disabled.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${
              upiEnabled ? "bg-[#dcfce7] text-[#059669]" : "bg-[#f6f7fb] text-[#5e6473]"
            }`}
          >
            {upiEnabled ? "Direct UPI Enabled" : "Sandbox Only"}
          </span>
        </div>

        {error ? (
          <p className="mt-3 rounded-xl bg-[#fee2e2] px-3 py-2 text-xs font-bold text-[#dc2626]">{error}</p>
        ) : null}

        <form onSubmit={handleSaveSettings} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-xs font-bold text-[#111319] sm:col-span-2">
            <input
              type="checkbox"
              checked={upiEnabled}
              onChange={(e) => setUpiEnabled(e.target.checked)}
            />
            Enable Direct UPI Payments at Checkout
          </label>
          <label className="block text-xs font-bold text-[#5e6473]">
            UPI ID (VPA)
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="organiser@okicici"
              className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs text-[#111319]"
            />
          </label>
          <label className="block text-xs font-bold text-[#5e6473]">
            Payee Display Name
            <input
              type="text"
              value={payeeDisplayName}
              onChange={(e) => setPayeeDisplayName(e.target.value)}
              placeholder={org.name}
              className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs text-[#111319]"
            />
          </label>
          <label className="block text-xs font-bold text-[#5e6473] sm:col-span-2">
            Payment Instructions for Attendees
            <textarea
              rows={2}
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              placeholder="Include your booking reference in the UPI note. Passes issue after we verify receipt."
              className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs text-[#111319]"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#5b3df5] px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Payment Settings"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-[#111319]">
              UPI Payment Verification Queue ({payments.length})
            </h2>
            <p className="text-xs text-[#5e6473]">
              Verify the incoming credit in your own UPI or banking app before tapping Approve. Attendee-submitted references are not proof of payment.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-lg border border-[#e4e6f0] px-3 py-1 text-xs font-bold"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="mt-3 text-xs text-[#5e6473]">Loading payment verification queue...</p>
        ) : payments.length === 0 ? (
          <p className="mt-3 text-xs text-[#5e6473]">No direct UPI payments pending or recorded yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {payments.map((p) => (
              <div
                key={p.id}
                className="space-y-2 rounded-xl border border-[#e4e6f0] bg-[#f6f7fb] p-4 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-extrabold text-[#111319]">{p.referenceCode}</span>
                    <span className="ml-2 font-bold text-[#111319]">
                      {p.attendeeName} ({p.attendeeEmail})
                    </span>
                    <span className="ml-2 text-[#5e6473]">{p.eventTitle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#5b3df5]">{formatInr(p.totalInr)}</span>
                    <span className="rounded-full bg-white px-2.5 py-0.5 font-extrabold text-[#111319]">
                      {p.status}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-[11px] text-[#374151]">
                  <span>
                    Submitted Ref (UTR):{" "}
                    <strong className="font-mono">{p.paymentSubmittedRef ?? "None submitted"}</strong>
                  </span>
                  <span>
                    Claimed Paid:{" "}
                    <strong>
                      {p.paymentSubmittedAt ? new Date(p.paymentSubmittedAt).toLocaleString() : "Not yet"}
                    </strong>
                  </span>
                  {p.paymentExpiresAt && p.status === "AWAITING_PAYMENT_VERIFICATION" ? (
                    <span>
                      Expires: <strong>{new Date(p.paymentExpiresAt).toLocaleString()}</strong>
                    </span>
                  ) : null}
                </div>

                {p.status === "AWAITING_PAYMENT_VERIFICATION" ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void handleVerify(p, "APPROVE")}
                      className="rounded-lg bg-[#16a34a] px-3 py-1.5 font-bold text-white"
                    >
                      Verify & Approve ({formatInr(p.totalInr)})
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleVerify(p, "REJECT")}
                      className="rounded-lg bg-[#dc2626] px-3 py-1.5 font-bold text-white"
                    >
                      Reject Payment
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
