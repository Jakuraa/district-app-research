import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInr, getMinTierPrice, SEED_CITIES } from "@nightlifez/shared";
import { AppHeader } from "@/components/AppHeader";
import { CopyShareButton } from "@/components/CopyShareButton";
import { listCitiesAndEvents } from "@/lib/repository";
import { getPublicStorefront } from "@/lib/sellerGuestService";

export const dynamic = "force-dynamic";

export default async function OrganiserStorefrontPage({
  params
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [storefront, { cities }] = await Promise.all([
    getPublicStorefront(orgSlug),
    listCitiesAndEvents()
  ]);

  if (!storefront) {
    notFound();
  }

  const { organization, upcomingEvents, promotedEvents } = storefront;

  return (
    <div className="min-h-screen bg-[#f6f7fb] pb-16">
      <AppHeader cities={cities.length > 0 ? cities : SEED_CITIES} />

      <main className="mx-auto max-w-5xl space-y-8 px-3 py-6 sm:px-6">
        <section className="overflow-hidden rounded-3xl border border-[#e4e6f0] bg-white shadow-sm">
          <div className="relative h-40 w-full bg-gradient-to-r from-[#111319] via-[#2d1f7a] to-[#5b3df5] sm:h-52">
            {organization.coverArtworkUrl ? (
              <img
                src={organization.coverArtworkUrl}
                alt={`${organization.name} cover`}
                className="h-full w-full object-cover opacity-80"
              />
            ) : null}
          </div>

          <div className="space-y-4 p-5 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-[#111319] sm:text-3xl">
                    {organization.name}
                  </h1>
                  {organization.isVerified ? (
                    <span className="inline-flex items-center rounded-full bg-[#dcfce7] px-2.5 py-0.5 text-[11px] font-extrabold text-[#059669]">
                      Verified Organiser ✓
                    </span>
                  ) : null}
                </div>
                <div className="text-xs font-semibold text-[#5e6473]">
                  {organization.tenureLabel} · Rating {organization.rating}% · City: {organization.citySlug}
                </div>
              </div>

              <CopyShareButton path={`/o/${organization.slug}`} label="Copy Storefront Link" />
            </div>

            {organization.bioIntro ? (
              <p className="max-w-2xl text-sm leading-relaxed text-[#374151]">{organization.bioIntro}</p>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1 text-xs">
              {organization.instagramHandle ? (
                <span className="rounded-full bg-[#efeafe] px-3 py-1 font-bold text-[#5b3df5]">
                  IG: {organization.instagramHandle}
                </span>
              ) : null}
              {organization.publicContactPhone ? (
                <span className="rounded-full bg-[#f6f7fb] px-3 py-1 font-semibold text-[#111319]">
                  Contact: {organization.publicContactPhone}
                </span>
              ) : null}
              {organization.publicContactEmail ? (
                <span className="rounded-full bg-[#f6f7fb] px-3 py-1 font-semibold text-[#111319]">
                  {organization.publicContactEmail}
                </span>
              ) : null}
              {organization.socialLinks.map((link) => (
                <a
                  key={`${link.platform}-${link.url}`}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[#e4e6f0] px-3 py-1 font-bold text-[#111319] hover:border-[#5b3df5]"
                >
                  {link.platform} ↗
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-[#111319]">
              Upcoming Events ({upcomingEvents.length})
            </h2>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="rounded-2xl border border-[#e4e6f0] bg-white p-6 text-sm text-[#5e6473]">
              No published public events scheduled right now.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {upcomingEvents.map((evt) => {
                const minPrice = getMinTierPrice(evt.tiers);
                const remaining = evt.tiers.reduce((sum, t) => sum + t.remainingQuota, 0);
                return (
                  <article
                    key={evt.id}
                    className="flex flex-col justify-between rounded-2xl border border-[#e4e6f0] bg-white p-5 shadow-sm"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase text-[#5b3df5]">
                        <span>{evt.category}</span>
                        <span>{remaining > 0 ? `${remaining} passes left` : "Sold Out"}</span>
                      </div>
                      <h3 className="text-base font-extrabold text-[#111319]">{evt.title}</h3>
                      <p className="text-xs font-medium text-[#5e6473]">
                        {evt.dateLabel} · {evt.venueName}
                      </p>
                      <p className="line-clamp-2 text-xs text-[#374151]">{evt.summary}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#e4e6f0] pt-3">
                      <div className="text-sm font-extrabold text-[#111319]">
                        {minPrice > 0 ? `From ${formatInr(minPrice)}` : "Free"}
                      </div>
                      <div className="flex items-center gap-2">
                        <CopyShareButton path={`/events/${evt.slug}`} label="Share" />
                        <Link
                          href={`/events/${evt.slug}/book`}
                          className="rounded-xl bg-[#5b3df5] px-4 py-2 text-xs font-extrabold text-white"
                        >
                          {evt.approvalRequired ? "Request Spot" : "Book Passes"}
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {organization.promotedListingsEnabled && promotedEvents.length > 0 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-extrabold text-[#111319]">
              Recommended by {organization.name}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {promotedEvents.map((evt) => (
                <Link
                  key={evt.id}
                  href={`/events/${evt.slug}`}
                  className="rounded-2xl border border-[#e4e6f0] bg-white p-4 transition hover:border-[#5b3df5]"
                >
                  <div className="text-[11px] font-bold text-[#5b3df5]">
                    By {evt.organizerName}
                  </div>
                  <div className="mt-1 text-sm font-extrabold text-[#111319]">{evt.title}</div>
                  <div className="mt-0.5 text-xs text-[#5e6473]">
                    {evt.dateLabel} · From {formatInr(getMinTierPrice(evt.tiers))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
