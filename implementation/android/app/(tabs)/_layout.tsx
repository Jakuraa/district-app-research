import { Tabs } from "expo-router";
import { PULSEPASS_TOKENS } from "@pulsepass/shared";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: PULSEPASS_TOKENS.colors.primary,
        tabBarInactiveTintColor: PULSEPASS_TOKENS.colors.inkMuted,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: PULSEPASS_TOKENS.colors.border
        },
        headerShown: false
      }}
    >
      <Tabs.Screen name="index" options={{ title: "For You" }} />
      <Tabs.Screen name="dining" options={{ title: "Dining" }} />
      <Tabs.Screen name="movies" options={{ title: "Movies" }} />
      <Tabs.Screen name="events" options={{ title: "Events" }} />
      <Tabs.Screen name="play" options={{ title: "Play" }} />
    </Tabs>
  );
}
