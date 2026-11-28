"use client";

import { getTierAvailability, type TicketTier, type VenueSection } from "@nightlifez/shared";

interface VenueSectionMapProps {
  sections: VenueSection[];
  tiers: TicketTier[];
  selectedTierId: string | null;
  selectedSeats?: string[];
  onSelectTier: (tierId: string) => void;
  onToggleSeat?: (tierId: string, seatLabel: string) => void;
}

export function VenueSectionMap({
  sections,
  tiers,
  selectedTierId,
  selectedSeats = [],
  onSelectTier,
  onToggleSeat
}: VenueSectionMapProps) {
  const tierMap = new Map(tiers.map((t) => [t.id, t]));
  const focusedSection = sections.find((s) => s.tierId === selectedTierId && s.seatRows && s.seatRows.length > 0);

  return (
    <div className="rounded-2xl border border-[#e4e6f0] bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[#111319]">Interactive Venue & Seating Map</h3>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#5e6473]">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" /> Available
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-[#d97706]" /> Nearly sold
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-[#dc2626]" /> Sold out
          </span>
        </div>
      </div>

      <svg
        viewBox="0 0 300 310"
        className="mx-auto w-full max-w-xs rounded-xl bg-[#f6f7fb]"
        role="img"
        aria-label="Venue seating and standing sections diagram"
      >
        <rect x="65" y="12" width="170" height="28" rx="6" fill="#111319" />
        <text x="150" y="30" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
          MAIN STAGE
        </text>

        {sections.map((section) => {
          const tier = tierMap.get(section.tierId);
          const avail = tier ? getTierAvailability(tier) : "AVAILABLE";
          const isSelected = selectedTierId === section.tierId;
          const fill =
            avail === "SOLD_OUT" ? "#e5e7eb" : isSelected ? "#5b3df5" : section.color;

          return (
            <g
              key={section.id}
              onClick={() => {
                if (avail !== "SOLD_OUT") onSelectTier(section.tierId);
              }}
              style={{ cursor: avail === "SOLD_OUT" ? "not-allowed" : "pointer" }}
            >
              <rect
                x={section.x}
                y={section.y}
                width={section.width}
                height={section.height}
                rx="10"
                fill={fill}
                fillOpacity={avail === "SOLD_OUT" ? 0.8 : isSelected ? 0.95 : 0.78}
                stroke={isSelected ? "#111319" : "#ffffff"}
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              <text
                x={section.x + section.width / 2}
                y={section.y + section.height / 2 - 4}
                textAnchor="middle"
                fill={avail === "SOLD_OUT" ? "#4b5563" : "#ffffff"}
                fontSize="12"
                fontWeight="bold"
              >
                {section.name}
              </text>
              <text
                x={section.x + section.width / 2}
                y={section.y + section.height / 2 + 12}
                textAnchor="middle"
                fill={avail === "SOLD_OUT" ? "#6b7280" : "#f3f4f6"}
                fontSize="10"
              >
                {avail === "SOLD_OUT" ? "Sold out" : section.zoneLabel}
              </text>
            </g>
          );
        })}
      </svg>

      {focusedSection?.seatRows && focusedSection.seatRows.length > 0 && onToggleSeat ? (
        <div className="mt-4 rounded-xl border border-[#e4e6f0] bg-[#f6f7fb] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-[#111319]">
              Select Seats in {focusedSection.name}
            </span>
            <span className="text-[11px] font-semibold text-[#5b3df5]">
              {selectedSeats.length > 0 ? `Selected: ${selectedSeats.join(", ")}` : "Tap seats or use +/− below"}
            </span>
          </div>
          <div className="mt-2.5 space-y-2">
            {focusedSection.seatRows.map((row) => {
              const unavailable = new Set(row.unavailableSeats ?? []);
              return (
                <div key={row.rowLabel} className="flex flex-wrap items-center gap-1.5">
                  <span className="w-7 text-[11px] font-bold text-[#5e6473]">{row.rowLabel}</span>
                  {Array.from({ length: row.seatCount }, (_, idx) => {
                    const seatLabel = `${row.rowLabel}-${idx + 1}`;
                    const isTaken = unavailable.has(seatLabel);
                    const isPicked = selectedSeats.includes(seatLabel);
                    return (
                      <button
                        key={seatLabel}
                        type="button"
                        disabled={isTaken}
                        onClick={() => onToggleSeat(focusedSection.tierId, seatLabel)}
                        aria-label={`Seat ${seatLabel} ${isTaken ? "unavailable" : isPicked ? "selected" : "available"}`}
                        className={`h-7 min-w-8 rounded-md px-1.5 text-[10px] font-bold transition ${
                          isTaken
                            ? "cursor-not-allowed bg-[#e5e7eb] text-[#9ca3af]"
                            : isPicked
                            ? "bg-[#5b3df5] text-white"
                            : "border border-[#cbd0e0] bg-white text-[#111319] hover:border-[#5b3df5]"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
