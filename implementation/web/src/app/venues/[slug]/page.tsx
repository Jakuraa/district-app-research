import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { EventCard } from "@/components/EventCard";
import { getVenueDetail, listCitiesAndEvents } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function VenueGuidePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [detail, list] = await Promise.all([getVenueDetail(slug), listCitiesAndEvents()]);
  if (!detail) notFound();

  const { venue, upcomingEvents } = detail;

  return (
    <div className="min-h-screen">
      <AppHeader cities={list.cities} selectedCity={venue.citySlug} />

      <main className="mx-auto max-w-5xl space-y-6 px-3 py-6 sm:px-6">
        <section className="rounded-3xl border border-[#e4e6f0] bg-white p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[#5b3df5]">
            {venue.headline}
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-[#111319] sm:text-3xl">
            {venue.name}
          </h1>
          <p className="mt-1 text-sm text-[#5e6473]">{venue.address}</p>
          <p className="mt-3 text-sm text-[#111319]">{venue.summary}</p>
          <div className="mt-4 inline-block rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-semibold text-[#16a34a]">
            {venue.openStatusLabel}
          </div>
        </section>

        <div className="grid gap-6 sm:grid-cols-2">
          <section className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
            <h2 className="text-base font-bold">Venue Timings</h2>
            <dl className="mt-3 divide-y divide-[#e4e6f0] text-sm">
              {venue.timings.map((t) => (
                <div key={t.day} className="flex justify-between py-2">
                  <dt className="font-medium text-[#111319]">{t.day}</dt>
                  <dd className="text-[#5e6473]">{t.hours}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
            <h2 className="text-base font-bold">Venue Facilities</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {venue.facilities.map((fac) => (
                <span
                  key={fac}
                  className="rounded-full border border-[#e4e6f0] bg-[#f6f7fb] px-3 py-1.5 text-xs font-medium"
                >
                  {fac}
                </span>
              ))}
            </div>
          </section>
        </div>

        <section>
          <h2 className="mb-4 text-lg font-bold">Happening Here</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {upcomingEvents.map((evt) => (
              <EventCard key={evt.id} event={evt} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
