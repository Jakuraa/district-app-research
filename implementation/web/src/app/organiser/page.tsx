"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatInr,
  SEED_CITIES,
  type BookingRecord,
  type City,
  type LedgerEntry,
  type Organization,
  type PulseEvent,
  type RefundRequest,
  type SettlementBatch,
  type StaffInvitation,
  type Venue
} from "@nightlifez/shared";
import { AppHeader } from "@/components/AppHeader";
import {
  OrganiserApprovalsPanel,
  OrganiserGuestListPanel,
  OrganiserQuestionBuilder,
  OrganiserStorefrontPanel
} from "@/components/OrganiserMilestonePanel";
import { OrganiserPaymentsPanel } from "@/components/OrganiserPaymentsPanel";
import {
  OrganiserMembershipsPanel,
  OrganiserPromotersPanel,
  OrganiserTripsPanel
} from "@/components/OrganiserCommunityPanels";

interface OrganiserOverview {
  organizations: Organization[];
  events: PulseEvent[];
  venues: Venue[];
  cities: City[];
  bookings: BookingRecord[];
  refunds: RefundRequest[];
  invitations: StaffInvitation[];
  ledger: LedgerEntry[];
  settlements: SettlementBatch[];
}

export default function OrganiserPortalPage() {
  const [data, setData] = useState<OrganiserOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<
    "analytics" | "storefront" | "payments" | "events" | "approvals" | "guests" | "offers" | "promoters" | "trips" | "memberships" | "orders" | "staff" | "finance"
  >("analytics");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [notice, setNotice] = useState<string | null>(null);
  const [evtApprovalRequired, setEvtApprovalRequired] = useState(false);
  const [evtVisibility, setEvtVisibility] = useState<"PUBLIC" | "UNLISTED" | "INVITE_ONLY">("PUBLIC");
  const [dupTargetId, setDupTargetId] = useState<string | null>(null);
  const [dupDateLabel, setDupDateLabel] = useState("Sat, 16 Jan · 7:00 PM");
  const [questionEventId, setQuestionEventId] = useState<string | null>(null);

  // Create / Edit Event form state
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [evtTitle, setEvtTitle] = useState("");
  const [evtCategory, setEvtCategory] = useState("concerts");
  const [evtCity, setEvtCity] = useState("bengaluru");
  const [evtVenue, setEvtVenue] = useState("skyline-amphitheatre-bengaluru");
  const [evtDateLabel, setEvtDateLabel] = useState("Sat, 26 Dec · 7:00 PM");
  const [evtSummary, setEvtSummary] = useState("");
  const [evtGoalTickets, setEvtGoalTickets] = useState("");
  const [evtGoalRevenue, setEvtGoalRevenue] = useState("");
  const [evtMaxCapacity, setEvtMaxCapacity] = useState("");
  const [tiersDraft, setTiersDraft] = useState<
    { id?: string; name: string; priceInr: string; totalQuota: string; maxPerOrder: string }[]
  >([{ name: "General Admission", priceInr: "999", totalQuota: "200", maxPerOrder: "6" }]);

  // Organiser Registration state (for authenticated users without an org)
  const [regName, setRegName] = useState("");
  const [regLegalName, setRegLegalName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regCity, setRegCity] = useState("bengaluru");
  const [regMsg, setRegMsg] = useState<string | null>(null);

  // Create Offer state
  const [offerEventId, setOfferEventId] = useState("");
  const [offerCode, setOfferCode] = useState("");
  const [offerTitle, setOfferTitle] = useState("");
  const [offerValue, setOfferValue] = useState("15");

  // Invite Staff state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("checkin_staff");
  const [inviteEventId, setInviteEventId] = useState("");

  async function loadOverview() {
    if (!data) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/organiser/overview");
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Access denied");
        setData(null);
        return;
      }
      setData(json);
      const urlOrg =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("org")
          : null;
      const validUrlOrg =
        urlOrg && json.organizations?.some((o: Organization) => o.id === urlOrg) ? urlOrg : null;
      if (validUrlOrg) {
        setSelectedOrgId(validUrlOrg);
      } else if (json.organizations?.length > 0 && !selectedOrgId) {
        setSelectedOrgId(json.organizations[0].id);
      }
      if (json.events?.length > 0 && !offerEventId) {
        setOfferEventId(json.events[0].id);
        setInviteEventId(json.events[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  function startEditEvent(evt: PulseEvent) {
    setEditingEventId(evt.id);
    setEvtTitle(evt.title);
    setEvtCategory(evt.category);
    setEvtCity(evt.citySlug);
    setEvtVenue(evt.venueSlug);
    setEvtDateLabel(evt.dateLabel);
    setEvtSummary(evt.summary);
    setEvtVisibility(evt.visibility ?? "PUBLIC");
    setEvtApprovalRequired(Boolean(evt.approvalRequired));
    setEvtGoalTickets(evt.goalTickets ? String(evt.goalTickets) : "");
    setEvtGoalRevenue(evt.goalRevenueInr ? String(evt.goalRevenueInr) : "");
    setEvtMaxCapacity(evt.maxCapacity ? String(evt.maxCapacity) : "");
    setTiersDraft(
      evt.tiers.map((t) => ({
        id: t.id,
        name: t.name,
        priceInr: String(t.priceInr),
        totalQuota: String(t.totalQuota),
        maxPerOrder: String(t.maxPerOrder)
      }))
    );
  }

  function resetEventForm() {
    setEditingEventId(null);
    setEvtTitle("");
    setEvtSummary("");
    setEvtGoalTickets("");
    setEvtGoalRevenue("");
    setEvtMaxCapacity("");
    setTiersDraft([{ name: "General Admission", priceInr: "999", totalQuota: "200", maxPerOrder: "6" }]);
  }

  async function handleRegisterOrganiser(e: React.FormEvent) {
    e.preventDefault();
    setRegMsg(null);
    const res = await fetch("/api/organiser/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: regName,
        legalName: regLegalName,
        contactEmail: regEmail,
        citySlug: regCity
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setRegMsg(json?.error ?? "Could not register organiser brand.");
      return;
    }
    setRegMsg(`Registered "${json.organization.name}". Reloading console...`);
    await loadOverview();
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    const orgId = selectedOrgId || data?.organizations[0]?.id;
    const venueObj = data?.venues.find((v) => v.slug === evtVenue);
    const sectionId = venueObj?.sections[0]?.id ?? "sec-ga";
    const res = await fetch("/api/organiser/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(editingEventId ? { id: editingEventId } : {}),
        organizationId: orgId,
        title: evtTitle,
        category: evtCategory,
        citySlug: evtCity,
        venueSlug: evtVenue,
        startsAt: "2026-12-26T19:00:00+05:30",
        endsAt: "2026-12-26T23:00:00+05:30",
        dateLabel: evtDateLabel,
        summary: evtSummary,
        lifecycleStatus: "PUBLISHED",
        visibility: evtVisibility,
        approvalRequired: evtApprovalRequired,
        goalTickets: evtGoalTickets ? Number(evtGoalTickets) : null,
        goalRevenueInr: evtGoalRevenue ? Number(evtGoalRevenue) : null,
        maxCapacity: evtMaxCapacity ? Number(evtMaxCapacity) : null,
        activePhase: "GENERAL_SALE",
        tiers: tiersDraft.map((t) => ({
          ...(t.id ? { id: t.id } : {}),
          sectionId,
          name: t.name,
          description: "Standard access tier",
          priceInr: Number(t.priceInr),
          totalQuota: Number(t.totalQuota),
          maxPerOrder: Number(t.maxPerOrder) || 6
        }))
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setNotice(json?.error ?? "Failed to save event");
      return;
    }
    const wasEditing = Boolean(editingEventId);
    resetEventForm();
    setNotice(`Event "${json.event.title}" ${wasEditing ? "updated" : "published"}.`);
    await loadOverview();
  }

  async function handleLifecycleToggle(evt: PulseEvent, nextStatus: "PUBLISHED" | "PAUSED" | "CANCELLED") {
    const res = await fetch("/api/organiser/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: evt.id,
        organizationId: evt.organizationId,
        title: evt.title,
        category: evt.category,
        citySlug: evt.citySlug,
        venueSlug: evt.venueSlug,
        startsAt: evt.startsAt,
        endsAt: evt.endsAt,
        dateLabel: evt.dateLabel,
        summary: evt.summary,
        lifecycleStatus: nextStatus,
        tiers: evt.tiers
      })
    });
    if (res.ok) {
      setNotice(`Updated "${evt.title}" to ${nextStatus}.`);
      await loadOverview();
    }
  }

  async function handleDuplicateEvent(sourceEventId: string) {
    setNotice(null);
    const res = await fetch(`/api/organiser/events/${encodeURIComponent(sourceEventId)}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startsAt: "2027-01-16T19:00:00+05:30",
        endsAt: "2027-01-16T23:00:00+05:30",
        dateLabel: dupDateLabel
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setNotice(json?.error ?? "Could not duplicate event");
      return;
    }
    setDupTargetId(null);
    setNotice(`Duplicated as DRAFT: "${json.event.title}". Review and publish when ready.`);
    await loadOverview();
  }

  async function handleCreateOffer(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/organiser/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: offerEventId,
        code: offerCode,
        title: offerTitle,
        description: `${offerValue}% instant promo code`,
        kind: "PERCENT_CAP",
        discountValue: Number(offerValue),
        maxDiscountInr: 500,
        minOrderInr: 500,
        minQty: 1,
        expiresAt: "2027-02-01T23:59:59+05:30"
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setNotice(json?.error ?? "Failed to create promo code");
      return;
    }
    setOfferCode("");
    setOfferTitle("");
    setNotice(`Promo code ${json.offer.code} created.`);
    await loadOverview();
  }

  async function handleInviteStaff(e: React.FormEvent) {
    e.preventDefault();
    const orgId = selectedOrgId || data?.organizations[0]?.id;
    const res = await fetch("/api/organiser/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: inviteEmail,
        role: inviteRole,
        organizationId: orgId,
        eventId: inviteEventId || null
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setNotice(json?.error ?? "Failed to invite staff");
      return;
    }
    setInviteEmail("");
    setNotice(`Invitation sent (${json.invitation.status}).`);
    await loadOverview();
  }

  async function handleRefundDecision(refundId: string, status: "APPROVED" | "REJECTED") {
    const res = await fetch(`/api/refunds/${encodeURIComponent(refundId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, resolutionNote: `Reviewed by organiser (${status})` })
    });
    if (res.ok) {
      setNotice(`Refund ${refundId} marked ${status}.`);
      await loadOverview();
    }
  }

  function downloadCsvReport() {
    if (!data) return;
    const rows = [
      ["Reference", "Event", "Attendee", "Status", "Subtotal", "Discount", "Total"],
      ...data.bookings.map((b) => [
        b.referenceCode,
        `"${b.eventTitle.replace(/"/g, '""')}"`,
        b.attendeeEmail,
        b.status,
        String(b.subtotalInr),
        String(b.discountInr),
        String(b.totalInr)
      ])
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nightlifez-organiser-bookings.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen pb-14">
      <AppHeader cities={data?.cities ?? SEED_CITIES} />
      <main className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-block rounded-full bg-[#efeafe] px-3 py-1 text-[11px] font-bold text-[#5b3df5]">
              Organiser Operations Console
            </span>
            <h1 className="mt-1 text-2xl font-extrabold text-[#111319]">
              Events, Inventory, Offers & Revenue
            </h1>
          </div>
          {data ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                aria-label="Select organization"
                className="rounded-xl border border-[#e4e6f0] bg-white px-3 py-2 text-xs font-bold"
              >
                {data.organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.approvalStatus})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={downloadCsvReport}
                className="rounded-xl border border-[#e4e6f0] bg-white px-3.5 py-2 text-xs font-bold text-[#111319]"
              >
                Export CSV
              </button>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#e4e6f0] bg-white p-8 text-sm text-[#5e6473]">
            Loading organiser workspace...
          </div>
        ) : error ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-[#dc2626] bg-white p-6">
              <h2 className="text-base font-extrabold text-[#dc2626]">Protected Organiser Portal</h2>
              <p className="mt-1 text-sm text-[#5e6473]">{error}</p>
              <Link
                href="/account"
                className="mt-4 inline-block rounded-xl bg-[#5b3df5] px-4 py-2 text-xs font-bold text-white"
              >
                Sign in with an Organiser Account →
              </Link>
            </div>
            <form onSubmit={handleRegisterOrganiser} className="space-y-3 rounded-3xl border border-[#e4e6f0] bg-white p-6">
              <h2 className="text-base font-extrabold text-[#111319]">Become an Organiser</h2>
              <p className="text-xs text-[#5e6473]">Already signed in? Register your organiser brand to launch events, trips &amp; memberships.</p>
              {regMsg ? <div className="rounded-xl bg-[#efeafe] px-3 py-2 text-xs font-bold text-[#5b3df5]">{regMsg}</div> : null}
              <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Brand / Collective Name" className="w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
              <input type="text" required value={regLegalName} onChange={(e) => setRegLegalName(e.target.value)} placeholder="Legal Entity Name" className="w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
              <div className="grid grid-cols-2 gap-2">
                <input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="Contact Email" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
                <select value={regCity} onChange={(e) => setRegCity(e.target.value)} className="rounded-xl border border-[#e4e6f0] bg-white px-3 py-2 text-xs font-bold">
                  {SEED_CITIES.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full rounded-xl bg-[#111319] py-2.5 text-xs font-extrabold text-white">
                Register Organiser Brand
              </button>
            </form>
          </div>
        ) : data ? (
          <>
            {notice ? (
              <div className="rounded-xl bg-[#dcfce7] px-4 py-2.5 text-xs font-bold text-[#16a34a]">
                {notice}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {(["analytics", "storefront", "payments", "events", "approvals", "guests", "offers", "promoters", "trips", "memberships", "orders", "staff", "finance"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold capitalize ${
                    tab === t
                      ? "bg-[#5b3df5] text-white"
                      : "border border-[#e4e6f0] bg-white text-[#5e6473]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === "analytics" ? (
              <section className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-[#e4e6f0] bg-white p-4">
                    <div className="text-xs font-bold text-[#5e6473]">Active Events</div>
                    <div className="mt-1 text-2xl font-extrabold text-[#111319]">{data.events.length}</div>
                  </div>
                  <div className="rounded-2xl border border-[#e4e6f0] bg-white p-4">
                    <div className="text-xs font-bold text-[#5e6473]">Confirmed Bookings</div>
                    <div className="mt-1 text-2xl font-extrabold text-[#111319]">
                      {data.bookings.filter((b) => b.status === "CONFIRMED_DEMO").length}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#e4e6f0] bg-white p-4">
                    <div className="text-xs font-bold text-[#5e6473]">Gross Demo Sales</div>
                    <div className="mt-1 text-2xl font-extrabold text-[#5b3df5]">
                      {formatInr(
                        data.bookings
                          .filter((b) => b.status === "CONFIRMED_DEMO")
                          .reduce((s, b) => s + b.totalInr, 0)
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#e4e6f0] bg-white p-4">
                    <div className="text-xs font-bold text-[#5e6473]">Pending Refunds</div>
                    <div className="mt-1 text-2xl font-extrabold text-[#d97706]">
                      {data.refunds.filter((r) => r.status === "REQUESTED").length}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
                  <h2 className="text-base font-extrabold text-[#111319]">Event Inventory & Check-In Summary</h2>
                  <div className="mt-3 space-y-2 text-xs">
                    {data.events.map((evt) => {
                      const remaining = evt.tiers.reduce((s, t) => s + t.remainingQuota, 0);
                      const total = evt.tiers.reduce((s, t) => s + t.totalQuota, 0);
                      return (
                        <div key={evt.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f6f7fb] px-3.5 py-2.5">
                          <div>
                            <div className="font-bold text-[#111319]">{evt.title}</div>
                            <div className="text-[#5e6473]">{evt.dateLabel} · {evt.venueName}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold">{remaining}/{total} remaining</span>
                            <span className="rounded-full bg-[#efeafe] px-2 py-0.5 font-bold text-[#5b3df5]">
                              {evt.lifecycleStatus ?? "PUBLISHED"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            ) : null}

            {tab === "storefront" && data.organizations.length > 0 ? (
              <OrganiserStorefrontPanel
                org={data.organizations.find((o) => o.id === selectedOrgId) ?? data.organizations[0]!}
                onSaved={async (msg) => {
                  setNotice(msg);
                  await loadOverview();
                }}
              />
            ) : null}

            {tab === "payments" && data.organizations.length > 0 ? (
              <OrganiserPaymentsPanel
                org={data.organizations.find((o) => o.id === selectedOrgId) ?? data.organizations[0]!}
                onUpdated={async (msg) => {
                  setNotice(msg);
                  await loadOverview();
                }}
              />
            ) : null}

            {tab === "approvals" ? (
              <OrganiserApprovalsPanel
                onUpdated={async (msg) => {
                  setNotice(msg);
                  await loadOverview();
                }}
              />
            ) : null}

            {tab === "guests" ? (
              <OrganiserGuestListPanel
                events={data.events}
                onUpdated={async (msg) => {
                  setNotice(msg);
                  await loadOverview();
                }}
              />
            ) : null}

            {tab === "promoters" && data.organizations.length > 0 ? (
              <OrganiserPromotersPanel
                org={data.organizations.find((o) => o.id === selectedOrgId) ?? data.organizations[0]!}
                onUpdated={async (msg) => {
                  setNotice(msg);
                  await loadOverview();
                }}
              />
            ) : null}

            {tab === "trips" && data.organizations.length > 0 ? (
              <OrganiserTripsPanel
                org={data.organizations.find((o) => o.id === selectedOrgId) ?? data.organizations[0]!}
                onUpdated={async (msg) => {
                  setNotice(msg);
                  await loadOverview();
                }}
              />
            ) : null}

            {tab === "memberships" && data.organizations.length > 0 ? (
              <OrganiserMembershipsPanel
                org={data.organizations.find((o) => o.id === selectedOrgId) ?? data.organizations[0]!}
                onUpdated={async (msg) => {
                  setNotice(msg);
                  await loadOverview();
                }}
              />
            ) : null}

            {tab === "events" ? (
              <section className="grid gap-6 lg:grid-cols-12">
                <form onSubmit={handleCreateEvent} className="space-y-3 rounded-2xl border border-[#e4e6f0] bg-white p-5 lg:col-span-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-extrabold text-[#111319]">
                      {editingEventId ? "Edit Event" : "Create & Publish Event"}
                    </h2>
                    {editingEventId ? (
                      <button type="button" onClick={resetEventForm} className="text-xs font-bold text-[#dc2626]">
                        Cancel Edit
                      </button>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    required
                    value={evtTitle}
                    onChange={(e) => setEvtTitle(e.target.value)}
                    placeholder="Event title"
                    className="w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={evtCategory} onChange={(e) => setEvtCategory(e.target.value)} className="rounded-xl border border-[#e4e6f0] bg-white px-2.5 py-2 text-xs font-bold">
                      <option value="concerts">Concerts</option>
                      <option value="parties">Parties</option>
                      <option value="festivals">Festivals</option>
                      <option value="nightlife">Nightlife</option>
                      <option value="comedy">Comedy</option>
                      <option value="music">Music</option>
                      <option value="sports">Sports</option>
                      <option value="workshops">Workshops</option>
                      <option value="meetups">Meetups</option>
                      <option value="experiences">Experiences</option>
                    </select>
                    <select value={evtCity} onChange={(e) => setEvtCity(e.target.value)} className="rounded-xl border border-[#e4e6f0] bg-white px-2.5 py-2 text-xs font-bold">
                      {data.cities.map((c) => (
                        <option key={c.slug} value={c.slug}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <select value={evtVenue} onChange={(e) => setEvtVenue(e.target.value)} className="w-full rounded-xl border border-[#e4e6f0] bg-white px-3 py-2 text-xs font-bold">
                    {data.venues.map((v) => (
                      <option key={v.slug} value={v.slug}>{v.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={evtDateLabel}
                    onChange={(e) => setEvtDateLabel(e.target.value)}
                    placeholder="Date label"
                    className="w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-sm"
                  />
                  <textarea
                    required
                    rows={2}
                    value={evtSummary}
                    onChange={(e) => setEvtSummary(e.target.value)}
                    placeholder="Event summary (min 10 chars)"
                    className="w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-sm"
                  />
                  <div className="space-y-2 rounded-xl bg-[#f6f7fb] p-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#5e6473]">
                      <span>Ticket Tiers ({tiersDraft.length})</span>
                      <button
                        type="button"
                        onClick={() =>
                          setTiersDraft((prev) => [
                            ...prev,
                            { name: "VIP Pass", priceInr: "2499", totalQuota: "50", maxPerOrder: "4" }
                          ])
                        }
                        className="text-[#5b3df5]"
                      >
                        + Add Tier
                      </button>
                    </div>
                    {tiersDraft.map((t, idx) => (
                      <div key={idx} className="grid grid-cols-4 gap-1.5">
                        <input
                          type="text"
                          value={t.name}
                          onChange={(e) =>
                            setTiersDraft((prev) =>
                              prev.map((row, i) => (i === idx ? { ...row, name: e.target.value } : row))
                            )
                          }
                          placeholder="Tier"
                          className="rounded-lg border border-[#e4e6f0] bg-white px-2 py-1.5 text-xs"
                        />
                        <input
                          type="number"
                          value={t.priceInr}
                          onChange={(e) =>
                            setTiersDraft((prev) =>
                              prev.map((row, i) => (i === idx ? { ...row, priceInr: e.target.value } : row))
                            )
                          }
                          placeholder="INR"
                          className="rounded-lg border border-[#e4e6f0] bg-white px-2 py-1.5 text-xs"
                        />
                        <input
                          type="number"
                          value={t.totalQuota}
                          onChange={(e) =>
                            setTiersDraft((prev) =>
                              prev.map((row, i) => (i === idx ? { ...row, totalQuota: e.target.value } : row))
                            )
                          }
                          placeholder="Quota"
                          className="rounded-lg border border-[#e4e6f0] bg-white px-2 py-1.5 text-xs"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={t.maxPerOrder}
                            onChange={(e) =>
                              setTiersDraft((prev) =>
                                prev.map((row, i) => (i === idx ? { ...row, maxPerOrder: e.target.value } : row))
                              )
                            }
                            placeholder="Max"
                            title="Max per order"
                            className="w-full rounded-lg border border-[#e4e6f0] bg-white px-2 py-1.5 text-xs"
                          />
                          {tiersDraft.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => setTiersDraft((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-xs font-bold text-[#dc2626]"
                            >
                              ×
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" value={evtGoalTickets} onChange={(e) => setEvtGoalTickets(e.target.value)} placeholder="Goal tickets" className="rounded-xl border border-[#e4e6f0] px-2 py-1.5 text-xs" />
                    <input type="number" value={evtGoalRevenue} onChange={(e) => setEvtGoalRevenue(e.target.value)} placeholder="Goal ₹" className="rounded-xl border border-[#e4e6f0] px-2 py-1.5 text-xs" />
                    <input type="number" value={evtMaxCapacity} onChange={(e) => setEvtMaxCapacity(e.target.value)} placeholder="Max capacity" className="rounded-xl border border-[#e4e6f0] px-2 py-1.5 text-xs" />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <label className="flex items-center gap-1.5 font-bold text-[#374151]">
                      <input type="checkbox" checked={evtApprovalRequired} onChange={(e) => setEvtApprovalRequired(e.target.checked)} />
                      Require Guest Approval
                    </label>
                    <select
                      value={evtVisibility}
                      onChange={(e) => setEvtVisibility(e.target.value as "PUBLIC" | "UNLISTED" | "INVITE_ONLY")}
                      className="rounded-lg border border-[#e4e6f0] bg-white px-2 py-1 text-xs font-bold"
                    >
                      <option value="PUBLIC">Public</option>
                      <option value="UNLISTED">Unlisted Link</option>
                      <option value="INVITE_ONLY">Invite Only</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full rounded-xl bg-[#5b3df5] py-2.5 text-xs font-extrabold text-white">
                    {editingEventId ? "Save Event Changes" : "Publish Event"}
                  </button>
                </form>

                <div className="space-y-3 lg:col-span-7">
                  {data.events.map((evt) => (
                    <div key={evt.id} className="rounded-2xl border border-[#e4e6f0] bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-extrabold text-[#111319]">{evt.title}</div>
                          <div className="text-xs text-[#5e6473]">{evt.dateLabel} · {evt.venueName}</div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                          <Link href={`/events/${evt.slug}`} className="rounded-lg border border-[#e4e6f0] px-2.5 py-1">Preview</Link>
                          <button type="button" onClick={() => startEditEvent(evt)} className="rounded-lg border border-[#111319] px-2.5 py-1 text-[#111319]">Edit</button>
                          <button type="button" onClick={() => setDupTargetId(dupTargetId === evt.id ? null : evt.id)} className="rounded-lg border border-[#5b3df5] px-2.5 py-1 text-[#5b3df5]">Run it again</button>
                          <button type="button" onClick={() => setQuestionEventId(questionEventId === evt.id ? null : evt.id)} className="rounded-lg border border-[#e4e6f0] px-2.5 py-1">Questions</button>
                          <button type="button" onClick={() => void handleLifecycleToggle(evt, "PAUSED")} className="rounded-lg border border-[#d97706] px-2.5 py-1 text-[#d97706]">Pause</button>
                          <button type="button" onClick={() => void handleLifecycleToggle(evt, "PUBLISHED")} className="rounded-lg border border-[#16a34a] px-2.5 py-1 text-[#16a34a]">Publish</button>
                        </div>
                      </div>
                      {dupTargetId === evt.id ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-[#efeafe] p-3 text-xs">
                          <input
                            type="text"
                            value={dupDateLabel}
                            onChange={(e) => setDupDateLabel(e.target.value)}
                            placeholder="New date label"
                            className="flex-1 rounded-lg border border-[#e4e6f0] bg-white px-2.5 py-1.5 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => void handleDuplicateEvent(evt.id)}
                            className="rounded-lg bg-[#5b3df5] px-3 py-1.5 font-bold text-white"
                          >
                            Create Draft Copy
                          </button>
                        </div>
                      ) : null}
                      {questionEventId === evt.id ? (
                        <OrganiserQuestionBuilder
                          event={evt}
                          onSaved={async (msg) => {
                            setNotice(msg);
                            await loadOverview();
                          }}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {tab === "offers" ? (
              <section className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
                <h2 className="text-base font-extrabold text-[#111319]">Create Event Promo Code</h2>
                <form onSubmit={handleCreateOffer} className="mt-3 grid gap-3 sm:grid-cols-4">
                  <select value={offerEventId} onChange={(e) => setOfferEventId(e.target.value)} className="rounded-xl border border-[#e4e6f0] bg-white px-3 py-2 text-xs font-bold">
                    {data.events.map((e) => (
                      <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                  </select>
                  <input type="text" required value={offerCode} onChange={(e) => setOfferCode(e.target.value)} placeholder="Code (e.g. VIP20)" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
                  <input type="text" required value={offerTitle} onChange={(e) => setOfferTitle(e.target.value)} placeholder="Title (e.g. 20% OFF)" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
                  <button type="submit" className="rounded-xl bg-[#5b3df5] px-4 py-2 text-xs font-bold text-white">Create Promo</button>
                </form>
              </section>
            ) : null}

            {tab === "orders" ? (
              <section className="space-y-4">
                <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
                  <h2 className="text-base font-extrabold text-[#111319]">Refund Requests ({data.refunds.length})</h2>
                  <div className="mt-3 space-y-2 text-xs">
                    {data.refunds.length === 0 ? (
                      <p className="text-[#5e6473]">No refund requests yet.</p>
                    ) : (
                      data.refunds.map((r) => (
                        <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f6f7fb] p-3">
                          <div>
                            <div className="font-bold">{r.bookingId} · {formatInr(r.amountInr)} · {r.status}</div>
                            <div className="text-[#5e6473]">{r.reason}</div>
                          </div>
                          {r.status === "REQUESTED" ? (
                            <div className="flex gap-2">
                              <button type="button" onClick={() => void handleRefundDecision(r.id, "APPROVED")} className="rounded-lg bg-[#16a34a] px-3 py-1 font-bold text-white">Approve</button>
                              <button type="button" onClick={() => void handleRefundDecision(r.id, "REJECTED")} className="rounded-lg bg-[#dc2626] px-3 py-1 font-bold text-white">Reject</button>
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
                  <h2 className="text-base font-extrabold text-[#111319]">Attendees & Orders ({data.bookings.length})</h2>
                  <div className="mt-3 space-y-2 text-xs">
                    {data.bookings.map((b) => (
                      <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e4e6f0] p-3">
                        <div>
                          <div className="font-bold">{b.referenceCode} · {b.attendeeName} ({b.attendeeEmail})</div>
                          <div className="text-[#5e6473]">{b.eventTitle}</div>
                        </div>
                        <div className="font-bold">{formatInr(b.totalInr)} · {b.status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {tab === "staff" ? (
              <section className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
                <h2 className="text-base font-extrabold text-[#111319]">Invite Event Staff</h2>
                <form onSubmit={handleInviteStaff} className="mt-3 grid gap-3 sm:grid-cols-4">
                  <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="staff@example.com" className="rounded-xl border border-[#e4e6f0] px-3 py-2 text-xs" />
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="rounded-xl border border-[#e4e6f0] bg-white px-3 py-2 text-xs font-bold">
                    <option value="checkin_staff">Check-in Staff</option>
                    <option value="box_office">Box Office</option>
                    <option value="event_manager">Event Manager</option>
                    <option value="organiser_admin">Organiser Admin</option>
                  </select>
                  <select value={inviteEventId} onChange={(e) => setInviteEventId(e.target.value)} className="rounded-xl border border-[#e4e6f0] bg-white px-3 py-2 text-xs font-bold">
                    {data.events.map((e) => (
                      <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                  </select>
                  <button type="submit" className="rounded-xl bg-[#5b3df5] px-4 py-2 text-xs font-bold text-white">Send Invite</button>
                </form>
                <div className="mt-4 space-y-2 text-xs">
                  {data.invitations.map((inv) => (
                    <div key={inv.id} className="flex justify-between rounded-xl bg-[#f6f7fb] px-3 py-2">
                      <span>{inv.email} · {inv.role}</span>
                      <span className="font-bold text-[#5b3df5]">{inv.status}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {tab === "finance" ? (
              <section className="space-y-4">
                <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
                  <h2 className="text-base font-extrabold text-[#111319]">Settlement Batches ({data.settlements.length})</h2>
                  <div className="mt-3 space-y-2 text-xs">
                    {data.settlements.map((s) => (
                      <div key={s.id} className="flex justify-between rounded-xl bg-[#f6f7fb] p-3">
                        <span className="font-bold">{s.periodLabel} · {s.status}</span>
                        <span className="font-extrabold text-[#16a34a]">Net: {formatInr(s.netPayoutInr)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
                  <h2 className="text-base font-extrabold text-[#111319]">Ledger Entries ({data.ledger.length})</h2>
                  <div className="mt-3 space-y-1.5 text-xs">
                    {data.ledger.slice(0, 20).map((l) => (
                      <div key={l.id} className="flex justify-between rounded-lg bg-[#f6f7fb] px-3 py-2">
                        <span>{l.entryType} · {l.note}</span>
                        <span className="font-bold">{formatInr(l.amountInr)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
