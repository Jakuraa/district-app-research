import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
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
          name="search"
          options={{ headerShown: true, title: "Search PulsePass" }}
        />
        <Stack.Screen
          name="bookings"
          options={{ headerShown: true, title: "Digital Ticket Wallet" }}
        />
        <Stack.Screen
          name="account"
          options={{ headerShown: true, title: "Account & Preferences" }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
