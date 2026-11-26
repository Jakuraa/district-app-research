import Link from "next/link";
import {
  formatInr,
  type Activity,
  type Artist,
  type EditorialCollection,
  type Movie,
  type Restaurant,
  type Venue
} from "@pulsepass/shared";

export function SectionHeader({
  title,
  subtitle,
  actionHref,
  actionLabel = "View all →"
}: {
  title: string;
  subtitle?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-[#111319] sm:text-xl">
          {title}
        </h2>
        {subtitle ? <p className="mt-0.5 text-xs text-[#5e6473] sm:text-sm">{subtitle}</p> : null}
      </div>
      {actionHref ? (
        <Link href={actionHref} className="shrink-0 text-xs font-bold text-[#5b3df5] sm:text-sm">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <Link
      href={`/artists/${artist.slug}`}
      className="group flex w-[144px] shrink-0 flex-col items-center rounded-2xl border border-[#e4e6f0] bg-white p-3 text-center transition hover:border-[#5b3df5] hover:shadow-md sm:w-[164px]"
    >
      <div className="aspect-square w-24 overflow-hidden rounded-full border-2 border-[#efeafe] bg-[#111319] sm:w-28">
        <img
          src={artist.artworkUrl}
          alt={artist.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <h3 className="mt-3 line-clamp-1 text-sm font-bold text-[#111319] group-hover:text-[#5b3df5]">
        {artist.name}
      </h3>
      <p className="line-clamp-1 text-[11px] font-medium text-[#5e6473]">{artist.role}</p>
      <span className="mt-1.5 rounded-full bg-[#f6f7fb] px-2 py-0.5 text-[10px] font-semibold text-[#5e6473]">
        {artist.followersLabel}
      </span>
    </Link>
  );
}

export function VenueCard({ venue }: { venue: Venue }) {
  return (
    <Link
      href={`/venues/${venue.slug}`}
      className="group flex w-[260px] shrink-0 flex-col overflow-hidden rounded-2xl border border-[#e4e6f0] bg-white transition hover:border-[#5b3df5] hover:shadow-md sm:w-[300px]"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#111319]">
        <img
          src={venue.artworkUrl ?? "/art/venue-skyline.svg"}
          alt={venue.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {venue.distanceKm ? (
          <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/65 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
            {venue.distanceKm} km away
          </span>
        ) : null}
      </div>
      <div className="p-3.5">
        <h3 className="truncate text-sm font-extrabold text-[#111319] group-hover:text-[#5b3df5]">
          {venue.name}
        </h3>
        <p className="mt-0.5 truncate text-xs text-[#5e6473]">{venue.headline}</p>
        <p className="mt-1.5 text-[11px] font-semibold text-[#16a34a]">{venue.openStatusLabel}</p>
      </div>
    </Link>
  );
}

export function MovieCard({ movie }: { movie: Movie }) {
  return (
    <Link
      href={`/movies/${movie.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#e4e6f0] bg-white transition hover:-translate-y-0.5 hover:border-[#5b3df5] hover:shadow-md"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#111319]">
        <img
          src={movie.artworkUrl}
          alt={movie.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <span className="absolute left-2.5 top-2.5 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
          {movie.certificate}
        </span>
        <span className="absolute bottom-2.5 right-2.5 rounded-full bg-[#16a34a] px-2 py-0.5 text-[11px] font-bold text-white">
          ★ {movie.rating.toFixed(1)}
        </span>
      </div>
      <div className="p-3.5">
        <h3 className="truncate text-sm font-extrabold text-[#111319] group-hover:text-[#5b3df5]">
          {movie.title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-[#5e6473]">
          {movie.language} · {movie.genres.join(", ")}
        </p>
        <p className="mt-1 text-[11px] font-semibold text-[#5b3df5]">{movie.releaseLabel}</p>
      </div>
    </Link>
  );
}

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Link
      href={`/dining/${restaurant.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#e4e6f0] bg-white transition hover:-translate-y-0.5 hover:border-[#5b3df5] hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#111319]">
        <img
          src={restaurant.artworkUrl}
          alt={restaurant.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <span className="absolute bottom-2.5 left-2.5 rounded-md bg-[#16a34a] px-2 py-0.5 text-xs font-extrabold text-white">
          {restaurant.rating.toFixed(1)} ★
        </span>
        <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/65 px-2.5 py-0.5 text-[10px] font-semibold text-white">
          {restaurant.distanceKm} km
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-between gap-2 p-3.5">
        <div>
          <h3 className="truncate text-base font-extrabold text-[#111319] group-hover:text-[#5b3df5]">
            {restaurant.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-[#5e6473]">
            {restaurant.cuisines.join(", ")} · {formatInr(restaurant.budgetForTwoInr)} for two
          </p>
          <p className="mt-0.5 truncate text-[11px] text-[#5e6473]">{restaurant.locality}</p>
        </div>
        {restaurant.offerText ? (
          <div className="rounded-lg bg-[#efeafe] px-2.5 py-1 text-[11px] font-bold text-[#5b3df5]">
            {restaurant.offerText}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export function ActivityCard({ activity }: { activity: Activity }) {
  return (
    <Link
      href={`/play/${activity.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#e4e6f0] bg-white transition hover:-translate-y-0.5 hover:border-[#5b3df5] hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#111319]">
        <img
          src={activity.artworkUrl}
          alt={activity.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-bold uppercase text-white">
          {activity.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-between gap-2 p-3.5">
        <div>
          <h3 className="line-clamp-2 text-base font-extrabold text-[#111319] group-hover:text-[#5b3df5]">
            {activity.title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-[#5e6473]">
            {activity.venueName} · {activity.durationLabel}
          </p>
        </div>
        <div className="flex items-center justify-between border-t border-[#e4e6f0] pt-2 text-sm">
          <span className="font-extrabold text-[#111319]">{formatInr(activity.priceInr)}</span>
          <span className="text-xs font-bold text-[#5b3df5]">Book slot →</span>
        </div>
      </div>
    </Link>
  );
}

export function CollectionCard({ collection }: { collection: EditorialCollection }) {
  return (
    <Link
      href={`/events`}
      className="group relative flex w-[280px] shrink-0 flex-col overflow-hidden rounded-2xl border border-[#e4e6f0] bg-[#111319] text-white sm:w-[340px]"
    >
      <div className="aspect-[16/9] w-full overflow-hidden">
        <img
          src={collection.artworkUrl}
          alt={collection.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <span className="rounded-full bg-[#5b3df5] px-2.5 py-0.5 text-[10px] font-bold uppercase">
          {collection.badge}
        </span>
        <h3 className="mt-2 text-base font-extrabold">{collection.title}</h3>
        <p className="mt-0.5 text-xs text-white/75">{collection.subtitle}</p>
      </div>
    </Link>
  );
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[#cbd0e0] bg-white p-10 text-center">
      <h3 className="text-base font-extrabold text-[#111319]">{title}</h3>
      <p className="mt-1 text-sm text-[#5e6473]">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-block rounded-full bg-[#5b3df5] px-5 py-2 text-xs font-bold text-white"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
