"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  buildCsvGuestTemplate,
  formatInr,
  type BookingQuestion,
  type BookingQuestionType,
  type BookingRecord,
  type Organization,
  type PulseEvent
} from "@nightlifez/shared";

interface StorefrontFormProps {
  org: Organization;
  onSaved: (msg: string) => Promise<void>;
}

export function OrganiserStorefrontPanel({ org, onSaved }: StorefrontFormProps) {
  const [bioIntro, setBioIntro] = useState(org.bioIntro ?? "");
  const [coverArtworkUrl, setCoverArtworkUrl] = useState(org.coverArtworkUrl ?? "");
  const [instagramHandle, setInstagramHandle] = useState(org.instagramHandle ?? "");
  const [publicContactPhone, setPublicContactPhone] = useState(org.publicContactPhone ?? "");
  const [publicContactEmail, setPublicContactEmail] = useState(org.publicContactEmail ?? "");
  const [promotedListingsEnabled, setPromotedListingsEnabled] = useState(
    Boolean(org.promotedListingsEnabled)
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBioIntro(org.bioIntro ?? "");
    setCoverArtworkUrl(org.coverArtworkUrl ?? "");
    setInstagramHandle(org.instagramHandle ?? "");
    setPublicContactPhone(org.publicContactPhone ?? "");
    setPublicContactEmail(org.publicContactEmail ?? "");
    setPromotedListingsEnabled(Boolean(org.promotedListingsEnabled));
  }, [org]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/organiser/organizations/${encodeURIComponent(org.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bioIntro,
        coverArtworkUrl: coverArtworkUrl || null,
        instagramHandle: instagramHandle || null,
        publicContactPhone: publicContactPhone || null,
        publicContactEmail: publicContactEmail || null,
        promotedListingsEnabled
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error ?? "Could not update storefront");
      return;
    }
    await onSaved("Storefront profile updated.");
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[#e4e6f0] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-extrabold text-[#111319]">Public Organiser Storefront</h2>
          <p className="text-xs text-[#5e6473]">
            Public URL: <code className="rounded bg-[#f6f7fb] px-1.5 py-0.5">/o/{org.slug}</code> (only visible when approved)
          </p>
        </div>
        <Link
          href={`/o/${org.slug}`}
          className="rounded-xl bg-[#111319] px-3.5 py-2 text-xs font-bold text-white"
        >
          View Public Storefront ↗
        </Link>
      </div>

      {error ? <p className="text-xs font-bold text-[#dc2626]">{error}</p> : null}

      <form onSubmit={handleSave} className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-bold text-[#5e6473] sm:col-span-2">
          Storefront Bio / Description
          <textarea
            rows={2}
            value={bioIntro}
            onChange={(e) => setBioIntro(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs text-[#111319]"
          />
        </label>
        <label className="block text-xs font-bold text-[#5e6473]">
          Cover Image URL
          <input
            type="text"
            value={coverArtworkUrl}
            onChange={(e) => setCoverArtworkUrl(e.target.value)}
            placeholder="/art/evt-solstice.svg"
            className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs text-[#111319]"
          />
        </label>
        <label className="block text-xs font-bold text-[#5e6473]">
          Instagram Handle
          <input
            type="text"
            value={instagramHandle}
            onChange={(e) => setInstagramHandle(e.target.value)}
            placeholder="@nightlifez.originals"
            className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs text-[#111319]"
          />
        </label>
        <label className="block text-xs font-bold text-[#5e6473]">
          Public Contact Phone
          <input
            type="text"
            value={publicContactPhone}
            onChange={(e) => setPublicContactPhone(e.target.value)}
            placeholder="+91 80 4123 9000"
            className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs text-[#111319]"
          />
        </label>
        <label className="block text-xs font-bold text-[#5e6473]">
          Public Contact Email
          <input
            type="email"
            value={publicContactEmail}
            onChange={(e) => setPublicContactEmail(e.target.value)}
            placeholder="hello@nightlifez.test"
            className="mt-1 w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs text-[#111319]"
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-bold text-[#111319] sm:col-span-2">
          <input
            type="checkbox"
            checked={promotedListingsEnabled}
            onChange={(e) => setPromotedListingsEnabled(e.target.checked)}
          />
          Enable Promoted Listings section on storefront
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-xl bg-[#5b3df5] px-5 py-2.5 text-xs font-extrabold text-white"
          >
            Save Storefront Settings
          </button>
        </div>
      </form>
    </section>
  );
}

export function OrganiserApprovalsPanel({
  onUpdated
}: {
  onUpdated: (msg: string) => Promise<void>;
}) {
  const [approvals, setApprovals] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadApprovals() {
    setLoading(true);
    try {
      const res = await fetch("/api/organiser/approvals");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Could not load approvals");
      setApprovals(json.approvals ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApprovals();
  }, []);

  async function decide(bookingId: string, decision: "APPROVE" | "REJECT") {
    const reason = decision === "REJECT" ? "Declined by organiser review" : undefined;
    const res = await fetch(`/api/organiser/approvals/${encodeURIComponent(bookingId)}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, reason, expiresInHours: 24 })
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error ?? "Decision failed");
      return;
    }
    await loadApprovals();
    await onUpdated(`Request ${decision === "APPROVE" ? "approved" : "rejected"}.`);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[#e4e6f0] bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold text-[#111319]">
          Guest Approval Requests ({approvals.length})
        </h2>
        <button
          type="button"
          onClick={() => void loadApprovals()}
          className="rounded-lg border border-[#e4e6f0] px-3 py-1 text-xs font-bold"
        >
          Refresh
        </button>
      </div>
      {error ? <p className="text-xs font-bold text-[#dc2626]">{error}</p> : null}
      {loading ? (
        <p className="text-xs text-[#5e6473]">Loading requests...</p>
      ) : approvals.length === 0 ? (
        <p className="text-xs text-[#5e6473]">No approval-gated booking requests yet.</p>
      ) : (
        <div className="space-y-3">
          {approvals.map((b) => (
            <div key={b.id} className="space-y-2 rounded-xl border border-[#e4e6f0] bg-[#f6f7fb] p-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-extrabold text-[#111319]">
                    {b.attendeeName} ({b.attendeeEmail})
                  </span>
                  <span className="ml-2 text-[#5e6473]">
                    {b.eventTitle} · {b.referenceCode} · {formatInr(b.totalInr)}
                  </span>
                </div>
                <span className="rounded-full bg-white px-2.5 py-0.5 font-extrabold text-[#5b3df5]">
                  {b.status}
                </span>
              </div>

              {b.attendees && b.attendees.length > 0 ? (
                <div className="space-y-1 rounded-lg bg-white p-2.5">
                  {b.attendees.map((att) => (
                    <div key={att.id} className="text-[11px] text-[#374151]">
                      <strong>{att.fullName}</strong> ({att.email}) — Answers:{" "}
                      {Object.keys(att.answers).length > 0
                        ? JSON.stringify(att.answers)
                        : "None"}
                    </div>
                  ))}
                </div>
              ) : null}

              {b.approvalToken && b.status === "APPROVED_AWAITING_PAYMENT" ? (
                <div className="text-[11px] font-bold text-[#059669]">
                  Payment link:{" "}
                  <Link href={`/bookings/approve/${b.approvalToken}`} className="underline">
                    /bookings/approve/{b.approvalToken}
                  </Link>
                </div>
              ) : null}

              {b.status === "PENDING_APPROVAL" ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void decide(b.id, "APPROVE")}
                    className="rounded-lg bg-[#16a34a] px-3 py-1.5 font-bold text-white"
                  >
                    Approve & Generate Pay Link
                  </button>
                  <button
                    type="button"
                    onClick={() => void decide(b.id, "REJECT")}
                    className="rounded-lg bg-[#dc2626] px-3 py-1.5 font-bold text-white"
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function OrganiserGuestListPanel({
  events,
  onUpdated
}: {
  events: PulseEvent[];
  onUpdated: (msg: string) => Promise<void>;
}) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const [tierId, setTierId] = useState(events[0]?.tiers?.[0]?.id ?? "");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [guestType, setGuestType] = useState<"WALK_IN_CASH" | "VIP" | "COMPLIMENTARY">("WALK_IN_CASH");
  const [csvText, setCsvText] = useState("name,email,phone,tier,type\n");
  const [eventQuestions, setEventQuestions] = useState<BookingQuestion[]>([]);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [importRowErrors, setImportRowErrors] = useState<{ lineNumber: number; message: string }[]>([]);
  const [importDuplicates, setImportDuplicates] = useState<{ lineNumber: number; email: string; reason: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const activeEvent = events.find((e) => e.id === selectedEventId) ?? events[0];

  useEffect(() => {
    if (activeEvent && !activeEvent.tiers.some((t) => t.id === tierId)) {
      setTierId(activeEvent.tiers[0]?.id ?? "");
    }
    if (activeEvent) {
      fetch(`/api/events/${encodeURIComponent(activeEvent.slug)}/questions`)
        .then((r) => r.json())
        .then((json) => {
          const qs = Array.isArray(json?.questions) ? (json.questions as BookingQuestion[]) : [];
          setEventQuestions(qs);
        })
        .catch(() => setEventQuestions([]));
    }
  }, [activeEvent, tierId]);

  function downloadCsvTemplate() {
    if (!activeEvent) return;
    const template = buildCsvGuestTemplate(eventQuestions);
    const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guest-import-template-${activeEvent.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!activeEvent) return;
    setError(null);
    const res = await fetch(`/api/organiser/events/${encodeURIComponent(activeEvent.id)}/guests/manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: activeEvent.id,
        tierId: tierId || activeEvent.tiers[0]?.id,
        fullName,
        email,
        phone: phone || null,
        guestType
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error ?? "Could not add guest");
      return;
    }
    const code = json.booking?.tickets?.[0]?.ticketCode ?? "ISSUED";
    setFullName("");
    setEmail("");
    setPhone("");
    await onUpdated(`Manual pass issued (${code}).`);
  }

  async function handleCsvImport(e: React.FormEvent) {
    e.preventDefault();
    if (!activeEvent) return;
    setError(null);
    setImportSummary(null);
    setImportRowErrors([]);
    setImportDuplicates([]);
    const res = await fetch(`/api/organiser/events/${encodeURIComponent(activeEvent.id)}/guests/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        csvText,
        defaultTierId: tierId || activeEvent.tiers[0]?.id,
        defaultGuestType: "COMPLIMENTARY"
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error ?? "CSV import failed");
      return;
    }
    setImportRowErrors(json.errors ?? []);
    setImportDuplicates(json.skippedDuplicates ?? []);
    setImportSummary(
      `Imported ${json.importedCount} pass(es). Duplicates skipped: ${json.skippedDuplicates?.length ?? 0}. Errors: ${json.errors?.length ?? 0}.`
    );
    await onUpdated(`CSV import complete (${json.importedCount} issued).`);
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e4e6f0] bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-extrabold text-[#111319]">Target Event:</span>
          <select
            value={activeEvent?.id ?? ""}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="rounded-xl border border-[#e4e6f0] bg-white px-3 py-1.5 text-xs font-bold"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
        </div>
        {activeEvent ? (
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/organiser/events/${encodeURIComponent(activeEvent.id)}/guests/export?format=csv`}
              className="rounded-xl border border-[#e4e6f0] px-3 py-1.5 text-xs font-bold text-[#111319]"
            >
              Export Guest CSV
            </a>
            <Link
              href={`/organiser/guest-list/${activeEvent.id}`}
              className="rounded-xl bg-[#111319] px-3.5 py-1.5 text-xs font-bold text-white"
            >
              Print A4 / PDF Guest List
            </Link>
          </div>
        ) : null}
      </div>

      {error ? <p className="rounded-xl bg-[#fee2e2] px-4 py-2 text-xs font-bold text-[#dc2626]">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleManualAdd} className="space-y-3 rounded-2xl border border-[#e4e6f0] bg-white p-5">
          <h3 className="text-base font-extrabold text-[#111319]">Add Walk-In, Cash, VIP or Comp Guest</h3>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs"
          />
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={tierId}
              onChange={(e) => setTierId(e.target.value)}
              className="rounded-xl border border-[#e4e6f0] bg-white px-2.5 py-2 text-xs font-bold"
            >
              {(activeEvent?.tiers ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({formatInr(t.priceInr)})</option>
              ))}
            </select>
            <select
              value={guestType}
              onChange={(e) => setGuestType(e.target.value as "WALK_IN_CASH" | "VIP" | "COMPLIMENTARY")}
              className="rounded-xl border border-[#e4e6f0] bg-white px-2.5 py-2 text-xs font-bold"
            >
              <option value="WALK_IN_CASH">Walk-In (Cash Collected)</option>
              <option value="VIP">VIP Pass (₹0)</option>
              <option value="COMPLIMENTARY">Complimentary (₹0)</option>
            </select>
          </div>
          <button type="submit" className="w-full rounded-xl bg-[#5b3df5] py-2.5 text-xs font-extrabold text-white">
            Issue Guest Pass
          </button>
        </form>

        <form onSubmit={handleCsvImport} className="space-y-3 rounded-2xl border border-[#e4e6f0] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-extrabold text-[#111319]">Import Guest List (CSV)</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCsvText(buildCsvGuestTemplate(eventQuestions))}
                className="rounded-lg border border-[#e4e6f0] px-2.5 py-1 text-[11px] font-bold text-[#5b3df5]"
              >
                Load Template
              </button>
              <button
                type="button"
                onClick={downloadCsvTemplate}
                className="rounded-lg bg-[#f6f7fb] px-2.5 py-1 text-[11px] font-bold text-[#111319]"
              >
                Download CSV Template
              </button>
            </div>
          </div>
          <div className="space-y-1 rounded-xl bg-[#f6f7fb] p-3 text-[11px] text-[#374151]">
            <div>
              <strong>Expected headers:</strong>{" "}
              <code>
                name,email,phone,tier,type
                {eventQuestions.map((q) => `,${q.label}`).join("")}
              </code>
            </div>
            {eventQuestions.length > 0 ? (
              <div>
                <strong>Custom questions:</strong>{" "}
                {eventQuestions
                  .map(
                    (q) =>
                      `${q.label}${q.required ? " (required)" : " (optional)"} [${q.id}]${
                        q.options.length > 0 ? ` {${q.options.join(" / ")}}` : ""
                      }`
                  )
                  .join(" · ")}
              </div>
            ) : (
              <div>No custom booking questions configured for this event.</div>
            )}
          </div>
          <textarea
            rows={5}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full rounded-xl border border-[#e4e6f0] p-3 font-mono text-xs"
          />
          {importSummary ? (
            <p className="rounded-xl bg-[#dcfce7] px-3 py-2 text-xs font-bold text-[#16a34a]">
              {importSummary}
            </p>
          ) : null}
          {importRowErrors.length > 0 ? (
            <div className="space-y-1 rounded-xl bg-[#fee2e2] p-3 text-[11px] font-semibold text-[#dc2626]">
              {importRowErrors.map((err, i) => (
                <div key={i}>Line {err.lineNumber}: {err.message}</div>
              ))}
            </div>
          ) : null}
          {importDuplicates.length > 0 ? (
            <div className="space-y-1 rounded-xl bg-[#fef3c7] p-3 text-[11px] font-semibold text-[#92400e]">
              {importDuplicates.map((d, i) => (
                <div key={i}>Line {d.lineNumber} ({d.email}): {d.reason}</div>
              ))}
            </div>
          ) : null}
          <button type="submit" className="w-full rounded-xl bg-[#111319] py-2.5 text-xs font-extrabold text-white">
            Validate & Import Guest List
          </button>
        </form>
      </div>
    </section>
  );
}

export function OrganiserQuestionBuilder({
  event,
  onSaved
}: {
  event: PulseEvent;
  onSaved: (msg: string) => Promise<void>;
}) {
  const [questions, setQuestions] = useState<
    { id?: string; label: string; fieldType: BookingQuestionType; optionsText: string; required: boolean }[]
  >([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    fetch(`/api/events/${encodeURIComponent(event.slug)}/questions`)
      .then((r) => r.json())
      .then((json) => {
        const list = (json.questions ?? []) as BookingQuestion[];
        setQuestions(
          list.map((q) => ({
            id: q.id,
            label: q.label,
            fieldType: q.fieldType,
            optionsText: q.options.join(", "),
            required: q.required
          }))
        );
      })
      .finally(() => setLoaded(true));
  }, [event.slug]);

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      { label: "", fieldType: "SHORT_TEXT", optionsText: "", required: false }
    ]);
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= questions.length) return;
    const copy = questions.slice();
    const [item] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, item!);
    setQuestions(copy);
  }

  async function saveQuestions() {
    const payload = {
      questions: questions
        .filter((q) => q.label.trim().length >= 2)
        .map((q, idx) => ({
          id: q.id,
          label: q.label.trim(),
          fieldType: q.fieldType,
          options: q.optionsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          required: q.required,
          sortOrder: idx
        }))
    };
    const res = await fetch(`/api/organiser/events/${encodeURIComponent(event.id)}/questions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      await onSaved(`Saved ${payload.questions.length} booking question(s) for ${event.title}.`);
    }
  }

  if (!loaded) return null;

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-[#e4e6f0] bg-[#f6f7fb] p-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-[#111319]">Booking Questions ({questions.length})</span>
        <div className="flex gap-2">
          <button type="button" onClick={addQuestion} className="rounded-lg bg-white px-2.5 py-1 font-bold text-[#5b3df5]">
            + Add Question
          </button>
          <button type="button" onClick={() => void saveQuestions()} className="rounded-lg bg-[#5b3df5] px-2.5 py-1 font-bold text-white">
            Save Questions
          </button>
        </div>
      </div>
      {questions.map((q, idx) => (
        <div key={idx} className="grid gap-2 rounded-lg bg-white p-2 sm:grid-cols-12">
          <input
            type="text"
            value={q.label}
            onChange={(e) => {
              const copy = questions.slice();
              copy[idx] = { ...q, label: e.target.value };
              setQuestions(copy);
            }}
            placeholder="Question label (e.g. Instagram handle)"
            className="rounded border border-[#e4e6f0] px-2 py-1 sm:col-span-4"
          />
          <select
            value={q.fieldType}
            onChange={(e) => {
              const copy = questions.slice();
              copy[idx] = { ...q, fieldType: e.target.value as BookingQuestionType };
              setQuestions(copy);
            }}
            className="rounded border border-[#e4e6f0] bg-white px-2 py-1 sm:col-span-3"
          >
            <option value="SHORT_TEXT">Short text</option>
            <option value="LONG_TEXT">Long text</option>
            <option value="NUMBER">Number</option>
            <option value="DROPDOWN">Dropdown</option>
            <option value="MULTI_CHOICE">Multiple choice</option>
            <option value="CHECKBOX">Checkbox</option>
          </select>
          <input
            type="text"
            value={q.optionsText}
            onChange={(e) => {
              const copy = questions.slice();
              copy[idx] = { ...q, optionsText: e.target.value };
              setQuestions(copy);
            }}
            placeholder="Options (comma-sep)"
            disabled={q.fieldType !== "DROPDOWN" && q.fieldType !== "MULTI_CHOICE"}
            className="rounded border border-[#e4e6f0] px-2 py-1 disabled:bg-[#f6f7fb] sm:col-span-2"
          />
          <label className="flex items-center gap-1 sm:col-span-1">
            <input
              type="checkbox"
              checked={q.required}
              onChange={(e) => {
                const copy = questions.slice();
                copy[idx] = { ...q, required: e.target.checked };
                setQuestions(copy);
              }}
            />
            Req
          </label>
          <div className="flex items-center gap-1 sm:col-span-2">
            <button type="button" onClick={() => moveQuestion(idx, -1)} className="rounded border px-1.5 py-0.5">↑</button>
            <button type="button" onClick={() => moveQuestion(idx, 1)} className="rounded border px-1.5 py-0.5">↓</button>
            <button
              type="button"
              onClick={() => setQuestions(questions.filter((_, i) => i !== idx))}
              className="rounded border border-[#dc2626] px-1.5 py-0.5 text-[#dc2626]"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
