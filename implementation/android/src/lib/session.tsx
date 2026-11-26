import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  NIGHTLIFEZClient,
  SEED_NOTIFICATIONS,
  type AuthSessionView,
  type BookingRecord,
  type PlatformNotification
} from "@nightlifez/shared";

const TOKEN_KEY = "nlz_native_auth_token_v1";
const LOCAL_BOOKINGS_KEY = "nlz_native_local_bookings_v1";
const SAVED_SLUGS_KEY = "nlz_native_saved_slugs_v1";
const API_BASE_KEY = "nlz_native_api_base_v1";

const DEFAULT_API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "https://nightlifez-git-feature-nightlifez-full-platform-jakuraa.vercel.app";

interface NativeSessionContextValue {
  client: NIGHTLIFEZClient;
  apiBaseUrl: string;
  setApiBaseUrl: (url: string) => Promise<void>;
  session: AuthSessionView;
  localBookings: BookingRecord[];
  savedEventSlugs: string[];
  notifications: PlatformNotification[];
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  toggleSavedEvent: (slug: string) => Promise<void>;
  recordBooking: (booking: BookingRecord) => Promise<void>;
  cancelLocalOrRemoteBooking: (id: string) => Promise<void>;
}

const NativeSessionContext = createContext<NativeSessionContextValue | null>(null);

export function NativeSessionProvider({ children }: { children: ReactNode }) {
  const [apiBaseUrl, setApiBaseState] = useState(DEFAULT_API_BASE);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSessionView>({
    user: null,
    assignments: [],
    roles: []
  });
  const [localBookings, setLocalBookings] = useState<BookingRecord[]>([]);
  const [savedEventSlugs, setSavedEventSlugs] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<PlatformNotification[]>(SEED_NOTIFICATIONS);

  const client = useMemo(() => {
    const c = new NIGHTLIFEZClient(apiBaseUrl);
    c.setAuthToken(authToken);
    return c;
  }, [apiBaseUrl, authToken]);

  useEffect(() => {
    (async () => {
      try {
        const [storedUrl, storedToken, storedBookings, storedSaved] = await Promise.all([
          AsyncStorage.getItem(API_BASE_KEY),
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(LOCAL_BOOKINGS_KEY),
          AsyncStorage.getItem(SAVED_SLUGS_KEY)
        ]);
        if (storedUrl) setApiBaseState(storedUrl);
        if (storedBookings) setLocalBookings(JSON.parse(storedBookings) as BookingRecord[]);
        if (storedSaved) setSavedEventSlugs(JSON.parse(storedSaved) as string[]);
        if (storedToken) {
          setAuthToken(storedToken);
          const tempClient = new NIGHTLIFEZClient(storedUrl || DEFAULT_API_BASE);
          tempClient.setAuthToken(storedToken);
          const me = await tempClient.getSession();
          setSession(me);
        }
      } catch {
        // Offline-safe fallback
      }
    })();
  }, []);

  async function setApiBaseUrl(url: string) {
    const clean = url.trim().replace(/\/$/, "") || DEFAULT_API_BASE;
    setApiBaseState(clean);
    await AsyncStorage.setItem(API_BASE_KEY, clean);
  }

  async function signIn(email: string, password: string) {
    const res = await client.signIn(email, password);
    setAuthToken(res.token);
    client.setAuthToken(res.token);
    await AsyncStorage.setItem(TOKEN_KEY, res.token);
    setSession({ user: res.user, assignments: res.assignments, roles: res.roles });
    try {
      const notifs = await client.getNotifications();
      setNotifications(notifs.notifications);
    } catch {
      // Keep seed notifications if offline
    }
  }

  async function signUp(email: string, password: string, fullName: string) {
    const res = await client.signUp({ email, password, fullName });
    setAuthToken(res.token);
    client.setAuthToken(res.token);
    await AsyncStorage.setItem(TOKEN_KEY, res.token);
    setSession({ user: res.user, assignments: res.assignments, roles: res.roles });
  }

  async function signOut() {
    try {
      await client.signOut();
    } catch {
      // Ignore network error during signout
    }
    setAuthToken(null);
    client.setAuthToken(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
    setSession({ user: null, assignments: [], roles: [] });
  }

  async function toggleSavedEvent(slug: string) {
    const exists = savedEventSlugs.includes(slug);
    const next = exists ? savedEventSlugs.filter((s) => s !== slug) : [slug, ...savedEventSlugs];
    setSavedEventSlugs(next);
    await AsyncStorage.setItem(SAVED_SLUGS_KEY, JSON.stringify(next));
  }

  async function recordBooking(booking: BookingRecord) {
    const next = [booking, ...localBookings.filter((b) => b.id !== booking.id)];
    setLocalBookings(next);
    await AsyncStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(next));
  }

  async function cancelLocalOrRemoteBooking(id: string) {
    try {
      const res = await client.cancelBooking(id);
      const next = localBookings.map((b) => (b.id === id ? res.booking : b));
      setLocalBookings(next);
      await AsyncStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(next));
    } catch {
      const next = localBookings.map((b) => (b.id === id ? { ...b, status: "CANCELLED" as const } : b));
      setLocalBookings(next);
      await AsyncStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(next));
    }
  }

  return (
    <NativeSessionContext.Provider
      value={{
        client,
        apiBaseUrl,
        setApiBaseUrl,
        session,
        localBookings,
        savedEventSlugs,
        notifications,
        signIn,
        signUp,
        signOut,
        toggleSavedEvent,
        recordBooking,
        cancelLocalOrRemoteBooking
      }}
    >
      {children}
    </NativeSessionContext.Provider>
  );
}

export function useNativeSession() {
  const ctx = useContext(NativeSessionContext);
  if (!ctx) {
    throw new Error("useNativeSession must be used within NativeSessionProvider");
  }
  return ctx;
}
