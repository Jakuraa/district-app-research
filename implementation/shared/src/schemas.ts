import { z } from "zod";
import { ALL_ROLES } from "./roles.ts";

export const eventQuerySchema = z.object({
  city: z.string().trim().min(1).max(60).optional(),
  category: z
    .enum([
      "all",
      "concerts",
      "festivals",
      "comedy",
      "nightlife",
      "parties",
      "music",
      "sports",
      "workshops"
    ])
    .optional(),
  q: z.string().trim().max(120).optional(),
  dateWindow: z.enum(["all", "today", "tomorrow", "weekend"]).optional(),
  maxPriceInr: z.number().int().positive().optional(),
  maxDistanceKm: z.number().positive().optional(),
  sort: z.enum(["featured", "price_asc", "price_desc", "date_asc"]).optional()
});

export const bookingItemInputSchema = z.object({
  tierId: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(10),
  seatLabels: z.array(z.string().trim().min(1).max(16)).max(10).optional()
});

export const attendeeAnswerValueSchema = z.union([
  z.string().max(1000),
  z.number(),
  z.boolean(),
  z.array(z.string().max(200)).max(20)
]);

export const bookingAttendeeInputSchema = z.object({
  tierId: z.string().trim().min(1),
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().max(24).optional().nullable(),
  answers: z.record(z.string(), attendeeAnswerValueSchema).default({})
});

export const createBookingSchema = z.object({
  eventSlug: z.string().trim().min(1),
  attendeeName: z.string().trim().min(2).max(80),
  attendeeEmail: z.string().trim().email().max(120),
  offerCode: z.string().trim().max(40).optional().nullable(),
  sessionId: z.string().trim().max(60).optional().nullable(),
  holdId: z.string().trim().max(60).optional().nullable(),
  idempotencyKey: z.string().trim().min(4).max(80).optional().nullable(),
  simulatePaymentOutcome: z.enum(["CONFIRMED", "FAILED"]).optional(),
  paymentChannel: z.enum(["DEMO_SANDBOX", "ORGANISER_UPI"]).optional(),
  items: z.array(bookingItemInputSchema).min(1).max(6),
  attendees: z.array(bookingAttendeeInputSchema).max(10).optional()
});

export const signUpSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(24).optional().nullable(),
  preferredCitySlug: z.string().trim().min(1).max(60).optional(),
  favoriteCategories: z.array(z.string().trim().max(32)).max(12).optional()
});

export const signInSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(1).max(128)
});

export const otpRequestSchema = z.object({
  phone: z.string().trim().min(6).max(24),
  countryCode: z.string().trim().min(2).max(6).default("+91"),
  purpose: z.enum(["LOGIN", "SIGNUP", "VERIFY"]).default("LOGIN")
});

export const otpResendSchema = z.object({
  challengeId: z.string().trim().min(6).max(80)
});

export const otpVerifySchema = z.object({
  challengeId: z.string().trim().min(6).max(80),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit verification code."),
  fullName: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().max(120).optional().nullable(),
  preferredCitySlug: z.string().trim().min(1).max(60).optional()
});

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().max(120).optional().nullable(),
  phone: z.string().trim().max(24).optional().nullable(),
  preferredCitySlug: z.string().trim().min(1).max(60).optional(),
  favoriteCategories: z.array(z.string().trim().max(32)).max(12).optional()
});

export const createHoldSchema = z.object({
  eventSlug: z.string().trim().min(1),
  tierId: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(10),
  seatLabels: z.array(z.string().trim().min(1).max(16)).max(10).optional()
});

export const createRefundRequestSchema = z.object({
  bookingId: z.string().trim().min(1),
  reason: z.string().trim().min(5).max(500)
});

export const decideRefundSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "APPROVED", "REJECTED", "PROCESSED"]),
  resolutionNote: z.string().trim().max(500).optional()
});

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  legalName: z.string().trim().min(2).max(140),
  contactEmail: z.string().trim().email().max(120),
  citySlug: z.string().trim().min(1).max(60)
});

export const upsertEventSchema = z.object({
  id: z.string().trim().optional(),
  organizationId: z.string().trim().min(1),
  title: z.string().trim().min(3).max(140),
  category: z.enum([
    "concerts",
    "festivals",
    "comedy",
    "nightlife",
    "parties",
    "music",
    "sports",
    "workshops"
  ]),
  citySlug: z.string().trim().min(1).max(60),
  venueSlug: z.string().trim().min(1).max(80),
  startsAt: z.string().trim().min(1),
  endsAt: z.string().trim().min(1),
  dateLabel: z.string().trim().min(3).max(80),
  summary: z.string().trim().min(10).max(1200),
  ageLimit: z.string().trim().max(30).optional(),
  language: z.string().trim().max(40).optional(),
  durationLabel: z.string().trim().max(40).optional(),
  activePhase: z
    .enum(["UPCOMING", "EARLY_ACCESS", "PRE_SALE", "GENERAL_SALE", "FINAL_RELEASE", "SOLD_OUT"])
    .optional(),
  lifecycleStatus: z
    .enum(["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "PAUSED", "CANCELLED"])
    .optional(),
  visibility: z.enum(["PUBLIC", "UNLISTED", "INVITE_ONLY"]).optional(),
  approvalRequired: z.boolean().optional(),
  tiers: z
    .array(
      z.object({
        id: z.string().trim().optional(),
        sectionId: z.string().trim().min(1),
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().min(2).max(300),
        priceInr: z.number().int().min(0).max(500000),
        totalQuota: z.number().int().min(1).max(100000),
        maxPerOrder: z.number().int().min(1).max(10),
        salesPhase: z
          .enum([
            "UPCOMING",
            "EARLY_ACCESS",
            "PRE_SALE",
            "GENERAL_SALE",
            "FINAL_RELEASE",
            "SOLD_OUT"
          ])
          .optional()
      })
    )
    .min(1)
    .max(12)
});

export const upsertOfferSchema = z.object({
  eventId: z.string().trim().min(1),
  code: z.string().trim().min(3).max(24).toUpperCase(),
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(3).max(250),
  kind: z.enum(["PERCENT_CAP", "FLAT", "BOGO_TIER"]),
  discountValue: z.number().int().min(1).max(100000),
  maxDiscountInr: z.number().int().min(1).max(100000).nullable().optional(),
  minOrderInr: z.number().int().min(0).max(500000),
  minQty: z.number().int().min(1).max(10),
  expiresAt: z.string().trim().min(1)
});

export const inviteStaffSchema = z.object({
  email: z.string().trim().email().max(120),
  role: z.enum(["organiser_admin", "event_manager", "venue_manager", "box_office", "checkin_staff"]),
  organizationId: z.string().trim().optional().nullable(),
  venueSlug: z.string().trim().optional().nullable(),
  eventId: z.string().trim().optional().nullable()
});

export const updateVenueSchema = z.object({
  slug: z.string().trim().min(1),
  headline: z.string().trim().min(3).max(140).optional(),
  summary: z.string().trim().min(10).max(800).optional(),
  openStatusLabel: z.string().trim().min(3).max(80).optional(),
  facilities: z.array(z.string().trim().min(1).max(60)).max(24).optional(),
  policies: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  sections: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        name: z.string().trim().min(1).max(80),
        zoneLabel: z.string().trim().min(1).max(80),
        tierId: z.string().trim().min(1),
        x: z.number(),
        y: z.number(),
        width: z.number().positive(),
        height: z.number().positive(),
        color: z.string().trim().min(4).max(20),
        capacity: z.number().int().positive().optional()
      })
    )
    .optional()
});

export const verifyTicketScanSchema = z.object({
  eventId: z.string().trim().min(1),
  ticketCodeOrToken: z.string().trim().min(3).max(512),
  deviceId: z.string().trim().min(2).max(80).default("web-scanner"),
  clientScanId: z.string().trim().min(4).max(100).optional(),
  scanMode: z.enum(["ONLINE", "OFFLINE_SYNC"]).default("ONLINE"),
  scannedAt: z.string().optional()
});

export const offlineScanSyncSchema = z.object({
  eventId: z.string().trim().min(1),
  deviceId: z.string().trim().min(2).max(80),
  scans: z
    .array(
      z.object({
        clientScanId: z.string().trim().min(4).max(100),
        ticketCodeOrToken: z.string().trim().min(3).max(512),
        scannedAt: z.string().trim().min(1)
      })
    )
    .min(1)
    .max(200)
});

export const moderationActionSchema = z.object({
  targetType: z.enum(["event", "organization", "venue", "user"]),
  targetId: z.string().trim().min(1),
  decision: z.enum(["APPROVE", "REJECT", "SUSPEND", "PAUSE", "ACTIVATE"]),
  note: z.string().trim().max(500).optional()
});

export const assignRoleSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(ALL_ROLES),
  organizationId: z.string().trim().optional().nullable(),
  venueSlug: z.string().trim().optional().nullable(),
  eventId: z.string().trim().optional().nullable()
});

export const supportCaseCreateSchema = z.object({
  bookingId: z.string().trim().optional().nullable(),
  eventId: z.string().trim().optional().nullable(),
  subject: z.string().trim().min(4).max(160),
  category: z.enum(["BOOKING", "REFUND", "ACCESS", "DISPUTE", "TRUST_SAFETY"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  message: z.string().trim().min(5).max(1000)
});

export const supportCaseUpdateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  note: z.string().trim().min(2).max(1000).optional()
});

export const featureFlagSchema = z.object({
  key: z.string().trim().min(2).max(60),
  enabled: z.boolean(),
  description: z.string().trim().max(240).optional()
});

export const settlementCreateSchema = z.object({
  organizationId: z.string().trim().min(1),
  periodLabel: z.string().trim().min(3).max(80)
});

export const broadcastNotificationSchema = z.object({
  audience: z.enum(["USER", "ORGANISER", "STAFF", "PLATFORM"]),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(5).max(600),
  kind: z.enum(["BOOKING", "REMINDER", "SYSTEM", "OPERATIONS"]).default("SYSTEM"),
  userId: z.string().trim().optional().nullable()
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type EventQueryInput = z.infer<typeof eventQuerySchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;

export const updateOrganizationStorefrontSchema = z.object({
  bioIntro: z.string().trim().max(500).optional().nullable(),
  coverArtworkUrl: z.string().trim().max(300).optional().nullable(),
  instagramHandle: z.string().trim().max(60).optional().nullable(),
  publicContactPhone: z.string().trim().max(30).optional().nullable(),
  publicContactEmail: z.string().trim().email().max(120).optional().nullable().or(z.literal("")),
  socialLinks: z
    .array(
      z.object({
        platform: z.string().trim().min(1).max(30),
        url: z.string().trim().url().max(300)
      })
    )
    .max(6)
    .optional(),
  promotedListingsEnabled: z.boolean().optional(),
  promotedEventSlugs: z.array(z.string().trim().min(1).max(120)).max(8).optional()
});

export const duplicateEventSchema = z.object({
  title: z.string().trim().min(3).max(140).optional(),
  startsAt: z.string().trim().min(1),
  endsAt: z.string().trim().min(1),
  dateLabel: z.string().trim().min(3).max(80),
  tierQuotas: z
    .array(
      z.object({
        sourceTierId: z.string().trim().min(1),
        totalQuota: z.number().int().min(1).max(100000)
      })
    )
    .optional()
});

export const bookingQuestionInputSchema = z.object({
  id: z.string().trim().optional(),
  label: z.string().trim().min(2).max(160),
  fieldType: z.enum(["SHORT_TEXT", "LONG_TEXT", "NUMBER", "DROPDOWN", "MULTI_CHOICE", "CHECKBOX"]),
  options: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  required: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(100).default(0)
});

export const upsertBookingQuestionsSchema = z.object({
  questions: z.array(bookingQuestionInputSchema).max(20)
});

export const decideApprovalSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(400).optional(),
  expiresInHours: z.number().int().min(1).max(168).default(24)
});

export const manualGuestSchema = z.object({
  eventId: z.string().trim().min(1),
  tierId: z.string().trim().min(1),
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().max(24).optional().nullable(),
  guestType: z.enum(["WALK_IN_CASH", "VIP", "COMPLIMENTARY"]).default("WALK_IN_CASH"),
  answers: z.record(z.string(), attendeeAnswerValueSchema).default({})
});

export const csvImportGuestsSchema = z.object({
  csvText: z.string().trim().min(3).max(200000),
  defaultTierId: z.string().trim().optional(),
  defaultGuestType: z.enum(["WALK_IN_CASH", "VIP", "COMPLIMENTARY"]).default("COMPLIMENTARY")
});

export const upiVpaSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9._-]{2,64}@[a-zA-Z0-9]{2,32}$/, "Enter a valid UPI ID (e.g. name@bank).");

export const upsertOrganiserPaymentProfileSchema = z
  .object({
    upiEnabled: z.boolean(),
    upiId: z.string().trim().max(98).optional().nullable(),
    payeeDisplayName: z.string().trim().max(80).optional().nullable(),
    paymentInstructions: z.string().trim().max(400).optional().nullable()
  })
  .superRefine((val, ctx) => {
    if (val.upiEnabled) {
      if (!val.upiId || !upiVpaSchema.safeParse(val.upiId).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["upiId"],
          message: "Valid UPI ID (VPA) is required when Direct UPI is enabled."
        });
      }
      if (!val.payeeDisplayName || val.payeeDisplayName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["payeeDisplayName"],
          message: "Payee display name (min 2 chars) is required when Direct UPI is enabled."
        });
      }
    } else if (val.upiId && val.upiId.trim().length > 0 && !upiVpaSchema.safeParse(val.upiId).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["upiId"],
        message: "Enter a valid UPI ID (e.g. name@bank)."
      });
    }
  });

export const submitUpiPaymentClaimSchema = z.object({
  claimedPaid: z.literal(true),
  transactionRef: z.string().trim().max(64).optional().nullable(),
  expectedAmountInr: z.number().int().nonnegative().optional(),
  claimToken: z.string().trim().min(10).max(512).optional()
});

export const verifyOrganiserPaymentSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(400).optional(),
  expectedAmountInr: z.number().int().nonnegative().optional()
});
