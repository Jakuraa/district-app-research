import type {
  AuthSessionView,
  BookingRecord,
  City,
  InventoryHold,
  PlatformNotification,
  PulseEvent,
  RefundRequest,
  TicketPass,
  TicketScanLog,
  Venue
} from "./types.ts";
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
  private authToken: string | null = null;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((init?.headers as Record<string, string>) ?? {})
    };
    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers
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

  getSession(): Promise<AuthSessionView> {
    return this.request<AuthSessionView>("/api/auth/me");
  }

  signIn(email: string, password: string): Promise<AuthSessionView & { token: string }> {
    return this.request<AuthSessionView & { token: string }>("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  }

  signUp(input: {
    email: string;
    password: string;
    fullName: string;
    preferredCitySlug?: string;
  }): Promise<AuthSessionView & { token: string }> {
    return this.request<AuthSessionView & { token: string }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }

  signOut(): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>("/api/auth/signout", { method: "POST" });
  }

  createHold(input: {
    eventSlug: string;
    tierId: string;
    quantity: number;
    seatLabels?: string[];
  }): Promise<{ hold: InventoryHold }> {
    return this.request<{ hold: InventoryHold }>("/api/holds", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }

  getBookings(email?: string): Promise<{ bookings: BookingRecord[]; tickets?: TicketPass[] }> {
    const qs = email ? `?email=${encodeURIComponent(email)}` : "";
    return this.request<{ bookings: BookingRecord[]; tickets?: TicketPass[] }>(`/api/bookings${qs}`);
  }

  createBooking(input: CreateBookingInput): Promise<{ booking: BookingRecord }> {
    return this.request<{ booking: BookingRecord }>("/api/bookings", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }

  cancelBooking(id: string, reason?: string): Promise<{ booking: BookingRecord }> {
    return this.request<{ booking: BookingRecord }>(`/api/bookings/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
  }

  requestRefund(bookingId: string, reason: string): Promise<{ refund: RefundRequest }> {
    return this.request<{ refund: RefundRequest }>("/api/refunds", {
      method: "POST",
      body: JSON.stringify({ bookingId, reason })
    });
  }

  getNotifications(): Promise<{ notifications: PlatformNotification[] }> {
    return this.request<{ notifications: PlatformNotification[] }>("/api/notifications");
  }

  getStaffEvents(): Promise<{ events: PulseEvent[]; recentScans: TicketScanLog[] }> {
    return this.request<{ events: PulseEvent[]; recentScans: TicketScanLog[] }>("/api/staff/events");
  }

  verifyTicketScan(input: {
    eventId: string;
    ticketCodeOrToken: string;
    deviceId: string;
    clientScanId?: string;
    scanMode?: "ONLINE" | "OFFLINE_SYNC";
  }): Promise<{
    valid: boolean;
    result: string;
    message: string;
    ticket: TicketPass | null;
    scanLog: TicketScanLog;
  }> {
    return this.request("/api/staff/scan", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }

  syncOfflineScans(input: {
    eventId: string;
    deviceId: string;
    scans: { clientScanId: string; ticketCodeOrToken: string; scannedAt: string }[];
  }): Promise<{ results: { clientScanId: string; result: string; valid: boolean; message: string }[] }> {
    return this.request("/api/staff/sync", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
}
