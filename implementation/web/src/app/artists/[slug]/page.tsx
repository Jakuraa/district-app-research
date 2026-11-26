import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { EventCard } from "@/components/EventCard";
import { getArtistDetail, listCitiesAndEvents } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function ArtistDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [detail, { cities }] = await Promise.all([getArtistDetail(slug), listCitiesAndEvents()]);
  if (!detail) notFound();

  const { artist, events } = detail;

  return (
    <div className="min-h-screen pb-14">
      <AppHeader cities={cities} selectedCity={artist.citySlug} />

      <main className="mx-auto max-w-5xl space-y-6 px-3 py-6 sm:px-6">
        <section className="flex flex-col items-center gap-5 rounded-3xl border border-[#e4e6f0] bg-white p-6 text-center sm:flex-row sm:text-left">
          <div className="h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-[#efeafe]">
            <img src={artist.artworkUrl} alt={artist.name} className="h-full w-full object-cover" />
          </div>
          <div className="space-y-2">
            <span className="inline-block rounded-full bg-[#efeafe] px-3 py-1 text-xs font-bold text-[#5b3df5]">
              {artist.role} · {artist.followersLabel}
            </span>
            <h1 className="text-2xl font-extrabold text-[#111319] sm:text-3xl">{artist.name}</h1>
            <p className="max-w-2xl text-sm text-[#5e6473]">{artist.bio}</p>
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              {artist.genres.map((g) => (
                <span
                  key={g}
                  className="rounded-full border border-[#e4e6f0] bg-[#f6f7fb] px-3 py-0.5 text-xs font-semibold text-[#111319]"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-extrabold text-[#111319]">Upcoming Shows</h2>
          {events.length === 0 ? (
            <p className="text-sm text-[#5e6473]">No upcoming events listed right now.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((evt) => (
                <EventCard key={evt.id} event={evt} />
              ))}
            </div>
          )}
          <Link href="/events" className="mt-5 inline-block text-xs font-bold text-[#5b3df5] underline">
            ← Explore all events
          </Link>
        </section>
      </main>
    </div>
  );
}
