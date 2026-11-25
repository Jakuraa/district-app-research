import Link from "next/link";
import { formatInr, getMinTierPrice, type PulseEvent } from "@pulsepass/shared";

interface EventCardProps {
  event: PulseEvent;
}

export function EventCard({ event }: EventCardProps) {
  const minPrice = getMinTierPrice(event.tiers);
  const topOffer = event.offers[0];

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#e4e6f0] bg-white transition hover:-translate-y-0.5 hover:border-[#5b3df5] hover:shadow-md"
    >
      <div
        className="relative flex h-36 flex-col justify-between p-4 text-white"
        style={{
          background: `linear-gradient(135deg, ${event.accentColor}, #111319)`
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide backdrop-blur">
            {event.category}
          </span>
          <span className="rounded-full bg-black/35 px-2.5 py-0.5 text-[11px] font-medium">
            {event.activePhase.replace("_", " ")}
          </span>
        </div>
        <div className="text-xs font-medium text-white/90">{event.dateLabel}</div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div>
          <h3 className="text-base font-bold text-[#111319] group-hover:text-[#5b3df5]">
            {event.title}
          </h3>
          <p className="mt-1 text-xs text-[#5e6473]">{event.venueName}</p>
        </div>

        <div className="space-y-2">
          {topOffer ? (
            <div className="rounded-lg bg-[#efeafe] px-2.5 py-1.5 text-xs font-semibold text-[#5b3df5]">
              Offer: {topOffer.title}
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-[#e4e6f0] pt-2.5 text-sm">
            <span className="font-bold text-[#111319]">{formatInr(minPrice)} onwards</span>
            <span className="text-xs font-semibold text-[#5b3df5]">View details →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
