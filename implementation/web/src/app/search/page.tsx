import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { ArtistCard, EmptyState } from "@/components/DiscoveryCards";
import { EventCard } from "@/components/EventCard";
import { listArtists, listCitiesAndEvents } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; city?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const city = sp.city ?? "all";
  const scope = sp.type === "events" || sp.type === "artists" ? sp.type : "all";

  const [{ cities, events }, artists] = await Promise.all([
    listCitiesAndEvents({ q, city }),
    listArtists(city)
  ]);

  const matchingArtists = q.trim()
    ? artists.filter(
        (a) =>
          a.name.toLowerCase().includes(q.toLowerCase()) ||
          a.genres.some((g) => g.toLowerCase().includes(q.toLowerCase()))
      )
    : artists.slice(0, 4);

  const suggestions = ["Solstice", "Coimbatore", "Comedy", "Bengaluru", "Goa", "Techno"];
  const totalCount =
    (scope === "all" || scope === "events" ? events.length : 0) +
    (scope === "all" || scope === "artists" ? matchingArtists.length : 0);

  return (
    <div className="min-h-screen pb-14">
      <AppHeader cities={cities} selectedCity={city} />

      <main className="mx-auto max-w-6xl space-y-7 px-3 py-6 sm:px-6">
        <form action="/search" method="GET" className="flex flex-wrap gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search events, parties, artists, or venues..."
            aria-label="Search NIGHTLIFEZ"
            className="min-w-0 flex-1 rounded-2xl border border-[#e4e6f0] bg-white px-4 py-3 text-sm outline-none focus:border-[#5b3df5]"
          />
          <select
            name="type"
            defaultValue={scope}
            aria-label="Filter search category"
            className="rounded-2xl border border-[#e4e6f0] bg-white px-3 py-3 text-sm font-semibold text-[#111319]"
          >
            <option value="all">All</option>
            <option value="events">Events</option>
            <option value="artists">Artists</option>
          </select>
          <button
            type="submit"
            className="rounded-2xl bg-[#5b3df5] px-6 py-3 text-sm font-bold text-white hover:bg-[#4328d6]"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#5e6473]">Trending searches:</span>
          {suggestions.map((term) => (
            <Link
              key={term}
              href={`/search?q=${encodeURIComponent(term)}`}
              className="rounded-full border border-[#e4e6f0] bg-white px-3 py-1 text-xs font-semibold text-[#111319] hover:border-[#5b3df5]"
            >
              {term}
            </Link>
          ))}
        </div>

        {totalCount === 0 ? (
          <EmptyState
            title={`No results matched "${q}"`}
            description="Try searching for a city, genre, artist, or event."
            actionHref="/events"
            actionLabel="Browse Events"
          />
        ) : (
          <div className="space-y-8">
            {(scope === "all" || scope === "events") && events.length > 0 ? (
              <section>
                <h2 className="mb-3 text-lg font-extrabold text-[#111319]">
                  Events ({events.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {events.map((evt) => (
                    <EventCard key={evt.id} event={evt} />
                  ))}
                </div>
              </section>
            ) : null}

            {(scope === "all" || scope === "artists") && matchingArtists.length > 0 ? (
              <section>
                <h2 className="mb-3 text-lg font-extrabold text-[#111319]">
                  Artists ({matchingArtists.length})
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {matchingArtists.map((artist) => (
                    <ArtistCard key={artist.slug} artist={artist} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
