import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { EventCard } from "@/components/EventCard";
import { listCitiesAndEvents } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const sp = await searchParams;
  const city = sp.city ?? "all";
  const { cities, events } = await listCitiesAndEvents({ city });
  const featured = events.filter((e) => e.isFeatured);

  return (
    <div className="min-h-screen">
      <AppHeader cities={cities} selectedCity={city} />

      <main className="mx-auto max-w-6xl space-y-8 px-3 py-6 sm:px-6">
        <section className="rounded-3xl bg-gradient-to-br from-[#111319] via-[#1f1b3d] to-[#5b3df5] p-6 text-white sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#c4b5fd]">
            Independent Live Discovery · Demo Mode
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-4xl">
            Concerts, festivals & city culture — built clean-room.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/80 sm:text-base">
            Explore curated live events, compare multi-phase ticket availability, preview offers, and
            test end-to-end reservations with zero real payments.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={city === "all" ? "/events" : `/events?city=${encodeURIComponent(city)}`}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#111319] hover:bg-[#f6f7fb]"
            >
              Explore All Events
            </Link>
            <Link
              href="/search"
              className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Search Events & Venues
            </Link>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#111319] sm:text-xl">Featured Experiences</h2>
            <Link href="/events" className="text-sm font-semibold text-[#5b3df5]">
              View all →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(featured.length > 0 ? featured : events).map((evt) => (
              <EventCard key={evt.id} event={evt} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold text-[#111319] sm:text-xl">All Upcoming Events</h2>
          {events.length === 0 ? (
            <div className="rounded-2xl border border-[#e4e6f0] bg-white p-8 text-center text-sm text-[#5e6473]">
              No events found for this city filter yet. Try switching to All Cities.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((evt) => (
                <EventCard key={evt.id} event={evt} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
