import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState, RestaurantCard } from "@/components/DiscoveryCards";
import { listCitiesAndEvents, listRestaurants } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function DiningPage({
  searchParams
}: {
  searchParams: Promise<{ city?: string; cuisine?: string; maxBudget?: string }>;
}) {
  const sp = await searchParams;
  const city = sp.city ?? "all";
  const cuisine = sp.cuisine ?? "all";
  const maxBudget = sp.maxBudget ? Number(sp.maxBudget) : undefined;

  const [{ cities }, restaurants] = await Promise.all([
    listCitiesAndEvents({ city }),
    listRestaurants({ city, cuisine, maxBudget })
  ]);

  function buildHref(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    const merged = { city, cuisine, maxBudget: sp.maxBudget ?? "", ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "all") params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/dining?${qs}` : "/dining";
  }

  return (
    <div className="min-h-screen pb-14">
      <AppHeader cities={cities} selectedCity={city} />

      <main className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-6">
        <div>
          <span className="inline-block rounded-full bg-[#dcfce7] px-3 py-1 text-[11px] font-bold text-[#059669]">
            Demo Restaurant Partner Inventory
          </span>
          <h1 className="mt-2 text-2xl font-extrabold text-[#111319] sm:text-3xl">
            Dining & Table Offers
          </h1>
          <p className="mt-1 text-sm text-[#5e6473]">
            Curated restaurants, bill-pay discounts & table reservation slots.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-[#e4e6f0] bg-white p-4">
          {["all", "Coastal", "Pan-Asian", "South Indian", "Goan", "Deccani"].map((c) => (
            <Link
              key={c}
              href={buildHref({ cuisine: c })}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${
                cuisine === c
                  ? "border-[#5b3df5] bg-[#5b3df5] text-white"
                  : "border-[#e4e6f0] bg-[#f6f7fb] text-[#111319]"
              }`}
            >
              {c === "all" ? "All Cuisines" : c}
            </Link>
          ))}
          {[
            { key: "", label: "Any Budget" },
            { key: "1500", label: "Under ₹1,500 for two" },
            { key: "2200", label: "Under ₹2,200 for two" }
          ].map((b) => (
            <Link
              key={b.label}
              href={buildHref({ maxBudget: b.key })}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                (sp.maxBudget ?? "") === b.key
                  ? "border-[#111319] bg-[#111319] text-white"
                  : "border-[#e4e6f0] bg-white text-[#5e6473]"
              }`}
            >
              {b.label}
            </Link>
          ))}
        </div>

        {restaurants.length === 0 ? (
          <EmptyState
            title="No restaurants match your filters"
            description="Try clearing cuisine or budget filters."
            actionHref="/dining"
            actionLabel="Show All Restaurants"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
