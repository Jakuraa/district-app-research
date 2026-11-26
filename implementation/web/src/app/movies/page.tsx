import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState, MovieCard } from "@/components/DiscoveryCards";
import { listCitiesAndEvents, listMovies } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function MoviesPage({
  searchParams
}: {
  searchParams: Promise<{ city?: string; language?: string; genre?: string }>;
}) {
  const sp = await searchParams;
  const city = sp.city ?? "all";
  const language = sp.language ?? "all";
  const genre = sp.genre ?? "all";

  const [{ cities }, movies] = await Promise.all([
    listCitiesAndEvents({ city }),
    listMovies({ city, language, genre })
  ]);

  function buildHref(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    const merged = { city, language, genre, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "all") params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/movies?${qs}` : "/movies";
  }

  return (
    <div className="min-h-screen pb-14">
      <AppHeader cities={cities} selectedCity={city} />

      <main className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-block rounded-full bg-[#efeafe] px-3 py-1 text-[11px] font-bold text-[#5b3df5]">
              Demo Cinema Partner Inventory
            </span>
            <h1 className="mt-2 text-2xl font-extrabold text-[#111319] sm:text-3xl">
              Movies & Showtimes
            </h1>
            <p className="mt-1 text-sm text-[#5e6473]">
              Explore IMAX, Dolby Atmos, and 4DX screenings near you.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-[#e4e6f0] bg-white p-4">
          {["all", "Hindi", "Tamil", "English", "Malayalam"].map((lang) => (
            <Link
              key={lang}
              href={buildHref({ language: lang })}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${
                language === lang
                  ? "border-[#5b3df5] bg-[#5b3df5] text-white"
                  : "border-[#e4e6f0] bg-[#f6f7fb] text-[#111319]"
              }`}
            >
              {lang === "all" ? "All Languages" : lang}
            </Link>
          ))}
          {["all", "Thriller", "Action", "Sci-Fi", "Comedy"].map((g) => (
            <Link
              key={g}
              href={buildHref({ genre: g })}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                genre === g
                  ? "border-[#111319] bg-[#111319] text-white"
                  : "border-[#e4e6f0] bg-white text-[#5e6473]"
              }`}
            >
              {g === "all" ? "All Genres" : g}
            </Link>
          ))}
        </div>

        {movies.length === 0 ? (
          <EmptyState
            title="No movies found for these filters"
            description="Try switching language or genre to see available demo showtimes."
            actionHref="/movies"
            actionLabel="Show All Movies"
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {movies.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
