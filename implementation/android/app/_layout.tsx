import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NativeSessionProvider } from "../src/lib/session";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <NativeSessionProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="events/[slug]"
            options={{ headerShown: true, title: "Event Details" }}
          />
          <Stack.Screen
            name="events/[slug]/book"
            options={{ headerShown: true, title: "Select Tickets" }}
          />
          <Stack.Screen
            name="venues/[slug]"
            options={{ headerShown: true, title: "Venue Guide" }}
          />
          <Stack.Screen
            name="search"
            options={{ headerShown: true, title: "Search NIGHTLIFEZ" }}
          />
          <Stack.Screen
            name="bookings"
            options={{ headerShown: true, title: "Digital Ticket Wallet" }}
          />
          <Stack.Screen
            name="account"
            options={{ headerShown: true, title: "Account & Preferences" }}
          />
          <Stack.Screen
            name="staff"
            options={{ headerShown: true, title: "Staff Gate Scanner" }}
          />
        </Stack>
      </NativeSessionProvider>
    </SafeAreaProvider>
  );
}
