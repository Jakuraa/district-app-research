import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { EventCard } from "@/components/EventCard";
import { listCitiesAndEvents } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; city?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const city = sp.city ?? "all";
  const { cities, events } = await listCitiesAndEvents({ q, city });

  const suggestions = ["Solstice", "Coimbatore", "Comedy", "Goa"];

  return (
    <div className="min-h-screen">
      <AppHeader cities={cities} selectedCity={city} />

      <main className="mx-auto max-w-5xl space-y-6 px-3 py-6 sm:px-6">
        <form action="/search" method="GET" className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search events, artists, or venues..."
            aria-label="Search events"
            className="min-w-0 flex-1 rounded-2xl border border-[#e4e6f0] bg-white px-4 py-3 text-sm"
          />
          <button
            type="submit"
            className="rounded-2xl bg-[#5b3df5] px-5 py-3 text-sm font-semibold text-white"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#5e6473]">Trending:</span>
          {suggestions.map((term) => (
            <Link
              key={term}
              href={`/search?q=${encodeURIComponent(term)}`}
              className="rounded-full border border-[#e4e6f0] bg-white px-3 py-1 text-xs font-medium text-[#111319] hover:border-[#5b3df5]"
            >
              {term}
            </Link>
          ))}
        </div>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-[#e4e6f0] bg-white p-8 text-center text-sm text-[#5e6473]">
            No events matched &ldquo;{q}&rdquo;.
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
