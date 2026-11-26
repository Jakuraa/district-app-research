import Link from "next/link";
import { formatInr, getMinTierPrice, getTierAvailability, type PulseEvent } from "@pulsepass/shared";

interface EventCardProps {
  event: PulseEvent;
  compact?: boolean;
}

export function EventCard({ event, compact = false }: EventCardProps) {
  const minPrice = getMinTierPrice(event.tiers);
  const topOffer = event.offers[0];
  const anyNearlySold = event.tiers.some((t) => getTierAvailability(t) === "NEARLY_SOLD");

  return (
    <Link
      href={`/events/${event.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-[#e4e6f0] bg-white transition hover:-translate-y-0.5 hover:border-[#5b3df5] hover:shadow-lg ${
        compact ? "w-[260px] shrink-0 sm:w-[290px]" : "w-full"
      }`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#111319]">
        <img
          src={event.artworkUrl ?? "/art/evt-solstice.svg"}
          alt={event.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3">
          <span className="rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
            {event.category}
          </span>
          <span className="rounded-full bg-[#5b3df5] px-2.5 py-1 text-[10px] font-bold uppercase text-white">
            {event.activePhase.replace("_", " ")}
          </span>
        </div>
        {anyNearlySold ? (
          <div className="absolute bottom-2.5 left-3 rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-[10px] font-bold text-[#d97706]">
            Fast filling
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-2.5 p-4">
        <div className="space-y-1">
          <p className="text-xs font-bold text-[#5b3df5]">{event.dateLabel}</p>
          <h3 className="line-clamp-2 text-base font-extrabold leading-snug text-[#111319] group-hover:text-[#5b3df5]">
            {event.title}
          </h3>
          <p className="truncate text-xs text-[#5e6473]">
            {event.venueName}
            {event.distanceKm ? ` · ${event.distanceKm} km` : ""}
          </p>
        </div>

        <div className="space-y-2 pt-1">
          {topOffer ? (
            <div className="truncate rounded-lg bg-[#efeafe] px-2.5 py-1 text-[11px] font-bold text-[#5b3df5]">
              {topOffer.title} · {topOffer.code}
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-[#e4e6f0] pt-2.5 text-sm">
            <span className="font-extrabold text-[#111319]">{formatInr(minPrice)} onwards</span>
            <span className="text-xs font-bold text-[#5b3df5]">Book →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
