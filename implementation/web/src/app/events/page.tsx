import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { EventCard } from "@/components/EventCard";
import { listCitiesAndEvents } from "@/lib/repository";
import type { EventQueryInput } from "@pulsepass/shared";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "concerts", label: "Concerts" },
  { key: "festivals", label: "Festivals" },
  { key: "comedy", label: "Comedy" }
] as const;

const DATE_WINDOWS = [
  { key: "all", label: "Any Date" },
  { key: "weekend", label: "This Weekend" },
  { key: "today", label: "Today" }
] as const;

export default async function EventsPage({
  searchParams
}: {
  searchParams: Promise<{
    city?: string;
    category?: EventQueryInput["category"];
    dateWindow?: EventQueryInput["dateWindow"];
    sort?: EventQueryInput["sort"];
  }>;
}) {
  const sp = await searchParams;
  const city = sp.city ?? "all";
  const category = sp.category ?? "all";
  const dateWindow = sp.dateWindow ?? "all";
  const sort = sp.sort ?? "featured";

  const { cities, events } = await listCitiesAndEvents({
    city,
    category,
    dateWindow,
    sort
  });

  function buildHref(overrides: Record<string, string>) {
    const params = new URLSearchParams({
      city,
      category,
      dateWindow,
      sort,
      ...overrides
    });
    return `/events?${params.toString()}`;
  }

  return (
    <div className="min-h-screen">
      <AppHeader cities={cities} selectedCity={city} />

      <main className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-[#111319]">Discover Events</h1>
            <p className="text-sm text-[#5e6473]">
              Filter by category, date window, or price.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Link
              href={buildHref({ sort: "price_asc" })}
              className={`rounded-full border px-3 py-1.5 font-semibold ${
                sort === "price_asc"
                  ? "border-[#5b3df5] bg-[#efeafe] text-[#5b3df5]"
                  : "border-[#e4e6f0] bg-white"
              }`}
            >
              Price: Low to High
            </Link>
            <Link
              href={buildHref({ sort: "date_asc" })}
              className={`rounded-full border px-3 py-1.5 font-semibold ${
                sort === "date_asc"
                  ? "border-[#5b3df5] bg-[#efeafe] text-[#5b3df5]"
                  : "border-[#e4e6f0] bg-white"
              }`}
            >
              Soonest
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Link
              key={c.key}
              href={buildHref({ category: c.key })}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold sm:text-sm ${
                category === c.key
                  ? "border-[#5b3df5] bg-[#5b3df5] text-white"
                  : "border-[#e4e6f0] bg-white text-[#111319]"
              }`}
            >
              {c.label}
            </Link>
          ))}
          {DATE_WINDOWS.map((d) => (
            <Link
              key={d.key}
              href={buildHref({ dateWindow: d.key })}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold sm:text-sm ${
                dateWindow === d.key
                  ? "border-[#111319] bg-[#111319] text-white"
                  : "border-[#e4e6f0] bg-white text-[#5e6473]"
              }`}
            >
              {d.label}
            </Link>
          ))}
        </div>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-[#e4e6f0] bg-white p-8 text-center text-sm text-[#5e6473]">
            No matching events. Try clearing your filters.
          </div>
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
