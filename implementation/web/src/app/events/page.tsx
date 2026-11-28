import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { ArtistCard, EmptyState } from "@/components/DiscoveryCards";
import { EventCard } from "@/components/EventCard";
import { listArtists, listCitiesAndEvents } from "@/lib/repository";
import type { EventQueryInput } from "@nightlifez/shared";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  { key: "all", label: "All Events" },
  { key: "concerts", label: "Concerts" },
  { key: "parties", label: "Parties" },
  { key: "festivals", label: "Festivals" },
  { key: "nightlife", label: "Nightlife" },
  { key: "comedy", label: "Comedy" },
  { key: "music", label: "Music" },
  { key: "sports", label: "Sports" },
  { key: "workshops", label: "Workshops" },
  { key: "meetups", label: "Meetups" },
  { key: "experiences", label: "Experiences" }
] as const;

const DATE_WINDOWS = [
  { key: "all", label: "Any Date" },
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "weekend", label: "This Weekend" }
] as const;

const PRICE_FILTERS = [
  { key: "", label: "Any Price" },
  { key: "1000", label: "Under ₹1,000" },
  { key: "2000", label: "Under ₹2,000" },
  { key: "4000", label: "Under ₹4,000" }
] as const;

const DISTANCE_FILTERS = [
  { key: "", label: "Any Distance" },
  { key: "5", label: "Within 5 km" },
  { key: "10", label: "Within 10 km" }
] as const;

export default async function EventsPage({
  searchParams
}: {
  searchParams: Promise<{
    city?: string;
    category?: EventQueryInput["category"];
    dateWindow?: EventQueryInput["dateWindow"];
    maxPrice?: string;
    maxDist?: string;
    sort?: EventQueryInput["sort"];
  }>;
}) {
  const sp = await searchParams;
  const city = sp.city ?? "all";
  const category = sp.category ?? "all";
  const dateWindow = sp.dateWindow ?? "all";
  const maxPrice = sp.maxPrice ? Number(sp.maxPrice) : undefined;
  const maxDist = sp.maxDist ? Number(sp.maxDist) : undefined;
  const sort = sp.sort ?? "featured";

  const [{ cities, events }, artists] = await Promise.all([
    listCitiesAndEvents({
      city,
      category,
      dateWindow,
      maxPriceInr: maxPrice,
      maxDistanceKm: maxDist,
      sort
    }),
    listArtists(city)
  ]);

  function buildHref(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    const merged: Record<string, string> = {
      city,
      category,
      dateWindow,
      maxPrice: sp.maxPrice ?? "",
      maxDist: sp.maxDist ?? "",
      sort,
      ...overrides
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return `/events?${params.toString()}`;
  }

  return (
    <div className="min-h-screen pb-14">
      <AppHeader cities={cities} selectedCity={city} />

      <main className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-[#111319] sm:text-3xl">
              Discover Live Events
            </h1>
            <p className="mt-1 text-sm text-[#5e6473]">
              Concerts, festivals, comedy specials & nightlife curated for you.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {[
              { key: "featured", label: "Relevance" },
              { key: "date_asc", label: "Date: Soonest" },
              { key: "price_asc", label: "Price: Low to High" },
              { key: "price_desc", label: "Price: High to Low" }
            ].map((s) => (
              <Link
                key={s.key}
                href={buildHref({ sort: s.key })}
                className={`rounded-full border px-3 py-1.5 font-bold transition ${
                  sort === s.key
                    ? "border-[#5b3df5] bg-[#efeafe] text-[#5b3df5]"
                    : "border-[#e4e6f0] bg-white text-[#111319] hover:border-[#5b3df5]"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Filter Rails */}
        <div className="space-y-2.5 rounded-2xl border border-[#e4e6f0] bg-white p-4">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Link
                key={c.key}
                href={buildHref({ category: c.key })}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                  category === c.key
                    ? "border-[#5b3df5] bg-[#5b3df5] text-white"
                    : "border-[#e4e6f0] bg-[#f6f7fb] text-[#111319]"
                }`}
              >
                {c.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {DATE_WINDOWS.map((d) => (
              <Link
                key={d.key}
                href={buildHref({ dateWindow: d.key })}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  dateWindow === d.key
                    ? "border-[#111319] bg-[#111319] text-white"
                    : "border-[#e4e6f0] bg-white text-[#5e6473]"
                }`}
              >
                {d.label}
              </Link>
            ))}
            {PRICE_FILTERS.map((p) => (
              <Link
                key={p.label}
                href={buildHref({ maxPrice: p.key })}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  (sp.maxPrice ?? "") === p.key
                    ? "border-[#5b3df5] bg-[#efeafe] text-[#5b3df5]"
                    : "border-[#e4e6f0] bg-white text-[#5e6473]"
                }`}
              >
                {p.label}
              </Link>
            ))}
            {DISTANCE_FILTERS.map((dist) => (
              <Link
                key={dist.label}
                href={buildHref({ maxDist: dist.key })}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  (sp.maxDist ?? "") === dist.key
                    ? "border-[#059669] bg-[#dcfce7] text-[#059669]"
                    : "border-[#e4e6f0] bg-white text-[#5e6473]"
                }`}
              >
                {dist.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Artist Strip */}
        {artists.length > 0 ? (
          <section>
            <h2 className="mb-3 text-base font-extrabold text-[#111319]">Featured Artists</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {artists.slice(0, 6).map((artist) => (
                <ArtistCard key={artist.slug} artist={artist} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Event Grid */}
        {events.length === 0 ? (
          <EmptyState
            title="No events match these filters"
            description="Try clearing your price, distance, or date filters."
            actionHref="/events"
            actionLabel="Reset Filters"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((evt) => (
              <EventCard key={evt.id} event={evt} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
