import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInr } from "@nightlifez/shared";
import { AppHeader } from "@/components/AppHeader";
import { getMovieDetail, listCitiesAndEvents } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function MovieDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [movie, { cities }] = await Promise.all([getMovieDetail(slug), listCitiesAndEvents()]);
  if (!movie) notFound();

  return (
    <div className="min-h-screen pb-14">
      <AppHeader cities={cities} />

      <main className="mx-auto max-w-5xl space-y-6 px-3 py-6 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-[#e4e6f0] bg-[#111319] text-white">
          <div className="grid gap-6 p-5 sm:p-8 md:grid-cols-12">
            <div className="aspect-[2/3] overflow-hidden rounded-2xl md:col-span-4">
              <img src={movie.artworkUrl} alt={movie.title} className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-col justify-between gap-4 md:col-span-8">
              <div>
                <span className="inline-block rounded-full bg-[#5b3df5] px-3 py-1 text-[11px] font-bold">
                  DEMO SHOWTIME SCHEDULE · NO LIVE CINEMA API
                </span>
                <h1 className="mt-3 text-2xl font-extrabold sm:text-4xl">{movie.title}</h1>
                <p className="mt-2 text-sm text-white/80">
                  {movie.language} · {movie.genres.join(", ")} · {movie.durationLabel} ·{" "}
                  {movie.certificate}
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                  <span className="text-[#4ade80]">★ {movie.rating.toFixed(1)}</span>
                  <span>{movie.releaseLabel}</span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-white/80">{movie.synopsis}</p>
              </div>
              <Link href="/movies" className="text-xs font-bold text-[#c4b5fd] underline">
                ← Back to all movies
              </Link>
            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-[#e4e6f0] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-[#111319]">Available Cinemas & Showtimes</h2>
          <p className="mt-1 text-xs text-[#5e6473]">
            Representative demo showtimes — seat allocation is only enabled when individual cinema seat maps are connected.
          </p>

          <div className="mt-4 space-y-3">
            {movie.showtimes.map((sh) => (
              <div
                key={sh.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e4e6f0] bg-[#f6f7fb] p-4"
              >
                <div>
                  <div className="text-sm font-extrabold text-[#111319]">{sh.cinemaName}</div>
                  <div className="text-xs text-[#5e6473]">
                    {sh.locality} · {sh.dateLabel} · {sh.format}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-xl border border-[#5b3df5] bg-white px-3.5 py-2 text-xs font-extrabold text-[#5b3df5]">
                    {sh.timeLabel}
                  </span>
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-[#111319]">
                      {formatInr(sh.priceInr)}
                    </div>
                    <div className="text-[10px] font-semibold text-[#16a34a]">
                      {sh.availability.replace("_", " ")}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
