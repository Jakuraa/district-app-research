import { z } from "zod";

export const eventQuerySchema = z.object({
  city: z.string().trim().min(1).max(60).optional(),
  category: z.enum(["all", "concerts", "festivals", "comedy", "nightlife", "sports", "workshops"]).optional(),
  q: z.string().trim().max(120).optional(),
  dateWindow: z.enum(["all", "today", "tomorrow", "weekend"]).optional(),
  sort: z.enum(["featured", "price_asc", "price_desc", "date_asc"]).optional()
});

export const bookingItemInputSchema = z.object({
  tierId: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(10)
});

export const createBookingSchema = z.object({
  eventSlug: z.string().trim().min(1),
  attendeeName: z.string().trim().min(2).max(80),
  attendeeEmail: z.string().trim().email().max(120),
  offerCode: z.string().trim().max(40).optional().nullable(),
  items: z.array(bookingItemInputSchema).min(1).max(6)
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type EventQueryInput = z.infer<typeof eventQuerySchema>;
