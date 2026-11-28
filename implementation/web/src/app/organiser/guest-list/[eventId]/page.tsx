"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { BookingQuestion, PulseEvent } from "@nightlifez/shared";

interface GuestExportRow {
  referenceCode: string;
  bookingStatus: string;
  bookingSource: string;
  paymentChannel: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  tierName: string;
  ticketCode: string;
  ticketStatus: string;
  checkedInAt: string;
  answers: Record<string, string | number | boolean | string[]>;
}

export default function PrintableGuestListPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId ?? "";
  const [event, setEvent] = useState<PulseEvent | null>(null);
  const [questions, setQuestions] = useState<BookingQuestion[]>([]);
  const [rows, setRows] = useState<GuestExportRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/organiser/events/${encodeURIComponent(eventId)}/guests/export?format=json`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Access denied");
        setEvent(json.event);
        setQuestions(json.questions ?? []);
        setRows(json.rows ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load guest list"));
  }, [eventId]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <p className="text-sm font-bold text-[#dc2626]">{error}</p>
        <Link href="/organiser" className="mt-4 inline-block text-xs font-bold text-[#5b3df5] underline">
          Back to Organiser Portal
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 text-[#111319] print:p-0">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e6f0] pb-4 print:border-black">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#5e6473]">
              NIGHTLIFEZ · A4 Door Guest List
            </div>
            <h1 className="text-xl font-extrabold">{event?.title ?? "Loading..."}</h1>
            <p className="text-xs text-[#5e6473]">
              {event?.dateLabel} · {event?.venueName} · Total Guests: {rows.length}
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Link
              href="/organiser"
              className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs font-bold"
            >
              ← Organiser
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl bg-[#111319] px-4 py-2 text-xs font-bold text-white"
            >
              Print / Save PDF (A4)
            </button>
          </div>
        </div>

        <table className="w-full border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-b-2 border-[#111319] bg-[#f6f7fb]">
              <th className="p-2">#</th>
              <th className="p-2">Guest</th>
              <th className="p-2">Tier & Source</th>
              <th className="p-2">Ticket Code</th>
              <th className="p-2">Status</th>
              {questions.map((q) => (
                <th key={q.id} className="p-2">{q.label}</th>
              ))}
              <th className="p-2">Door Check</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={`${r.ticketCode}-${idx}`} className="border-b border-[#e4e6f0]">
                <td className="p-2 font-mono">{idx + 1}</td>
                <td className="p-2">
                  <div className="font-bold">{r.attendeeName}</div>
                  <div className="text-[#5e6473]">{r.attendeeEmail}</div>
                </td>
                <td className="p-2">
                  <div className="font-semibold">{r.tierName}</div>
                  <div className="text-[10px] text-[#5e6473]">{r.bookingSource}</div>
                </td>
                <td className="p-2 font-mono font-bold">{r.ticketCode}</td>
                <td className="p-2 font-bold">{r.ticketStatus}</td>
                {questions.map((q) => {
                  const val = r.answers[q.id];
                  const txt = Array.isArray(val) ? val.join(", ") : val === undefined ? "—" : String(val);
                  return <td key={q.id} className="p-2">{txt}</td>;
                })}
                <td className="p-2">{r.checkedInAt ? "✓ Checked In" : "☐"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
