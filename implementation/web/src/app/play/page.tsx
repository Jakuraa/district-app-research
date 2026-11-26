import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { ActivityCard, EmptyState } from "@/components/DiscoveryCards";
import { listActivities, listCitiesAndEvents } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function PlayPage({
  searchParams
}: {
  searchParams: Promise<{ city?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const city = sp.city ?? "all";
  const category = sp.category ?? "all";

  const [{ cities }, activities] = await Promise.all([
    listCitiesAndEvents({ city }),
    listActivities({ city, category })
  ]);

  return (
    <div className="min-h-screen pb-14">
      <AppHeader cities={cities} selectedCity={city} />

      <main className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-6">
        <div>
          <span className="inline-block rounded-full bg-[#efeafe] px-3 py-1 text-[11px] font-bold text-[#5b3df5]">
            Demo Activity Partner Inventory
          </span>
          <h1 className="mt-2 text-2xl font-extrabold text-[#111319] sm:text-3xl">
            Play & Activities
          </h1>
          <p className="mt-1 text-sm text-[#5e6473]">
            Padel courts, kayaking, ceramic workshops & floodlit karting.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-[#e4e6f0] bg-white p-4">
          {[
            { key: "all", label: "All Play" },
            { key: "sports", label: "Sports" },
            { key: "recreation", label: "Recreation" },
            { key: "workshops", label: "Workshops" },
            { key: "adventure", label: "Adventure" }
          ].map((c) => (
            <Link
              key={c.key}
              href={c.key === "all" ? "/play" : `/play?category=${c.key}`}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${
                category === c.key
                  ? "border-[#5b3df5] bg-[#5b3df5] text-white"
                  : "border-[#e4e6f0] bg-[#f6f7fb] text-[#111319]"
              }`}
            >
              {c.label}
            </Link>
          ))}
        </div>

        {activities.length === 0 ? (
          <EmptyState
            title="No activities in this category"
            description="Try switching to All Play or All Cities."
            actionHref="/play"
            actionLabel="View All Activities"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activities.map((a) => (
              <ActivityCard key={a.id} activity={a} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
