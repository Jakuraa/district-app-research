import type {
  Activity,
  Artist,
  City,
  EditorialCollection,
  Movie,
  PulseEvent,
  Restaurant,
  Venue
} from "./types.ts";

export const SEED_CITIES: City[] = [
  { slug: "bengaluru", name: "Bengaluru", state: "Karnataka", locality: "Indiranagar · Koramangala", isPopular: true },
  { slug: "mumbai", name: "Mumbai", state: "Maharashtra", locality: "Bandra · Lower Parel", isPopular: true },
  { slug: "coimbatore", name: "Coimbatore", state: "Tamil Nadu", locality: "RS Puram · Peelamedu", isPopular: true },
  { slug: "goa", name: "Goa", state: "Goa", locality: "Vagator · Assagao", isPopular: true },
  { slug: "chennai", name: "Chennai", state: "Tamil Nadu", locality: "Adyar · Nungambakkam", isPopular: true },
  { slug: "hyderabad", name: "Hyderabad", state: "Telangana", locality: "Jubilee Hills · Gachibowli", isPopular: false }
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
    artworkUrl: "/art/venue-skyline.svg",
    distanceKm: 11.4,
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
      {
        id: "sec-vip",
        name: "Skydeck VIP",
        zoneLabel: "Front Stage Raised",
        tierId: "tier-solstice-vip",
        x: 30,
        y: 55,
        width: 240,
        height: 60,
        color: "#7C3AED",
        capacity: 80,
        seatRows: [
          { rowLabel: "V1", seatCount: 8, unavailableSeats: ["V1-1", "V1-2", "V1-3", "V1-4", "V1-5", "V1-6", "V1-7", "V1-8"] },
          { rowLabel: "V2", seatCount: 8, unavailableSeats: ["V2-1", "V2-2", "V2-3", "V2-4", "V2-5", "V2-6", "V2-7", "V2-8"] }
        ]
      },
      {
        id: "sec-pit",
        name: "Fan Pit Standing",
        zoneLabel: "Stage Front",
        tierId: "tier-solstice-pit",
        x: 30,
        y: 125,
        width: 240,
        height: 70,
        color: "#5B3DF5",
        capacity: 150,
        seatRows: [
          { rowLabel: "P1", seatCount: 8, unavailableSeats: ["P1-1", "P1-4"] },
          { rowLabel: "P2", seatCount: 8, unavailableSeats: ["P2-7"] }
        ]
      },
      { id: "sec-ga", name: "General Lawn", zoneLabel: "Main Arena", tierId: "tier-solstice-ga", x: 30, y: 205, width: 240, height: 85, color: "#16A34A", capacity: 400 }
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
    artworkUrl: "/art/venue-harbor.svg",
    distanceKm: 6.2,
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
    artworkUrl: "/art/venue-banyan.svg",
    distanceKm: 4.8,
    timings: DEFAULT_TIMINGS,
    facilities: [
      "Two-Wheeler & Car Parking",
      "Veg & Non-Veg Stalls",
      "Wheelchair Accessible",
      "On-Site Paramedics"
    ],
    sections: [
      {
        id: "sec-front",
        name: "Front Row Pods",
        zoneLabel: "Near Stage",
        tierId: "tier-indie-front",
        x: 40,
        y: 60,
        width: 220,
        height: 70,
        color: "#5B3DF5",
        capacity: 60,
        seatRows: [
          { rowLabel: "A", seatCount: 8, unavailableSeats: ["A-3", "A-4"] },
          { rowLabel: "B", seatCount: 8, unavailableSeats: [] }
        ]
      },
      { id: "sec-lawn", name: "Courtyard GA", zoneLabel: "Open Standing", tierId: "tier-indie-ga", x: 40, y: 145, width: 220, height: 110, color: "#16A34A", capacity: 240 }
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
    artworkUrl: "/art/venue-vagator.svg",
    distanceKm: 8.5,
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
  },
  {
    slug: "coromandel-dome-chennai",
    name: "Coromandel Sound Dome",
    citySlug: "chennai",
    address: "ECR Cultural Mile, Neelankarai, Chennai, Tamil Nadu 600115",
    headline: "Acoustic Theatre & Nightlife Deck",
    summary:
      "Architecturally tuned indoor dome with retractable sea-facing terrace for concerts, vinyl nights, and stand-up.",
    openStatusLabel: "Open today · 4:00 PM – 11:30 PM",
    artworkUrl: "/art/venue-coromandel.svg",
    distanceKm: 7.1,
    timings: DEFAULT_TIMINGS,
    facilities: ["Valet Parking", "Acoustic Seating", "Craft Mocktail Bar", "Wheelchair Ramp"],
    sections: [
      { id: "sec-cor-vip", name: "Acoustic Mezzanine", zoneLabel: "Upper Tier", tierId: "tier-chennai-vip", x: 35, y: 60, width: 230, height: 65, color: "#7C3AED" },
      { id: "sec-cor-ga", name: "Orchestra Floor", zoneLabel: "Main Floor", tierId: "tier-chennai-ga", x: 35, y: 140, width: 230, height: 115, color: "#0284C7" }
    ]
  },
  {
    slug: "deccan-arena-hyderabad",
    name: "Deccan Terrace Arena",
    citySlug: "hyderabad",
    address: "Financial District Boulevard, Gachibowli, Hyderabad, Telangana 500032",
    headline: "Multi-Format Arena & Rooftop Club",
    summary:
      "Modern urban arena hosting touring concerts, night markets, and championship padel & pickleball exhibitions.",
    openStatusLabel: "Open today · 11:00 AM – 11:30 PM",
    artworkUrl: "/art/venue-deccan.svg",
    distanceKm: 5.4,
    timings: DEFAULT_TIMINGS,
    facilities: ["EV Charging", "Multi-Level Parking", "Food Hall", "Medical Bay"],
    sections: [
      { id: "sec-dec-vip", name: "Skyline Box", zoneLabel: "VIP Deck", tierId: "tier-hyd-vip", x: 35, y: 60, width: 230, height: 65, color: "#E11D48" },
      { id: "sec-dec-ga", name: "Arena Standing", zoneLabel: "Main Pit", tierId: "tier-hyd-ga", x: 35, y: 140, width: 230, height: 115, color: "#5B3DF5" }
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
    artworkUrl: "/art/evt-solstice.svg",
    ageLimit: "16+ yrs",
    language: "English, Hindi",
    durationLabel: "7 hours",
    distanceKm: 11.4,
    sessions: [
      { id: "ses-sol-sat", label: "Sat, 19 Dec · 4:00 PM (Main Day)", startsAt: "2026-12-19T16:00:00+05:30", status: "FAST_FILLING" },
      { id: "ses-sol-sun", label: "Sun, 20 Dec · 4:00 PM (Encore Set)", startsAt: "2026-12-20T16:00:00+05:30", status: "AVAILABLE" }
    ],
    organizerName: "NIGHTLIFEZ Originals",
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
      { slug: "aarav-and-the-echoes", name: "Aarav & The Echoes", role: "Synth-Pop Live", artworkUrl: "/art/art-aarav.svg" },
      { slug: "kavya-iyer", name: "Kavya Iyer", role: "Modular Electronic", artworkUrl: "/art/art-kavya.svg" },
      { slug: "monsoon-collective", name: "Monsoon Collective", role: "Indie Fusion", artworkUrl: "/art/art-monsoon.svg" }
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
        code: "NIGHT15",
        title: "Get 15% OFF up to ₹400",
        description: "Valid on minimum order value of ₹2,500.",
        eligibility: "All NIGHTLIFEZ users",
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
        eligibility: "2+ tickets in order",
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
    artworkUrl: "/art/evt-cipher.svg",
    ageLimit: "All ages",
    language: "Tamil, English",
    durationLabel: "5 hours",
    distanceKm: 4.8,
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
      { slug: "vikram-k", name: "Vikram K.", role: "Hip-Hop Vocalist", artworkUrl: "/art/art-vikram.svg" },
      { slug: "nila-and-beats", name: "Nila & Beats", role: "Live Percussion", artworkUrl: "/art/art-nila.svg" },
      { slug: "madras-flow", name: "Madras Flow", role: "Rap Duo", artworkUrl: "/art/art-madras.svg" }
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
        eligibility: "Orders above ₹1,200",
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
        eligibility: "3+ tickets",
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
    artworkUrl: "/art/evt-comedy.svg",
    ageLimit: "18+ yrs",
    language: "English, Hindi",
    durationLabel: "2.5 hours",
    distanceKm: 6.2,
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
      { slug: "rohan-mehta", name: "Rohan Mehta", role: "Headliner", artworkUrl: "/art/art-rohan.svg" },
      { slug: "sanya-kulkarni", name: "Sanya Kulkarni", role: "Host & Comic", artworkUrl: "/art/art-sanya.svg" }
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
        eligibility: "All attendees",
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
    artworkUrl: "/art/evt-tides.svg",
    ageLimit: "21+ yrs",
    language: "Instrumental, English",
    durationLabel: "2 Days",
    distanceKm: 8.5,
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
      { slug: "mira-and-ocean", name: "Mira & Ocean", role: "Live Indie Acoustic", artworkUrl: "/art/art-mira.svg" },
      { slug: "dj-solano", name: "DJ Solano", role: "Melodic House", artworkUrl: "/art/art-solano.svg" }
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
        eligibility: "2+ passes",
        kind: "FLAT",
        discountValue: 500,
        maxDiscountInr: null,
        minOrderInr: 5000,
        minQty: 2,
        expiresAt: "2027-01-31T23:59:59+05:30",
        isActive: true
      }
    ]
  },
  {
    id: "evt-velvet-vinyl-chennai-2026",
    slug: "velvet-vinyl-sessions-chennai-2026",
    title: "Velvet Vinyl & Jazz Sessions | Chennai",
    category: "music",
    citySlug: "chennai",
    venueSlug: "coromandel-dome-chennai",
    venueName: "Coromandel Sound Dome, Chennai",
    startsAt: "2026-11-29T19:00:00+05:30",
    endsAt: "2026-11-29T22:30:00+05:30",
    dateLabel: "Sun, 29 Nov · 7:00 PM",
    artworkUrl: "/art/evt-vinyl.svg",
    ageLimit: "14+ yrs",
    language: "Instrumental, English",
    durationLabel: "3.5 hours",
    distanceKm: 7.1,
    organizerName: "Coromandel Listening Room",
    organizerRating: 94,
    organizerTenure: "4 years hosting",
    summary:
      "Warm analog vinyl sets paired with a 7-piece contemporary Carnatic-jazz ensemble inside Chennai's acoustic dome.",
    highlights: [
      { title: "Analog rig", body: "Dual rotary-mixer turntables and custom horn speakers." }
    ],
    facilities: ["Valet Parking", "Acoustic Seating", "Craft Mocktail Bar"],
    policies: ["Doors open 6:15 PM", "Quiet listening policy during solo sets"],
    lineup: [
      { slug: "kavya-iyer", name: "Kavya Iyer", role: "Modular & Synth", artworkUrl: "/art/art-kavya.svg" }
    ],
    salesTimeline: [
      { phase: "GENERAL_SALE", label: "General Sale Live", startsAt: "2026-11-10T10:00:00+05:30", state: "active" }
    ],
    activePhase: "GENERAL_SALE",
    partialReservePercent: null,
    isFeatured: false,
    accentColor: "#7C3AED",
    tiers: [
      {
        id: "tier-chennai-ga",
        sectionId: "sec-cor-ga",
        name: "Orchestra Floor",
        description: "Acoustically centered floor seating.",
        priceInr: 999,
        totalQuota: 180,
        remainingQuota: 52,
        maxPerOrder: 6,
        salesPhase: "GENERAL_SALE"
      },
      {
        id: "tier-chennai-vip",
        sectionId: "sec-cor-vip",
        name: "Acoustic Mezzanine",
        description: "Elevated listening balcony + vinyl sleeve souvenir.",
        priceInr: 1999,
        totalQuota: 50,
        remainingQuota: 8,
        maxPerOrder: 4,
        salesPhase: "GENERAL_SALE"
      }
    ],
    offers: [
      {
        id: "off-che-150",
        code: "VINYL150",
        title: "Flat ₹150 OFF",
        description: "Valid on orders of ₹999 or more.",
        eligibility: "All users",
        kind: "FLAT",
        discountValue: 150,
        maxDiscountInr: null,
        minOrderInr: 999,
        minQty: 1,
        expiresAt: "2027-01-31T23:59:59+05:30",
        isActive: true
      }
    ]
  },
  {
    id: "evt-midnight-rooftop-hyd-2026",
    slug: "midnight-terrace-afterparty-hyderabad-2026",
    title: "Midnight Terrace Electronic Night | Hyderabad",
    category: "parties",
    citySlug: "hyderabad",
    venueSlug: "deccan-arena-hyderabad",
    venueName: "Deccan Terrace Arena, Hyderabad",
    startsAt: "2026-11-28T21:00:00+05:30",
    endsAt: "2026-11-29T01:30:00+05:30",
    dateLabel: "Sat, 28 Nov · 9:00 PM",
    artworkUrl: "/art/evt-party.svg",
    ageLimit: "21+ yrs",
    language: "Electronic",
    durationLabel: "4.5 hours",
    distanceKm: 5.4,
    organizerName: "Deccan Pulse",
    organizerRating: 91,
    organizerTenure: "2 years hosting",
    summary:
      "Open-air skyline dancefloor with melodic techno, Afro-house percussion, and curated late-night street bites.",
    highlights: [
      { title: "360° Booth", body: "Boiler-style center dancefloor with kinetic LED ring." }
    ],
    facilities: ["EV Charging", "Multi-Level Parking", "Food Hall"],
    policies: ["21+ valid government ID required", "Smart casual dress code"],
    lineup: [
      { slug: "dj-solano", name: "DJ Solano", role: "Melodic Techno", artworkUrl: "/art/art-solano.svg" }
    ],
    salesTimeline: [
      { phase: "FINAL_RELEASE", label: "Final Release Live", startsAt: "2026-11-20T12:00:00+05:30", state: "active" }
    ],
    activePhase: "FINAL_RELEASE",
    partialReservePercent: null,
    isFeatured: true,
    accentColor: "#E11D48",
    tiers: [
      {
        id: "tier-hyd-ga",
        sectionId: "sec-dec-ga",
        name: "Arena Standing Cover",
        description: "Includes ₹500 F&B cover credit in demo mode.",
        priceInr: 1299,
        totalQuota: 250,
        remainingQuota: 38,
        maxPerOrder: 6,
        salesPhase: "FINAL_RELEASE"
      },
      {
        id: "tier-hyd-vip",
        sectionId: "sec-dec-vip",
        name: "Skyline VIP Couple Pass",
        description: "Entry for 2 guests to VIP terrace deck.",
        priceInr: 3499,
        totalQuota: 40,
        remainingQuota: 6,
        maxPerOrder: 2,
        salesPhase: "FINAL_RELEASE"
      }
    ],
    offers: []
  }
];

export const SEED_ARTISTS: Artist[] = [
  {
    slug: "aarav-and-the-echoes",
    name: "Aarav & The Echoes",
    role: "Synth-Pop Live",
    genres: ["Synth-Pop", "Indie Electronic"],
    citySlug: "bengaluru",
    followersLabel: "184K listeners",
    bio: "Bengaluru-based four-piece blending analog synthesizers, lush vocal harmonies, and arena-sized percussion.",
    artworkUrl: "/art/art-aarav.svg",
    upcomingEventSlugs: ["solstice-soundwave-bengaluru-2026"]
  },
  {
    slug: "kavya-iyer",
    name: "Kavya Iyer",
    role: "Modular Electronic",
    genres: ["Modular", "Ambient Techno"],
    citySlug: "bengaluru",
    followersLabel: "92K listeners",
    bio: "Sound designer and live modular performer crafting hypnotic polyrhythms from custom Eurorack rigs.",
    artworkUrl: "/art/art-kavya.svg",
    upcomingEventSlugs: ["solstice-soundwave-bengaluru-2026", "velvet-vinyl-sessions-chennai-2026"]
  },
  {
    slug: "vikram-k",
    name: "Vikram K.",
    role: "Hip-Hop Vocalist",
    genres: ["Tamil Hip-Hop", "Trap"],
    citySlug: "coimbatore",
    followersLabel: "210K listeners",
    bio: "Bilingual lyricist leading the new wave of South Indian street rap and live brass-backed hip-hop.",
    artworkUrl: "/art/art-vikram.svg",
    upcomingEventSlugs: ["southern-cipher-live-coimbatore-2026"]
  },
  {
    slug: "rohan-mehta",
    name: "Rohan Mehta",
    role: "Stand-Up Headliner",
    genres: ["Observational Comedy", "Crowd Work"],
    citySlug: "mumbai",
    followersLabel: "410K followers",
    bio: "Mumbai comic known for razor-sharp crowd work and sold-out theatre tours across 14 Indian cities.",
    artworkUrl: "/art/art-rohan.svg",
    upcomingEventSlugs: ["harbor-comedy-gala-mumbai-2026"]
  },
  {
    slug: "dj-solano",
    name: "DJ Solano",
    role: "Melodic House & Techno",
    genres: ["Melodic House", "Deep Techno"],
    citySlug: "goa",
    followersLabel: "145K listeners",
    bio: "Resident sunset selector across Vagator and Hyderabad rooftop rooms, known for driving basslines.",
    artworkUrl: "/art/art-solano.svg",
    upcomingEventSlugs: ["tides-and-tempo-festival-goa-2026", "midnight-terrace-afterparty-hyderabad-2026"]
  },
  {
    slug: "mira-and-ocean",
    name: "Mira & Ocean",
    role: "Indie Acoustic",
    genres: ["Folk Pop", "Acoustic"],
    citySlug: "goa",
    followersLabel: "78K listeners",
    bio: "Coastal duo pairing fingerstyle acoustic guitar with atmospheric cello and harmonies.",
    artworkUrl: "/art/art-mira.svg",
    upcomingEventSlugs: ["tides-and-tempo-festival-goa-2026"]
  },
  {
    slug: "nila-and-beats",
    name: "Nila & Beats",
    role: "Live Percussion",
    genres: ["Fusion", "Percussion"],
    citySlug: "coimbatore",
    followersLabel: "64K listeners",
    bio: "High-energy percussion collective fusing parai and mridangam rhythms with electronic breaks.",
    artworkUrl: "/art/art-nila.svg",
    upcomingEventSlugs: ["southern-cipher-live-coimbatore-2026"]
  },
  {
    slug: "sanya-kulkarni",
    name: "Sanya Kulkarni",
    role: "Host & Comic",
    genres: ["Stand-Up", "Storytelling"],
    citySlug: "mumbai",
    followersLabel: "130K followers",
    bio: "Storyteller and regular host at Mumbai's premier late-night comedy rooms.",
    artworkUrl: "/art/art-sanya.svg",
    upcomingEventSlugs: ["harbor-comedy-gala-mumbai-2026"]
  }
];

export const SEED_MOVIES: Movie[] = [
  {
    id: "mov-monsoon-express",
    slug: "monsoon-express-2026",
    title: "Monsoon Express",
    language: "Hindi",
    genres: ["Thriller", "Drama"],
    certificate: "UA 13+",
    durationLabel: "2h 18m",
    rating: 4.6,
    releaseLabel: "In Cinemas Now",
    synopsis: "An overnight Konkan railway journey turns into a race against time when a sound recordist intercepts a coded broadcast.",
    artworkUrl: "/art/mov-monsoon.svg",
    isDemoPartnerInventory: true,
    showtimes: [
      { id: "sh-1", cinemaName: "Luxe Horizon IMAX, Indiranagar", locality: "Bengaluru", citySlug: "bengaluru", dateLabel: "Today", timeLabel: "4:15 PM", format: "IMAX", priceInr: 480, availability: "AVAILABLE" },
      { id: "sh-2", cinemaName: "Luxe Horizon IMAX, Indiranagar", locality: "Bengaluru", citySlug: "bengaluru", dateLabel: "Today", timeLabel: "7:45 PM", format: "Dolby Atmos", priceInr: 360, availability: "NEARLY_SOLD" },
      { id: "sh-3", cinemaName: "Metro Plaza Screens, Bandra", locality: "Mumbai", citySlug: "mumbai", dateLabel: "Today", timeLabel: "8:30 PM", format: "IMAX", priceInr: 520, availability: "AVAILABLE" }
    ]
  },
  {
    id: "mov-kaveri-chronicles",
    slug: "kaveri-chronicles-2026",
    title: "Kaveri Chronicles",
    language: "Tamil",
    genres: ["Action", "Historical"],
    certificate: "UA 16+",
    durationLabel: "2h 34m",
    rating: 4.8,
    releaseLabel: "Blockbuster",
    synopsis: "An epic coastal drama charting two rival guilds defending an ancient port city.",
    artworkUrl: "/art/mov-kaveri.svg",
    isDemoPartnerInventory: true,
    showtimes: [
      { id: "sh-4", cinemaName: "Brookefield CineDome", locality: "Coimbatore", citySlug: "coimbatore", dateLabel: "Today", timeLabel: "6:00 PM", format: "Dolby Atmos", priceInr: 240, availability: "AVAILABLE" },
      { id: "sh-5", cinemaName: "Sathyam Heritage Screens", locality: "Chennai", citySlug: "chennai", dateLabel: "Today", timeLabel: "9:15 PM", format: "IMAX", priceInr: 390, availability: "NEARLY_SOLD" }
    ]
  },
  {
    id: "mov-neon-orbit",
    slug: "neon-orbit-2026",
    title: "Neon Orbit",
    language: "English",
    genres: ["Sci-Fi", "Adventure"],
    certificate: "UA 13+",
    durationLabel: "2h 06m",
    rating: 4.4,
    releaseLabel: "IMAX 3D & 4DX",
    synopsis: "A deep-space salvage crew discovers a dormant orbital station echoing music from 1990s Earth.",
    artworkUrl: "/art/mov-orbit.svg",
    isDemoPartnerInventory: true,
    showtimes: [
      { id: "sh-6", cinemaName: "Luxe Horizon IMAX, Indiranagar", locality: "Bengaluru", citySlug: "bengaluru", dateLabel: "Tomorrow", timeLabel: "5:30 PM", format: "IMAX", priceInr: 540, availability: "AVAILABLE" },
      { id: "sh-7", cinemaName: "Jubilee Gold Cinemas", locality: "Hyderabad", citySlug: "hyderabad", dateLabel: "Today", timeLabel: "8:00 PM", format: "4DX", priceInr: 490, availability: "AVAILABLE" }
    ]
  },
  {
    id: "mov-malabar-kitchen",
    slug: "the-malabar-kitchen-2026",
    title: "The Malabar Kitchen",
    language: "Malayalam",
    genres: ["Comedy", "Family"],
    certificate: "U",
    durationLabel: "1h 58m",
    rating: 4.7,
    releaseLabel: "Critics Pick",
    synopsis: "Three estranged siblings reunite to save their grandmother's heritage seafront café before the monsoon festival.",
    artworkUrl: "/art/mov-malabar.svg",
    isDemoPartnerInventory: true,
    showtimes: [
      { id: "sh-8", cinemaName: "Brookefield CineDome", locality: "Coimbatore", citySlug: "coimbatore", dateLabel: "Tomorrow", timeLabel: "3:45 PM", format: "2D", priceInr: 190, availability: "AVAILABLE" },
      { id: "sh-9", cinemaName: "Luxe Horizon IMAX, Indiranagar", locality: "Bengaluru", citySlug: "bengaluru", dateLabel: "Today", timeLabel: "6:50 PM", format: "2D", priceInr: 260, availability: "AVAILABLE" }
    ]
  }
];

export const SEED_RESTAURANTS: Restaurant[] = [
  {
    id: "rest-tamrind-table",
    slug: "tamarind-table-indiranagar",
    name: "The Tamarind Table",
    citySlug: "bengaluru",
    locality: "100 Feet Road, Indiranagar",
    cuisines: ["Coastal Indian", "Modern Tapas"],
    budgetForTwoInr: 1800,
    rating: 4.6,
    distanceKm: 2.3,
    offerText: "Flat 20% OFF on pre-booked tables",
    artworkUrl: "/art/rest-tamarind.svg",
    highlights: ["Open-air courtyard", "Craft kokum cocktails", "Live acoustic Fridays"],
    availableSlots: ["7:00 PM", "7:30 PM", "8:30 PM", "9:15 PM"],
    isDemoPartnerInventory: true
  },
  {
    id: "rest-kobe-ember",
    slug: "ember-and-bao-bandra",
    name: "Ember & Bao",
    citySlug: "mumbai",
    locality: "Pali Hill, Bandra West",
    cuisines: ["Pan-Asian", "Robata Grill"],
    budgetForTwoInr: 2400,
    rating: 4.5,
    distanceKm: 3.1,
    offerText: "15% OFF + Complimentary dessert",
    artworkUrl: "/art/rest-ember.svg",
    highlights: ["Chef's robata counter", "Matcha bar", "Late-night dining"],
    availableSlots: ["7:30 PM", "8:00 PM", "9:30 PM", "10:15 PM"],
    isDemoPartnerInventory: true
  },
  {
    id: "rest-kovai-spice",
    slug: "kovai-heritage-kitchen-coimbatore",
    name: "Kovai Heritage Kitchen",
    citySlug: "coimbatore",
    locality: "Race Course Road, Coimbatore",
    cuisines: ["Kongunadu", "South Indian"],
    budgetForTwoInr: 1100,
    rating: 4.7,
    distanceKm: 1.8,
    offerText: "10% OFF via NIGHTLIFEZ Dining",
    artworkUrl: "/art/rest-kovai.svg",
    highlights: ["Wood-fired specialties", "Family seating", "Filter coffee bar"],
    availableSlots: ["1:00 PM", "7:00 PM", "8:00 PM", "8:45 PM"],
    isDemoPartnerInventory: true
  },
  {
    id: "rest-sea-salt-vagator",
    slug: "sea-salt-veranda-goa",
    name: "Sea Salt Veranda",
    citySlug: "goa",
    locality: "Anjuna-Vagator Road, North Goa",
    cuisines: ["Goan", "Mediterranean"],
    budgetForTwoInr: 2100,
    rating: 4.4,
    distanceKm: 4.0,
    offerText: "2+1 on Sunset Aperitifs",
    artworkUrl: "/art/rest-seasalt.svg",
    highlights: ["Sunset terrace", "Fresh catch grill", "Pet friendly"],
    availableSlots: ["5:30 PM", "6:30 PM", "8:00 PM", "9:00 PM"],
    isDemoPartnerInventory: true
  },
  {
    id: "rest-mylapore-brew",
    slug: "mylapore-roast-and-plate-chennai",
    name: "Mylapore Roast & Plate",
    citySlug: "chennai",
    locality: "Alwarpet, Chennai",
    cuisines: ["Contemporary Tamil", "Artisanal Cafe"],
    budgetForTwoInr: 1300,
    rating: 4.5,
    distanceKm: 2.9,
    offerText: "Flat ₹250 OFF above ₹1,500",
    artworkUrl: "/art/rest-mylapore.svg",
    highlights: ["Garden veranda", "Single-estate coffee", "Weekend brunch"],
    availableSlots: ["12:30 PM", "4:00 PM", "7:30 PM", "8:30 PM"],
    isDemoPartnerInventory: true
  },
  {
    id: "rest-deccan-charcoal",
    slug: "deccan-charcoal-jubilee-hyderabad",
    name: "Deccan Charcoal House",
    citySlug: "hyderabad",
    locality: "Road No. 36, Jubilee Hills",
    cuisines: ["Deccani", "Kebab & Grill"],
    budgetForTwoInr: 1950,
    rating: 4.6,
    distanceKm: 3.6,
    offerText: "20% OFF on early dinner (6–8 PM)",
    artworkUrl: "/art/rest-deccan.svg",
    highlights: ["Rooftop cabanas", "Slow-cooked biryani", "Valet parking"],
    availableSlots: ["6:30 PM", "7:30 PM", "8:30 PM", "9:45 PM"],
    isDemoPartnerInventory: true
  }
];

export const SEED_ACTIVITIES: Activity[] = [
  {
    id: "act-padel-blr",
    slug: "rooftop-padel-session-bengaluru",
    title: "Floodlit Rooftop Padel Courts",
    category: "sports",
    citySlug: "bengaluru",
    venueName: "SkyCourt Club, Koramangala",
    locality: "Koramangala 4th Block",
    dateLabel: "Daily · 6:00 AM – 11:00 PM",
    durationLabel: "60 mins",
    priceInr: 1200,
    rating: 4.8,
    artworkUrl: "/art/act-padel.svg",
    rules: ["Non-marking court shoes mandatory", "Rackets & balls included in demo booking", "Arrive 10 mins early"],
    slots: [
      { id: "sl-pad-1", label: "Today · 6:00 PM", remaining: 3 },
      { id: "sl-pad-2", label: "Today · 8:00 PM", remaining: 2 },
      { id: "sl-pad-3", label: "Tomorrow · 7:00 AM", remaining: 5 }
    ],
    isDemoPartnerInventory: true
  },
  {
    id: "act-kayak-goa",
    slug: "mangrove-sunrise-kayaking-goa",
    title: "Chapora Mangrove Sunrise Kayaking",
    category: "adventure",
    citySlug: "goa",
    venueName: "Chapora Backwater Jetty",
    locality: "North Goa",
    dateLabel: "Sat & Sun · 6:30 AM",
    durationLabel: "90 mins",
    priceInr: 950,
    rating: 4.7,
    artworkUrl: "/art/act-kayak.svg",
    rules: ["Life jackets provided & mandatory", "Basic swimming comfort recommended", "Dry bags included"],
    slots: [
      { id: "sl-kay-1", label: "Sat · 6:30 AM", remaining: 6 },
      { id: "sl-kay-2", label: "Sun · 6:30 AM", remaining: 8 }
    ],
    isDemoPartnerInventory: true
  },
  {
    id: "act-pottery-mum",
    slug: "wheel-throwing-ceramic-lab-mumbai",
    title: "Evening Wheel-Throwing & Ceramic Lab",
    category: "workshops",
    citySlug: "mumbai",
    venueName: "Studio Kiln, Lower Parel",
    locality: "Lower Parel",
    dateLabel: "Fri – Sun · 5:00 PM",
    durationLabel: "2 hours",
    priceInr: 1650,
    rating: 4.9,
    artworkUrl: "/art/act-pottery.svg",
    rules: ["All clay & glazing materials included", "Take home 2 fired pieces", "Aprons provided"],
    slots: [
      { id: "sl-pot-1", label: "Sat · 5:00 PM", remaining: 4 },
      { id: "sl-pot-2", label: "Sun · 5:00 PM", remaining: 7 }
    ],
    isDemoPartnerInventory: true
  },
  {
    id: "act-karting-cbe",
    slug: "night-karting-grand-prix-coimbatore",
    title: "Floodlit Karting Sprint Sessions",
    category: "recreation",
    citySlug: "coimbatore",
    venueName: "Kari Speed Park",
    locality: "Chettipalayam",
    dateLabel: "Daily · 4:00 PM – 10:00 PM",
    durationLabel: "20 mins (2 heats)",
    priceInr: 850,
    rating: 4.6,
    artworkUrl: "/art/act-karting.svg",
    rules: ["Closed-toe shoes required", "Helmets & balaclavas provided", "Ages 14+"],
    slots: [
      { id: "sl-kar-1", label: "Today · 6:30 PM", remaining: 9 },
      { id: "sl-kar-2", label: "Tomorrow · 5:00 PM", remaining: 12 }
    ],
    isDemoPartnerInventory: true
  }
];

export const SEED_COLLECTIONS: EditorialCollection[] = [
  {
    id: "col-weekend-sound",
    slug: "this-weekend-live-sound",
    title: "Loud & Live This Weekend",
    subtitle: "Festivals, synth-pop, and courtyard hip-hop sets",
    badge: "Editor's Pick",
    artworkUrl: "/art/col-weekend.svg",
    eventSlugs: ["solstice-soundwave-bengaluru-2026", "southern-cipher-live-coimbatore-2026"]
  },
  {
    id: "col-late-night",
    slug: "after-dark-sessions",
    title: "After Dark Sessions",
    subtitle: "Late-night comedy rooms, vinyl lounges & rooftop sets",
    badge: "Nightlife",
    artworkUrl: "/art/col-afterdark.svg",
    eventSlugs: ["harbor-comedy-gala-mumbai-2026", "midnight-terrace-afterparty-hyderabad-2026"]
  },
  {
    id: "col-coastal-escapes",
    slug: "coastal-festivals-and-sundowners",
    title: "Coastal Escapes & Sundowners",
    subtitle: "Clifftop stages in Goa & sea-breeze domes in Chennai",
    badge: "Destination",
    artworkUrl: "/art/col-coastal.svg",
    eventSlugs: ["tides-and-tempo-festival-goa-2026", "velvet-vinyl-sessions-chennai-2026"]
  }
];


export const SEED_ORGANIZATIONS = [
  {
    id: "org-nightlifez-originals",
    slug: "nightlifez-originals",
    name: "NIGHTLIFEZ Originals",
    legalName: "Nightlifez Live Experiences Pvt Ltd",
    contactEmail: "organiser@nightlifez.test",
    citySlug: "bengaluru",
    approvalStatus: "APPROVED" as const,
    rating: 92,
    tenureLabel: "2 years hosting",
    bioIntro: "Curated open-air concerts, electronic showcases, and underground club nights across Bengaluru & Coimbatore.",
    coverArtworkUrl: "/art/evt-solstice.svg",
    instagramHandle: "@nightlifez.originals",
    publicContactPhone: "+91 80 4123 9000",
    publicContactEmail: "hello@nightlifez.test",
    socialLinks: [
      { platform: "Instagram", url: "https://instagram.com/nightlifez.originals" },
      { platform: "Website", url: "https://nightlifez.com" }
    ],
    promotedListingsEnabled: true,
    promotedEventSlugs: ["harbor-afterhours-mumbai-2026"],
    createdBy: "usr-organiser-owner",
    createdAt: "2026-01-15T10:00:00Z"
  },
  {
    id: "org-harbor-collective",
    slug: "harbor-collective",
    name: "Harbor Collective",
    legalName: "Harbor Cultural Events LLP",
    contactEmail: "harbor@nightlifez.test",
    citySlug: "mumbai",
    approvalStatus: "APPROVED" as const,
    rating: 89,
    tenureLabel: "3 years hosting",
    bioIntro: "Waterfront comedy specials, late-night electronic rooms, and harbourfront cultural gatherings in Mumbai.",
    coverArtworkUrl: "/art/venue-harbor.svg",
    instagramHandle: "@harbor.collective",
    publicContactPhone: "+91 22 4099 8811",
    publicContactEmail: "events@harborcollective.test",
    socialLinks: [{ platform: "Instagram", url: "https://instagram.com/harbor.collective" }],
    promotedListingsEnabled: false,
    promotedEventSlugs: [],
    createdBy: "usr-organiser-owner",
    createdAt: "2026-02-10T10:00:00Z"
  },
  {
    id: "org-coastal-pending",
    slug: "coastal-sounds-guild",
    name: "Coastal Sounds Guild",
    legalName: "Coastal Sounds Guild LLP",
    contactEmail: "coastal@nightlifez.test",
    citySlug: "goa",
    approvalStatus: "PENDING" as const,
    rating: 80,
    tenureLabel: "New partner",
    createdBy: "usr-organiser-pending",
    createdAt: "2026-11-20T10:00:00Z"
  }
];

export const SEED_FEATURE_FLAGS = [
  {
    key: "inventory_holds_enabled",
    enabled: true,
    description: "Enable 10-minute server-side inventory holds during checkout",
    updatedBy: "usr-super-admin",
    updatedAt: "2026-11-26T00:00:00Z"
  },
  {
    key: "offline_scanner_sync",
    enabled: true,
    description: "Allow staff devices to queue offline ticket scans and reconcile conflicts",
    updatedBy: "usr-super-admin",
    updatedAt: "2026-11-26T00:00:00Z"
  },
  {
    key: "sandbox_payment_mode",
    enabled: true,
    description: "Keep all payments in DEMO_NO_CHARGE sandbox mode",
    updatedBy: "usr-super-admin",
    updatedAt: "2026-11-26T00:00:00Z"
  },
  {
    key: "seat_level_selection",
    enabled: true,
    description: "Enable interactive seat selection in seated venue sections",
    updatedBy: "usr-super-admin",
    updatedAt: "2026-11-26T00:00:00Z"
  }
];

export const SEED_NOTIFICATIONS = [
  {
    id: "notif-sys-1",
    userId: null,
    audience: "USER" as const,
    title: "Solstice Soundwave Bengaluru — Doors open at 4:00 PM",
    body: "Bring a valid government ID and your digital QR pass in Ticket Wallet.",
    kind: "REMINDER" as const,
    isRead: false,
    createdAt: "2026-11-26T08:00:00Z"
  },
  {
    id: "notif-org-1",
    userId: null,
    audience: "ORGANISER" as const,
    title: "Pre-settlement reconciliation window open",
    body: "Review attendee check-ins and refund requests before requesting a demo settlement batch.",
    kind: "OPERATIONS" as const,
    isRead: false,
    createdAt: "2026-11-26T09:00:00Z"
  },
  {
    id: "notif-staff-1",
    userId: null,
    audience: "STAFF" as const,
    title: "Gate Scanner Protocol",
    body: "Use offline scan queue only when gate Wi-Fi drops; sync immediately once online to detect duplicate scans.",
    kind: "OPERATIONS" as const,
    isRead: false,
    createdAt: "2026-11-26T09:30:00Z"
  }
];

export const SEED_SUPPORT_CASES = [
  {
    id: "case-1001",
    userId: "usr-attendee-demo",
    bookingId: null,
    eventId: "evt-solstice-2026",
    subject: "Clarification on wheelchair accessible deck entry gate",
    category: "ACCESS" as const,
    priority: "MEDIUM" as const,
    status: "OPEN" as const,
    assignedTo: "usr-support-agent",
    notes: [
      {
        author: "asha@nightlifez.test",
        text: "Confirming whether Gate B has step-free ramp access for Skydeck.",
        createdAt: "2026-11-26T10:00:00Z"
      }
    ],
    createdAt: "2026-11-26T10:00:00Z",
    updatedAt: "2026-11-26T10:00:00Z"
  }
];
