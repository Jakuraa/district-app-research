import { Tabs } from "expo-router";
import { NIGHTLIFEZ_TOKENS } from "@nightlifez/shared";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: NIGHTLIFEZ_TOKENS.colors.primary,
        tabBarInactiveTintColor: NIGHTLIFEZ_TOKENS.colors.inkMuted,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: NIGHTLIFEZ_TOKENS.colors.border
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
