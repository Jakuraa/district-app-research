import type { BookingRecord, City, PulseEvent, Venue } from "./types.ts";
import type { CreateBookingInput, EventQueryInput } from "./schemas.ts";

export interface EventsListResponse {
  cities: City[];
  events: PulseEvent[];
}

export interface EventDetailResponse {
  event: PulseEvent;
  venue: Venue | null;
}

export interface VenueDetailResponse {
  venue: Venue;
  upcomingEvents: PulseEvent[];
}

export class NIGHTLIFEZClient {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      }
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.error ?? `Request failed with ${res.status}`);
    }
    return body as T;
  }

  getEvents(query: EventQueryInput = {}): Promise<EventsListResponse> {
    const params = new URLSearchParams();
    if (query.city) params.set("city", query.city);
    if (query.category) params.set("category", query.category);
    if (query.q) params.set("q", query.q);
    if (query.dateWindow) params.set("dateWindow", query.dateWindow);
    if (query.sort) params.set("sort", query.sort);
    const qs = params.toString();
    return this.request<EventsListResponse>(`/api/events${qs ? `?${qs}` : ""}`);
  }

  getEventBySlug(slug: string): Promise<EventDetailResponse> {
    return this.request<EventDetailResponse>(`/api/events/${encodeURIComponent(slug)}`);
  }

  getVenueBySlug(slug: string): Promise<VenueDetailResponse> {
    return this.request<VenueDetailResponse>(`/api/venues/${encodeURIComponent(slug)}`);
  }

  getBookings(email?: string): Promise<{ bookings: BookingRecord[] }> {
    const qs = email ? `?email=${encodeURIComponent(email)}` : "";
    return this.request<{ bookings: BookingRecord[] }>(`/api/bookings${qs}`);
  }

  createBooking(input: CreateBookingInput): Promise<{ booking: BookingRecord }> {
    return this.request<{ booking: BookingRecord }>("/api/bookings", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }

  cancelBooking(id: string): Promise<{ booking: BookingRecord }> {
    return this.request<{ booking: BookingRecord }>(`/api/bookings/${encodeURIComponent(id)}/cancel`, {
      method: "POST"
    });
  }
}
