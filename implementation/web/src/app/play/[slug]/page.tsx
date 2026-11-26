import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInr } from "@nightlifez/shared";
import { AppHeader } from "@/components/AppHeader";
import { getActivityDetail, listCitiesAndEvents } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function PlayDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [activity, { cities }] = await Promise.all([
    getActivityDetail(slug),
    listCitiesAndEvents()
  ]);
  if (!activity) notFound();

  return (
    <div className="min-h-screen pb-14">
      <AppHeader cities={cities} selectedCity={activity.citySlug} />

      <main className="mx-auto max-w-5xl space-y-6 px-3 py-6 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-[#e4e6f0] bg-white">
          <div className="aspect-[16/9] max-h-[340px] w-full overflow-hidden bg-[#111319]">
            <img src={activity.artworkUrl} alt={activity.title} className="h-full w-full object-cover" />
          </div>
          <div className="p-5 sm:p-8">
            <span className="inline-block rounded-full bg-[#efeafe] px-3 py-1 text-[11px] font-bold uppercase text-[#5b3df5]">
              {activity.category} · Demo Slot Inventory
            </span>
            <h1 className="mt-2 text-2xl font-extrabold text-[#111319] sm:text-3xl">
              {activity.title}
            </h1>
            <p className="mt-1 text-sm text-[#5e6473]">
              {activity.venueName} · {activity.locality} · {activity.durationLabel}
            </p>
            <p className="mt-2 text-lg font-extrabold text-[#5b3df5]">
              {formatInr(activity.priceInr)} per session
            </p>

            <div className="mt-5 grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="text-sm font-extrabold text-[#111319]">Available Slots</h2>
                <div className="mt-2 space-y-2">
                  {activity.slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between rounded-xl border border-[#e4e6f0] bg-[#f6f7fb] px-3.5 py-2.5 text-xs font-semibold"
                    >
                      <span>{slot.label}</span>
                      <span className="text-[#16a34a]">{slot.remaining} spots left</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-[#111319]">Booking Rules</h2>
                <ul className="mt-2 space-y-1.5 text-xs text-[#5e6473]">
                  {activity.rules.map((r) => (
                    <li key={r}>• {r}</li>
                  ))}
                </ul>
              </div>
            </div>

            <Link href="/play" className="mt-6 inline-block text-xs font-bold text-[#5b3df5] underline">
              ← Back to Play & Activities
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
