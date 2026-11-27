"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SEED_CITIES, type PulseEvent, type TicketPass, type TicketScanLog } from "@nightlifez/shared";
import { AppHeader } from "@/components/AppHeader";

interface OfflineQueueItem {
  clientScanId: string;
  ticketCodeOrToken: string;
  scannedAt: string;
}

const OFFLINE_STORAGE_KEY = "nightlifez_offline_scan_queue_v1";

export default function StaffScannerPage() {
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [recentScans, setRecentScans] = useState<TicketScanLog[]>([]);
  const [ticketInput, setTicketInput] = useState("");
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState<TicketPass[]>([]);
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);
  const [lastOutcome, setLastOutcome] = useState<{
    valid: boolean;
    result: string;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [canBoxOfficeSell, setCanBoxOfficeSell] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInEmail, setWalkInEmail] = useState("");
  const [walkInTierId, setWalkInTierId] = useState("");
  const [walkInType, setWalkInType] = useState<"WALK_IN_CASH" | "VIP" | "COMPLIMENTARY">("WALK_IN_CASH");
  const [boxOfficeNotice, setBoxOfficeNotice] = useState<string | null>(null);

  async function loadStaffEvents() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/events");
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Access denied");
        return;
      }
      setEvents(json.events ?? []);
      setRecentScans(json.recentScans ?? []);
      setCanBoxOfficeSell(Boolean(json.canBoxOfficeSell));
      if (json.events?.length > 0 && !selectedEventId) {
        setSelectedEventId(json.events[0].id);
        setWalkInTierId(json.events[0].tiers?.[0]?.id ?? "");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStaffEvents();
    try {
      const saved = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (saved) setOfflineQueue(JSON.parse(saved) as OfflineQueueItem[]);
    } catch {
      // Ignore storage errors
    }
  }, []);

  function saveQueue(next: OfflineQueueItem[]) {
    setOfflineQueue(next);
    try {
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore
    }
  }

  async function handleScanSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEventId || !ticketInput.trim()) return;

    if (offlineMode) {
      const item: OfflineQueueItem = {
        clientScanId: `off_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ticketCodeOrToken: ticketInput.trim(),
        scannedAt: new Date().toISOString()
      };
      saveQueue([item, ...offlineQueue]);
      setTicketInput("");
      setLastOutcome({
        valid: true,
        result: "QUEUED_OFFLINE",
        message: "Saved to offline gate queue. Sync when online to validate & detect conflicts."
      });
      return;
    }

    const res = await fetch("/api/staff/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: selectedEventId,
        ticketCodeOrToken: ticketInput.trim(),
        deviceId: "web-gate-console"
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setLastOutcome({ valid: false, result: "DENIED", message: json?.error ?? "Scan failed" });
      return;
    }
    setLastOutcome({ valid: json.valid, result: json.result, message: json.message });
    setTicketInput("");
    await loadStaffEvents();
  }

  async function handleSyncQueue() {
    if (!selectedEventId || offlineQueue.length === 0) return;
    const res = await fetch("/api/staff/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: selectedEventId,
        deviceId: "web-gate-console",
        scans: offlineQueue
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setLastOutcome({ valid: false, result: "SYNC_ERROR", message: json?.error ?? "Sync failed" });
      return;
    }
    const conflicts = (json.results ?? []).filter((r: { result: string }) => r.result !== "VALID");
    saveQueue([]);
    setLastOutcome({
      valid: conflicts.length === 0,
      result: conflicts.length > 0 ? "SYNC_WITH_CONFLICTS" : "SYNC_COMPLETE",
      message: `Synced ${json.results.length} offline scan(s). ${conflicts.length} conflict/rejected item(s).`
    });
    await loadStaffEvents();
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEventId) return;
    const res = await fetch(
      `/api/staff/lookup?eventId=${encodeURIComponent(selectedEventId)}&q=${encodeURIComponent(lookupQuery)}`
    );
    const json = await res.json();
    if (res.ok) {
      setLookupResults(json.tickets ?? []);
    }
  }

  async function handleBoxOfficeIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEventId) return;
    setBoxOfficeNotice(null);
    const activeEvt = events.find((ev) => ev.id === selectedEventId);
    const tierId = walkInTierId || activeEvt?.tiers?.[0]?.id || "";
    const res = await fetch("/api/staff/boxoffice/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: selectedEventId,
        tierId,
        fullName: walkInName,
        email: walkInEmail,
        guestType: walkInType
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setBoxOfficeNotice(json?.error ?? "Could not issue pass");
      return;
    }
    const code = json.booking?.tickets?.[0]?.ticketCode ?? "ISSUED";
    setWalkInName("");
    setWalkInEmail("");
    setBoxOfficeNotice(`Pass issued: ${code}`);
    await loadStaffEvents();
  }

  return (
    <div className="min-h-screen pb-14">
      <AppHeader cities={SEED_CITIES} />
      <main className="mx-auto max-w-5xl space-y-6 px-3 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-block rounded-full bg-[#111319] px-3 py-1 text-[11px] font-bold text-white">
              Staff & Box-Office Check-In
            </span>
            <h1 className="mt-1 text-2xl font-extrabold text-[#111319]">
              Gate Verification & Offline Sync
            </h1>
          </div>
          {events.length > 0 ? (
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="rounded-xl border border-[#e4e6f0] bg-white px-3 py-2 text-xs font-bold"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#e4e6f0] bg-white p-8 text-sm text-[#5e6473]">
            Loading assigned events...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-[#dc2626] bg-white p-6">
            <h2 className="text-base font-extrabold text-[#dc2626]">Protected Staff Console</h2>
            <p className="mt-1 text-sm text-[#5e6473]">{error}</p>
            <Link href="/account" className="mt-4 inline-block rounded-xl bg-[#5b3df5] px-4 py-2 text-xs font-bold text-white">
              Sign in as Assigned Gate Staff →
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            <section className="space-y-4 rounded-2xl border border-[#e4e6f0] bg-white p-5 lg:col-span-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-[#111319]">Verify Ticket / QR Token</h2>
                <label className="flex items-center gap-2 text-xs font-bold text-[#5e6473]">
                  <input
                    type="checkbox"
                    checked={offlineMode}
                    onChange={(e) => setOfflineMode(e.target.checked)}
                  />
                  Offline Queue Mode
                </label>
              </div>

              <form onSubmit={handleScanSubmit} className="space-y-3">
                <input
                  type="text"
                  required
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                  placeholder="Enter NLZ-TKT-XXXXXX or signed NLZ1... QR token"
                  className="w-full rounded-xl border border-[#e4e6f0] px-3.5 py-2.5 font-mono text-sm"
                />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#5b3df5] py-3 text-sm font-extrabold text-white"
                >
                  {offlineMode ? "Queue Offline Scan" : "Verify & Check In"}
                </button>
              </form>

              {lastOutcome ? (
                <div
                  className={`rounded-2xl border p-4 text-xs ${
                    lastOutcome.valid
                      ? "border-[#16a34a] bg-[#dcfce7] text-[#14532d]"
                      : "border-[#dc2626] bg-[#fee2e2] text-[#7f1d1d]"
                  }`}
                >
                  <div className="font-extrabold">{lastOutcome.result}</div>
                  <div className="mt-1">{lastOutcome.message}</div>
                </div>
              ) : null}

              {offlineQueue.length > 0 ? (
                <div className="rounded-xl border border-[#d97706] bg-[#fef3c7] p-3 text-xs">
                  <div className="flex items-center justify-between font-bold text-[#92400e]">
                    <span>Offline Queue ({offlineQueue.length})</span>
                    <button
                      type="button"
                      onClick={() => void handleSyncQueue()}
                      className="rounded-lg bg-[#111319] px-3 py-1 text-white"
                    >
                      Sync Now
                    </button>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="space-y-4 rounded-2xl border border-[#e4e6f0] bg-white p-5 lg:col-span-6">
              <h2 className="text-base font-extrabold text-[#111319]">Manual Attendee & Ticket Lookup</h2>
              <form onSubmit={handleLookup} className="flex gap-2">
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  placeholder="Search name, email, or NLZ-TKT-..."
                  className="min-w-0 flex-1 rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs"
                />
                <button type="submit" className="rounded-xl bg-[#111319] px-4 py-2 text-xs font-bold text-white">
                  Lookup
                </button>
              </form>

              <div className="space-y-2 text-xs">
                {lookupResults.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl bg-[#f6f7fb] px-3 py-2">
                    <div>
                      <div className="font-mono font-bold">{t.ticketCode}</div>
                      <div className="text-[#5e6473]">{t.holderName} · {t.tierName}</div>
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 font-bold">{t.status}</span>
                  </div>
                ))}
              </div>

              <h3 className="pt-2 text-xs font-extrabold uppercase text-[#5e6473]">Recent Gate Scans</h3>
              <div className="space-y-1.5 text-xs">
                {recentScans.slice(0, 8).map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-[#e4e6f0] px-3 py-1.5">
                    <span className="font-mono">{s.ticketCode}</span>
                    <span className={s.result === "VALID" ? "font-bold text-[#16a34a]" : "font-bold text-[#dc2626]"}>
                      {s.result}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {canBoxOfficeSell ? (
              <section className="space-y-3 rounded-2xl border border-[#e4e6f0] bg-white p-5 lg:col-span-12">
                <h2 className="text-base font-extrabold text-[#111319]">Box-Office Walk-In & Cash Pass Issuance</h2>
                {boxOfficeNotice ? (
                  <div className="rounded-xl bg-[#efeafe] px-3 py-2 text-xs font-bold text-[#5b3df5]">
                    {boxOfficeNotice}
                  </div>
                ) : null}
                <form onSubmit={handleBoxOfficeIssue} className="grid gap-3 sm:grid-cols-5">
                  <input
                    type="text"
                    required
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    placeholder="Guest full name"
                    className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs"
                  />
                  <input
                    type="email"
                    required
                    value={walkInEmail}
                    onChange={(e) => setWalkInEmail(e.target.value)}
                    placeholder="guest@example.com"
                    className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs"
                  />
                  <select
                    value={walkInTierId || events.find((ev) => ev.id === selectedEventId)?.tiers?.[0]?.id || ""}
                    onChange={(e) => setWalkInTierId(e.target.value)}
                    className="rounded-xl border border-[#e4e6f0] bg-white px-3 py-2 text-xs font-bold"
                  >
                    {(events.find((ev) => ev.id === selectedEventId)?.tiers ?? []).map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <select
                    value={walkInType}
                    onChange={(e) => setWalkInType(e.target.value as "WALK_IN_CASH" | "VIP" | "COMPLIMENTARY")}
                    className="rounded-xl border border-[#e4e6f0] bg-white px-3 py-2 text-xs font-bold"
                  >
                    <option value="WALK_IN_CASH">Walk-In (Cash)</option>
                    <option value="VIP">VIP Pass</option>
                    <option value="COMPLIMENTARY">Complimentary</option>
                  </select>
                  <button type="submit" className="rounded-xl bg-[#5b3df5] px-4 py-2 text-xs font-extrabold text-white">
                    Issue Pass
                  </button>
                </form>
              </section>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
