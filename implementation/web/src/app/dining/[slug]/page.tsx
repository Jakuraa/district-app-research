import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInr } from "@nightlifez/shared";
import { AppHeader } from "@/components/AppHeader";
import { getRestaurantDetail, listCitiesAndEvents } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function RestaurantDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [restaurant, { cities }] = await Promise.all([
    getRestaurantDetail(slug),
    listCitiesAndEvents()
  ]);
  if (!restaurant) notFound();

  return (
    <div className="min-h-screen pb-14">
      <AppHeader cities={cities} selectedCity={restaurant.citySlug} />

      <main className="mx-auto max-w-5xl space-y-6 px-3 py-6 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-[#e4e6f0] bg-white">
          <div className="aspect-[16/9] max-h-[360px] w-full overflow-hidden bg-[#111319]">
            <img
              src={restaurant.artworkUrl}
              alt={restaurant.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="p-5 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-block rounded-full bg-[#dcfce7] px-3 py-1 text-[11px] font-bold text-[#059669]">
                  DEMO TABLE RESERVATION · NO LIVE POS SYNC
                </span>
                <h1 className="mt-2 text-2xl font-extrabold text-[#111319] sm:text-3xl">
                  {restaurant.name}
                </h1>
                <p className="mt-1 text-sm text-[#5e6473]">
                  {restaurant.cuisines.join(", ")} · {formatInr(restaurant.budgetForTwoInr)} for two
                </p>
                <p className="mt-0.5 text-xs text-[#5e6473]">
                  {restaurant.locality} · {restaurant.distanceKm} km away
                </p>
              </div>
              <div className="rounded-2xl bg-[#16a34a] px-3.5 py-2 text-center text-white">
                <div className="text-lg font-extrabold">{restaurant.rating.toFixed(1)} ★</div>
                <div className="text-[10px] font-semibold">Dining Rating</div>
              </div>
            </div>

            {restaurant.offerText ? (
              <div className="mt-4 rounded-2xl bg-[#efeafe] p-3.5 text-sm font-bold text-[#5b3df5]">
                {restaurant.offerText}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              {restaurant.highlights.map((h) => (
                <span
                  key={h}
                  className="rounded-full border border-[#e4e6f0] bg-[#f6f7fb] px-3 py-1 text-xs font-semibold text-[#111319]"
                >
                  {h}
                </span>
              ))}
            </div>

            <div className="mt-6 border-t border-[#e4e6f0] pt-5">
              <h2 className="text-base font-extrabold text-[#111319]">Available Table Slots</h2>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {restaurant.availableSlots.map((slot) => (
                  <span
                    key={slot}
                    className="rounded-xl border border-[#5b3df5] bg-white px-4 py-2 text-xs font-bold text-[#5b3df5]"
                  >
                    {slot} (Demo)
                  </span>
                ))}
              </div>
              <Link href="/dining" className="mt-5 inline-block text-xs font-bold text-[#5b3df5] underline">
                ← Back to Dining
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
