"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatInr, getMinTierPrice, type PulseEvent } from "@pulsepass/shared";

interface HeroCarouselProps {
  events: PulseEvent[];
}

export function HeroCarousel({ events }: HeroCarouselProps) {
  const slides = events.slice(0, 4);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 6500);
    return () => clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const active = slides[index] ?? slides[0];
  const minPrice = getMinTierPrice(active.tiers);

  return (
    <section
      aria-label="Featured experiences carousel"
      className="relative overflow-hidden rounded-3xl border border-[#e4e6f0] bg-[#111319] text-white shadow-lg"
    >
      <div className="grid lg:grid-cols-12">
        {/* Artwork Column */}
        <div className="relative aspect-[16/9] w-full overflow-hidden lg:col-span-7 lg:aspect-auto lg:min-h-[360px]">
          <img
            src={active.artworkUrl ?? "/art/evt-solstice.svg"}
            alt={active.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111319] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#111319]" />
          <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#5b3df5] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
              Featured · {active.category}
            </span>
            <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
              {active.activePhase.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Content Column */}
        <div className="flex flex-col justify-between gap-5 p-5 sm:p-8 lg:col-span-5">
          <div className="space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-widest text-[#c4b5fd]">
              {active.dateLabel}
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {active.title}
            </h1>
            <p className="text-sm text-white/80">{active.venueName}</p>
            <p className="line-clamp-2 text-xs leading-relaxed text-white/70 sm:text-sm">
              {active.summary}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
                  Tickets starting at
                </div>
                <div className="text-xl font-extrabold text-white">
                  {formatInr(minPrice)} <span className="text-xs font-normal text-white/70">onwards</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/events/${active.slug}`}
                  className="rounded-full border border-white/25 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10 sm:text-sm"
                >
                  Details
                </Link>
                <Link
                  href={`/events/${active.slug}/book`}
                  className="rounded-full bg-[#5b3df5] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#4328d6] sm:text-sm"
                >
                  Book tickets
                </Link>
              </div>
            </div>

            {/* Carousel Controls */}
            {slides.length > 1 ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5" role="tablist" aria-label="Slide indicators">
                  {slides.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      role="tab"
                      aria-selected={idx === index}
                      aria-label={`Show slide ${idx + 1}: ${s.title}`}
                      onClick={() => setIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === index ? "w-7 bg-[#5b3df5]" : "w-2 bg-white/30 hover:bg-white/60"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous slide"
                    onClick={() => setIndex((prev) => (prev - 1 + slides.length) % slides.length)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-sm text-white hover:bg-white/10"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Next slide"
                    onClick={() => setIndex((prev) => (prev + 1) % slides.length)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-sm text-white hover:bg-white/10"
                  >
                    ›
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
