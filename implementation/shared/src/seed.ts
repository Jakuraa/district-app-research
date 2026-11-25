import type { City, PulseEvent, Venue } from "./types.ts";

export const SEED_CITIES: City[] = [
  { slug: "bengaluru", name: "Bengaluru", state: "Karnataka", isPopular: true },
  { slug: "mumbai", name: "Mumbai", state: "Maharashtra", isPopular: true },
  { slug: "coimbatore", name: "Coimbatore", state: "Tamil Nadu", isPopular: true },
  { slug: "goa", name: "Goa", state: "Goa", isPopular: true },
  { slug: "chennai", name: "Chennai", state: "Tamil Nadu", isPopular: true },
  { slug: "hyderabad", name: "Hyderabad", state: "Telangana", isPopular: false }
];

const DEFAULT_TIMINGS = [
  { day: "Monday", hours: "2:00 PM – 11:00 PM" },
  { day: "Tuesday", hours: "2:00 PM – 11:00 PM" },
  { day: "Wednesday", hours: "2:00 PM – 11:00 PM" },
  { day: "Thursday", hours: "2:00 PM – 11:00 PM" },
  { day: "Friday", hours: "2:00 PM – 11:30 PM" },
  { day: "Saturday", hours: "12:00 PM – 11:30 PM" },
  { day: "Sunday", hours: "12:00 PM – 11:00 PM" }
];

export const SEED_VENUES: Venue[] = [
  {
    slug: "skyline-amphitheatre-bengaluru",
    name: "Skyline Open-Air Grounds",
    citySlug: "bengaluru",
    address: "North Aerospace Corridor, Yelahanka, Bengaluru, Karnataka 560064",
    headline: "Open-Air Live Music Campus",
    summary:
      "A 14-acre festival meadow engineered for high-clarity sound, wide pedestrian concourses, and tiered viewing decks.",
    openStatusLabel: "Gates open on event days",
    timings: DEFAULT_TIMINGS,
    facilities: [
      "Paid Parking",
      "Free Hydration Stations",
      "Wheelchair Accessible Decks",
      "First-Aid & Ambulance",
      "Cashless Wristband Top-Up",
      "Restrooms"
    ],
    sections: [
      { id: "sec-vip", name: "Skydeck VIP", zoneLabel: "Front Stage Raised", tierId: "tier-solstice-vip", x: 30, y: 55, width: 240, height: 60, color: "#7C3AED" },
      { id: "sec-pit", name: "Fan Pit Standing", zoneLabel: "Stage Front", tierId: "tier-solstice-pit", x: 30, y: 125, width: 240, height: 70, color: "#5B3DF5" },
      { id: "sec-ga", name: "General Lawn", zoneLabel: "Main Arena", tierId: "tier-solstice-ga", x: 30, y: 205, width: 240, height: 85, color: "#16A34A" }
    ]
  },
  {
    slug: "harbor-pavilion-mumbai",
    name: "Harbor Pavilion Hall",
    citySlug: "mumbai",
    address: "Dockyard Promenade, Sewri East, Mumbai, Maharashtra 400015",
    headline: "Waterfront Cultural & Concert Hall",
    summary:
      "Indoor-outdoor harbourfront complex hosting electronic showcases, comedy specials, and weekend food & music markets.",
    openStatusLabel: "Open today · 2:00 PM – 11:00 PM",
    timings: DEFAULT_TIMINGS,
    facilities: [
      "Valet Parking",
      "Food & Beverage Courts",
      "Step-Free Entry",
      "Medical Desk",
      "Locker Rentals"
    ],
    sections: [
      { id: "sec-balcony", name: "Harbor Lounge", zoneLabel: "Mezzanine", tierId: "tier-neon-lounge", x: 35, y: 55, width: 230, height: 65, color: "#D97706" },
      { id: "sec-floor", name: "Dance Floor GA", zoneLabel: "Main Hall", tierId: "tier-neon-ga", x: 35, y: 135, width: 230, height: 120, color: "#5B3DF5" }
    ]
  },
  {
    slug: "banyan-courtyard-coimbatore",
    name: "Banyan Courtyard Arena",
    citySlug: "coimbatore",
    address: "Avinashi Cultural Park, Peelamedu, Coimbatore, Tamil Nadu 641004",
    headline: "Indie Music & Comedy Amphitheatre",
    summary:
      "Intimate courtyard stage surrounded by shaded walkways, acoustic baffling, and local craft beverage kiosks.",
    openStatusLabel: "Open today · 2:00 PM – 11:00 PM",
    timings: DEFAULT_TIMINGS,
    facilities: [
      "Two-Wheeler & Car Parking",
      "Veg & Non-Veg Stalls",
      "Wheelchair Accessible",
      "On-Site Paramedics"
    ],
    sections: [
      { id: "sec-front", name: "Front Row Pods", zoneLabel: "Near Stage", tierId: "tier-indie-front", x: 40, y: 60, width: 220, height: 70, color: "#5B3DF5" },
      { id: "sec-lawn", name: "Courtyard GA", zoneLabel: "Open Standing", tierId: "tier-indie-ga", x: 40, y: 145, width: 220, height: 110, color: "#16A34A" }
    ]
  },
  {
    slug: "vagator-ridge-goa",
    name: "Sunset Ridge Meadows",
    citySlug: "goa",
    address: "Chapora Cliff Road, Vagator, North Goa 403509",
    headline: "Coastal Sunset Festival Grounds",
    summary:
      "Clifftop open-air festival grounds featuring two solar-assisted stages, wellness tents, and sea-breeze lounge zones.",
    openStatusLabel: "Festival weekend hours",
    timings: DEFAULT_TIMINGS,
    facilities: [
      "Shuttle Drop-off Zone",
      "Free Water Refills",
      "Zero-Waste Food Park",
      "First-Aid Pavilion"
    ],
    sections: [
      { id: "sec-cabana", name: "Sunset Deck Pass", zoneLabel: "Elevated Terrace", tierId: "tier-tide-deck", x: 30, y: 55, width: 240, height: 70, color: "#D97706" },
      { id: "sec-meadow", name: "2-Day Festival Pass", zoneLabel: "Full Grounds", tierId: "tier-tide-ga", x: 30, y: 140, width: 240, height: 120, color: "#5B3DF5" }
    ]
  }
];

export const SEED_EVENTS: PulseEvent[] = [
  {
    id: "evt-solstice-2026",
    slug: "solstice-soundwave-bengaluru-2026",
    title: "Solstice Soundwave | Bengaluru",
    category: "festivals",
    citySlug: "bengaluru",
    venueSlug: "skyline-amphitheatre-bengaluru",
    venueName: "Skyline Open-Air Grounds, Bengaluru",
    startsAt: "2026-12-19T16:00:00+05:30",
    endsAt: "2026-12-19T23:00:00+05:30",
    dateLabel: "Sat, 19 Dec · 4:00 PM onwards",
    organizerName: "PulsePass Originals",
    organizerRating: 92,
    organizerTenure: "2 years hosting",
    summary:
      "An all-day independent electronic and synth-pop showcase featuring live modular sets, curated street cuisine, and immersive spatial lighting.",
    highlights: [
      { title: "Why it stands out", body: "Quadraphonic open-air sound design across three custom light installations." },
      { title: "What you'll experience", body: "Six live bands and DJ sets from golden hour through midnight." },
      { title: "Flexible reservation", body: "Reserve select tiers now with 25% upfront deposit in demo mode." }
    ],
    facilities: ["Paid Parking", "Free Hydration Stations", "Wheelchair Accessible Decks", "First-Aid & Ambulance"],
    policies: ["Entry for ages 16+", "Tickets required for ages 5 and above", "No outside food or flash photography", "Re-entry not permitted"],
    lineup: [
      { name: "Aarav & The Echoes", role: "Synth-Pop Live" },
      { name: "Kavya Iyer", role: "Modular Electronic" },
      { name: "Monsoon Collective", role: "Indie Fusion" }
    ],
    salesTimeline: [
      { phase: "EARLY_ACCESS", label: "Early Bird Drop", startsAt: "2026-11-01T10:00:00+05:30", state: "completed" },
      { phase: "PRE_SALE", label: "Member Pre-Sale", startsAt: "2026-11-10T10:00:00+05:30", state: "completed" },
      { phase: "GENERAL_SALE", label: "General Sale Live", startsAt: "2026-11-18T12:00:00+05:30", state: "active" }
    ],
    activePhase: "GENERAL_SALE",
    partialReservePercent: 25,
    isFeatured: true,
    accentColor: "#5B3DF5",
    tiers: [
      {
        id: "tier-solstice-ga",
        sectionId: "sec-ga",
        name: "Phase 2 General Lawn",
        description: "Standing access to main festival lawn & food court.",
        priceInr: 1499,
        totalQuota: 400,
        remainingQuota: 142,
        maxPerOrder: 10,
        salesPhase: "GENERAL_SALE"
      },
      {
        id: "tier-solstice-pit",
        sectionId: "sec-pit",
        name: "Fan Pit Front Stage",
        description: "Dedicated front-of-stage standing enclosure + express entry lane.",
        priceInr: 2999,
        totalQuota: 150,
        remainingQuota: 11,
        maxPerOrder: 6,
        salesPhase: "GENERAL_SALE"
      },
      {
        id: "tier-solstice-vip",
        sectionId: "sec-vip",
        name: "Skydeck VIP Lounge",
        description: "Elevated shaded deck, dedicated bar & restroom access.",
        priceInr: 5499,
        totalQuota: 80,
        remainingQuota: 0,
        maxPerOrder: 4,
        salesPhase: "SOLD_OUT"
      }
    ],
    offers: [
      {
        id: "off-sol-15",
        code: "PULSE15",
        title: "Get 15% OFF up to ₹400",
        description: "Valid on minimum order value of ₹2,500.",
        kind: "PERCENT_CAP",
        discountValue: 15,
        maxDiscountInr: 400,
        minOrderInr: 2500,
        minQty: 1,
        expiresAt: "2027-01-31T23:59:59+05:30",
        isActive: true
      },
      {
        id: "off-sol-flat",
        code: "FIRST200",
        title: "Flat ₹200 OFF",
        description: "Valid on 2 or more tickets.",
        kind: "FLAT",
        discountValue: 200,
        maxDiscountInr: null,
        minOrderInr: 1000,
        minQty: 2,
        expiresAt: "2027-01-31T23:59:59+05:30",
        isActive: true
      }
    ]
  },
  {
    id: "evt-southern-cipher-2026",
    slug: "southern-cipher-live-coimbatore-2026",
    title: "Southern Cipher Live | Coimbatore",
    category: "concerts",
    citySlug: "coimbatore",
    venueSlug: "banyan-courtyard-coimbatore",
    venueName: "Banyan Courtyard Arena, Coimbatore",
    startsAt: "2026-12-20T17:30:00+05:30",
    endsAt: "2026-12-20T22:30:00+05:30",
    dateLabel: "Sun, 20 Dec · 5:30 PM",
    organizerName: "SouthBeat Collective",
    organizerRating: 88,
    organizerTenure: "8 months hosting",
    summary:
      "Regional hip-hop, Tamil indie rap, and live percussion under the stars at Banyan Courtyard Arena.",
    highlights: [
      { title: "Why it stands out", body: "Back-to-back showcase of 6 emerging South Indian lyricists and beatmakers." },
      { title: "Venue vibe", body: "Intimate courtyard acoustics with craft food stalls." }
    ],
    facilities: ["Two-Wheeler & Car Parking", "Veg & Non-Veg Stalls", "Wheelchair Accessible", "On-Site Paramedics"],
    policies: ["All ages welcome", "Tickets required for ages 5+", "Pets not allowed", "Event language: Tamil & English"],
    lineup: [
      { name: "Vikram K.", role: "Hip-Hop Vocalist" },
      { name: "Nila & Beats", role: "Live Percussion" },
      { name: "Madras Flow", role: "Rap Duo" }
    ],
    salesTimeline: [
      { phase: "EARLY_ACCESS", label: "Fan Waitlist", startsAt: "2026-11-05T10:00:00+05:30", state: "completed" },
      { phase: "GENERAL_SALE", label: "General Sale Live", startsAt: "2026-11-12T12:00:00+05:30", state: "active" }
    ],
    activePhase: "GENERAL_SALE",
    partialReservePercent: null,
    isFeatured: true,
    accentColor: "#E11D48",
    tiers: [
      {
        id: "tier-indie-ga",
        sectionId: "sec-lawn",
        name: "Courtyard GA Standing",
        description: "Full access to main standing courtyard.",
        priceInr: 699,
        totalQuota: 300,
        remainingQuota: 118,
        maxPerOrder: 10,
        salesPhase: "GENERAL_SALE"
      },
      {
        id: "tier-indie-front",
        sectionId: "sec-front",
        name: "Front Row Stage Pod",
        description: "Close-to-stage reserved standing zone.",
        priceInr: 1399,
        totalQuota: 90,
        remainingQuota: 12,
        maxPerOrder: 6,
        salesPhase: "GENERAL_SALE"
      }
    ],
    offers: [
      {
        id: "off-cip-15",
        code: "CULT15",
        title: "Get 15% OFF up to ₹300",
        description: "Valid on total ticket value of ₹1,200 or more.",
        kind: "PERCENT_CAP",
        discountValue: 15,
        maxDiscountInr: 300,
        minOrderInr: 1200,
        minQty: 1,
        expiresAt: "2027-01-31T23:59:59+05:30",
        isActive: true
      },
      {
        id: "off-cip-bogo",
        code: "TRIO3",
        title: "Buy 2, Get 1 Free",
        description: "Valid when booking 3 or more tickets in a single order.",
        kind: "BOGO_TIER",
        discountValue: 1,
        maxDiscountInr: null,
        minOrderInr: 1,
        minQty: 3,
        expiresAt: "2027-01-31T23:59:59+05:30",
        isActive: true
      }
    ]
  },
  {
    id: "evt-harbor-laughs-2026",
    slug: "harbor-comedy-gala-mumbai-2026",
    title: "Late Night Harbor Comedy Gala",
    category: "comedy",
    citySlug: "mumbai",
    venueSlug: "harbor-pavilion-mumbai",
    venueName: "Harbor Pavilion Hall, Mumbai",
    startsAt: "2026-11-28T20:00:00+05:30",
    endsAt: "2026-11-28T22:30:00+05:30",
    dateLabel: "Sat, 28 Nov · 8:00 PM",
    organizerName: "Dockside Laughs",
    organizerRating: 95,
    organizerTenure: "3 years hosting",
    summary:
      "Unscripted crowd-work and fresh 60-minute stand-up specials from four touring comics in Mumbai.",
    highlights: [
      { title: "Why it stands out", body: "Brand-new 2027 tour material tested live for the first time." }
    ],
    facilities: ["Valet Parking", "Food & Beverage Courts", "Step-Free Entry"],
    policies: ["Ages 18+ only", "No video recording during sets"],
    lineup: [
      { name: "Rohan Mehta", role: "Headliner" },
      { name: "Sanya Kulkarni", role: "Host & Comic" }
    ],
    salesTimeline: [
      { phase: "PRE_SALE", label: "Early Member Sale", startsAt: "2026-11-01T10:00:00+05:30", state: "completed" },
      { phase: "GENERAL_SALE", label: "General Sale Live", startsAt: "2026-11-08T10:00:00+05:30", state: "active" }
    ],
    activePhase: "GENERAL_SALE",
    partialReservePercent: null,
    isFeatured: false,
    accentColor: "#0EA5E9",
    tiers: [
      {
        id: "tier-neon-ga",
        sectionId: "sec-floor",
        name: "Main Hall Seating",
        description: "Numbered theatre-style floor seating.",
        priceInr: 799,
        totalQuota: 220,
        remainingQuota: 64,
        maxPerOrder: 8,
        salesPhase: "GENERAL_SALE"
      },
      {
        id: "tier-neon-lounge",
        sectionId: "sec-balcony",
        name: "Harbor Balcony + Drink",
        description: "Mezzanine balcony seat with one complimentary beverage.",
        priceInr: 1499,
        totalQuota: 60,
        remainingQuota: 9,
        maxPerOrder: 4,
        salesPhase: "GENERAL_SALE"
      }
    ],
    offers: [
      {
        id: "off-har-10",
        code: "LAUGH10",
        title: "10% OFF up to ₹150",
        description: "Valid on minimum 1 ticket.",
        kind: "PERCENT_CAP",
        discountValue: 10,
        maxDiscountInr: 150,
        minOrderInr: 500,
        minQty: 1,
        expiresAt: "2027-01-31T23:59:59+05:30",
        isActive: true
      }
    ]
  },
  {
    id: "evt-tides-goa-2026",
    slug: "tides-and-tempo-festival-goa-2026",
    title: "Tides & Tempo Festival | Goa",
    category: "festivals",
    citySlug: "goa",
    venueSlug: "vagator-ridge-goa",
    venueName: "Sunset Ridge Meadows, Vagator, Goa",
    startsAt: "2026-12-29T15:00:00+05:30",
    endsAt: "2026-12-30T23:30:00+05:30",
    dateLabel: "Tue, 29 Dec – Wed, 30 Dec · 3:00 PM",
    organizerName: "Coastal Drift Productions",
    organizerRating: 90,
    organizerTenure: "18 months hosting",
    summary:
      "Two-day clifftop music and arts gathering celebrating acoustic sunsets, coastal cuisine, and deep house sessions.",
    highlights: [
      { title: "Two-stage curation", body: "Acoustic Sunset Cliff Stage & Midnight Grove Stage." }
    ],
    facilities: ["Shuttle Drop-off Zone", "Free Water Refills", "Zero-Waste Food Park", "First-Aid Pavilion"],
    policies: ["Ages 21+ after 8 PM", "Wristband exchange required at gate"],
    lineup: [
      { name: "Mira & Ocean", role: "Live Indie Acoustic" },
      { name: "DJ Solano", role: "Melodic House" }
    ],
    salesTimeline: [
      { phase: "EARLY_ACCESS", label: "Early Access", startsAt: "2026-10-15T12:00:00+05:30", state: "completed" },
      { phase: "PRE_SALE", label: "Pre-Sale Phase", startsAt: "2026-11-25T12:00:00+05:30", state: "active" },
      { phase: "GENERAL_SALE", label: "General Sale", startsAt: "2026-12-05T12:00:00+05:30", state: "upcoming" }
    ],
    activePhase: "PRE_SALE",
    partialReservePercent: 25,
    isFeatured: true,
    accentColor: "#D97706",
    tiers: [
      {
        id: "tier-tide-ga",
        sectionId: "sec-meadow",
        name: "2-Day Festival Pass (Pre-Sale)",
        description: "Full two-day general entry across both cliff stages.",
        priceInr: 3999,
        totalQuota: 500,
        remainingQuota: 190,
        maxPerOrder: 10,
        salesPhase: "PRE_SALE"
      },
      {
        id: "tier-tide-deck",
        sectionId: "sec-cabana",
        name: "Sunset Terrace VIP Pass",
        description: "Priority shuttle, shaded ocean-view deck & fast-track bar.",
        priceInr: 7499,
        totalQuota: 100,
        remainingQuota: 14,
        maxPerOrder: 6,
        salesPhase: "PRE_SALE"
      }
    ],
    offers: [
      {
        id: "off-goa-500",
        code: "GOASUN500",
        title: "Flat ₹500 OFF on 2+ passes",
        description: "Valid on 2 or more festival passes.",
        kind: "FLAT",
        discountValue: 500,
        maxDiscountInr: null,
        minOrderInr: 5000,
        minQty: 2,
        expiresAt: "2027-01-31T23:59:59+05:30",
        isActive: true
      }
    ]
  }
];
