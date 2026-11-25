import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInr, getMinTierPrice } from "@pulsepass/shared";
import { AppHeader } from "@/components/AppHeader";
import { getEventDetail, listCitiesAndEvents } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [detail, list] = await Promise.all([getEventDetail(slug), listCitiesAndEvents()]);
  if (!detail) notFound();

  const { event } = detail;
  const minPrice = getMinTierPrice(event.tiers);
  const topOffer = event.offers[0];

  return (
    <div className="min-h-screen pb-28 sm:pb-12">
      <AppHeader cities={list.cities} selectedCity={event.citySlug} />

      <main className="mx-auto max-w-5xl space-y-6 px-3 py-6 sm:px-6">
        <section
          className="rounded-3xl p-6 text-white sm:p-8"
          style={{
            background: `linear-gradient(135deg, ${event.accentColor}, #111319)`
          }}
        >
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full bg-white/20 px-3 py-1 uppercase">{event.category}</span>
            <span className="rounded-full bg-black/30 px-3 py-1">
              {event.activePhase.replace("_", " ")}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold sm:text-4xl">{event.title}</h1>
          <p className="mt-2 text-sm font-medium text-white/90">{event.dateLabel}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/85">
            <span>{event.venueName}</span>
            <span>·</span>
            <Link
              href={`/venues/${event.venueSlug}`}
              className="font-semibold text-[#c4b5fd] underline"
            >
              View Venue Guide
            </Link>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <section className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
              <h2 className="text-lg font-bold">About</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5e6473]">{event.summary}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {event.highlights.map((h) => (
                  <div key={h.title} className="rounded-xl bg-[#f6f7fb] p-3">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-[#5b3df5]">
                      {h.title}
                    </h3>
                    <p className="mt-1 text-xs text-[#111319]">{h.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
              <h2 className="text-lg font-bold">Sales Timeline</h2>
              <ol className="mt-4 space-y-3">
                {event.salesTimeline.map((step) => (
                  <li
                    key={step.label}
                    className="flex items-center justify-between rounded-xl border border-[#e4e6f0] px-4 py-3 text-sm"
                  >
                    <span className="font-semibold">{step.label}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                        step.state === "active"
                          ? "bg-[#dcfce7] text-[#16a34a]"
                          : step.state === "completed"
                          ? "bg-[#f3f4f6] text-[#5e6473]"
                          : "bg-[#f3e8ff] text-[#7c3aed]"
                      }`}
                    >
                      {step.state}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
              <h2 className="text-lg font-bold">Lineup</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {event.lineup.map((artist) => (
                  <div
                    key={artist.name}
                    className="rounded-xl border border-[#e4e6f0] bg-[#f6f7fb] p-3"
                  >
                    <div className="text-sm font-bold text-[#111319]">{artist.name}</div>
                    <div className="text-xs text-[#5e6473]">{artist.role}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
                <h2 className="text-base font-bold">Facilities at the Event</h2>
                <ul className="mt-3 space-y-1.5 text-sm text-[#5e6473]">
                  {event.facilities.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
                <h2 className="text-base font-bold">Things to Know</h2>
                <ul className="mt-3 space-y-1.5 text-sm text-[#5e6473]">
                  {event.policies.map((p) => (
                    <li key={p}>• {p}</li>
                  ))}
                </ul>
              </div>
            </section>
          </div>

          <aside className="space-y-4 lg:col-span-4">
            <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
              <div className="text-xs font-semibold text-[#5e6473]">Starting from</div>
              <div className="mt-1 text-2xl font-extrabold text-[#111319]">
                {formatInr(minPrice)} <span className="text-sm font-normal text-[#5e6473]">onwards</span>
              </div>
              {event.partialReservePercent ? (
                <p className="mt-2 rounded-lg bg-[#f3e8ff] px-3 py-1.5 text-xs font-semibold text-[#7c3aed]">
                  Pay {event.partialReservePercent}% demo deposit option supported
                </p>
              ) : null}
              <Link
                href={`/events/${event.slug}/book`}
                className="mt-4 block w-full rounded-xl bg-[#111319] py-3 text-center text-sm font-bold text-white hover:bg-[#5b3df5]"
              >
                Book tickets
              </Link>
            </div>

            <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5">
              <h2 className="text-base font-bold">Available Offers</h2>
              <div className="mt-3 space-y-2">
                {event.offers.map((offer) => (
                  <div
                    key={offer.id}
                    className="rounded-xl border border-[#e4e6f0] bg-[#efeafe]/60 p-3 text-xs"
                  >
                    <div className="font-bold text-[#5b3df5]">
                      {offer.title} ({offer.code})
                    </div>
                    <p className="mt-1 text-[#5e6473]">{offer.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e4e6f0] bg-white p-5 text-sm">
              <div className="text-xs font-semibold text-[#5e6473]">Organized by</div>
              <div className="mt-1 font-bold text-[#111319]">{event.organizerName}</div>
              <div className="mt-1 text-xs text-[#5e6473]">
                {event.organizerRating}% liked · {event.organizerTenure}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#e4e6f0] bg-white p-3 shadow-lg lg:hidden">
        {topOffer ? (
          <div className="mb-2 rounded-lg bg-[#efeafe] px-3 py-1 text-xs font-semibold text-[#5b3df5]">
            {topOffer.title} · Code {topOffer.code}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-extrabold">{formatInr(minPrice)} onwards</div>
            <div className="text-[11px] text-[#5e6473]">{event.offers.length} offers available</div>
          </div>
          <Link
            href={`/events/${event.slug}/book`}
            className="rounded-full bg-[#111319] px-6 py-2.5 text-sm font-bold text-white"
          >
            Book tickets
          </Link>
        </div>
      </div>
    </div>
  );
}
