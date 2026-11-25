import { Tabs } from "expo-router";
import { PULSEPASS_TOKENS } from "@pulsepass/shared";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: PULSEPASS_TOKENS.colors.primary,
        tabBarInactiveTintColor: PULSEPASS_TOKENS.colors.inkMuted,
        headerShown: true
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Discover" }} />
      <Tabs.Screen name="events" options={{ title: "Events" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen name="bookings" options={{ title: "Tickets" }} />
    </Tabs>
  );
}
