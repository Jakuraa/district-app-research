"use client";

import { getTierAvailability, type TicketTier, type VenueSection } from "@pulsepass/shared";

interface VenueSectionMapProps {
  sections: VenueSection[];
  tiers: TicketTier[];
  selectedTierId: string | null;
  onSelectTier: (tierId: string) => void;
}

export function VenueSectionMap({
  sections,
  tiers,
  selectedTierId,
  onSelectTier
}: VenueSectionMapProps) {
  const tierMap = new Map(tiers.map((t) => [t.id, t]));

  return (
    <div className="rounded-2xl border border-[#e4e6f0] bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[#111319]">Interactive Venue Map</h3>
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
        <text
          x="150"
          y="30"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="11"
          fontWeight="bold"
        >
          MAIN STAGE
        </text>

        {sections.map((section) => {
          const tier = tierMap.get(section.tierId);
          const avail = tier ? getTierAvailability(tier) : "AVAILABLE";
          const isSelected = selectedTierId === section.tierId;
          const fill =
            avail === "SOLD_OUT"
              ? "#e5e7eb"
              : isSelected
              ? "#5b3df5"
              : section.color;

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
    </div>
  );
}
