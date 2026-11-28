export const NIGHTLIFEZ_TOKENS = {
  brandName: "NIGHTLIFEZ",
  tagline: "Discover. Connect. Experience.",
  colors: {
    primary: "#5B3DF5",
    primaryDark: "#4328D6",
    primaryLight: "#7B61FF",
    primarySoft: "#EFEAFE",
    accentPink: "#E11D48",
    accentAmber: "#D97706",
    accentEmerald: "#059669",
    accentSky: "#0284C7",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    surfaceMuted: "#F6F7FB",
    surfaceSubtle: "#ECEEF5",
    surfaceDark: "#111319",
    border: "#E4E6F0",
    borderStrong: "#CBD0E0",
    ink: "#111319",
    inkSecondary: "#374151",
    inkMuted: "#5E6473",
    inkOnDark: "#FFFFFF",
    available: "#16A34A",
    availableBg: "#DCFCE7",
    nearlySold: "#D97706",
    nearlySoldBg: "#FEF3C7",
    soldOut: "#DC2626",
    soldOutBg: "#FEE2E2",
    presale: "#7C3AED",
    presaleBg: "#F3E8FF"
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48
  },
  radii: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    pill: 9999
  },
  typography: {
    heroTitle: { size: 36, lineHeight: 42, weight: "800" as const },
    h1: { size: 28, lineHeight: 34, weight: "800" as const },
    h2: { size: 22, lineHeight: 28, weight: "700" as const },
    h3: { size: 17, lineHeight: 23, weight: "700" as const },
    body: { size: 14, lineHeight: 20, weight: "400" as const },
    bodyMedium: { size: 14, lineHeight: 20, weight: "600" as const },
    caption: { size: 12, lineHeight: 16, weight: "500" as const },
    micro: { size: 11, lineHeight: 14, weight: "700" as const }
  },
  breakpoints: {
    xs: 320,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    xxl: 1440
  },
  aspectRatios: {
    heroBanner: "16 / 9",
    eventCard: "4 / 3",
    moviePoster: "2 / 3",
    artistAvatar: "1 / 1",
    venueCard: "16 / 10",
    collectionCard: "16 / 9"
  },
  elevation: {
    card: "0 2px 10px rgba(17, 19, 25, 0.05)",
    cardHover: "0 12px 28px rgba(91, 61, 245, 0.12)",
    sheet: "0 -8px 32px rgba(17, 19, 25, 0.16)",
    stickyBar: "0 -4px 20px rgba(17, 19, 25, 0.08)"
  }
} as const;

export const DISCOVERY_CATEGORIES = [
  { key: "concerts", label: "Concerts", color: "#5B3DF5", icon: "music" },
  { key: "parties", label: "Parties", color: "#E11D48", icon: "sparkles" },
  { key: "festivals", label: "Festivals", color: "#D97706", icon: "sun" },
  { key: "nightlife", label: "Nightlife", color: "#9333EA", icon: "moon" },
  { key: "comedy", label: "Comedy", color: "#0284C7", icon: "mic" },
  { key: "music", label: "Music", color: "#7C3AED", icon: "headphones" },
  { key: "sports", label: "Sports", color: "#0D9488", icon: "trophy" },
  { key: "workshops", label: "Workshops", color: "#059669", icon: "wrench" },
  { key: "meetups", label: "Meetups", color: "#2563EB", icon: "users" },
  { key: "experiences", label: "Experiences", color: "#4F46E5", icon: "compass" }
] as const;
