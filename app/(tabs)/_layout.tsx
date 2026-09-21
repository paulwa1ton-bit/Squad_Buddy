import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { colors } from "@/constants/theme";

function TabIcon({ symbol }: { symbol: string }) {
  return <Text style={{ fontSize: 20 }}>{symbol}</Text>;
}

export default function TabsLayout() {
  const accountType = useAuthStore((s) => s.accountType);
  const isManager = accountType === "manager";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.pitch,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: "Home", tabBarIcon: () => <TabIcon symbol="🏠" /> }}
      />
      <Tabs.Screen
        name="squad"
        options={{
          title: "Squad",
          tabBarIcon: () => <TabIcon symbol="👕" />,
          href: isManager ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Matches",
          tabBarIcon: () => <TabIcon symbol="⚽" />,
          href: isManager ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="guidelines"
        options={{ title: "Guidelines", tabBarIcon: () => <TabIcon symbol="📖" /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: "More", tabBarIcon: () => <TabIcon symbol="⚙️" /> }}
      />
    </Tabs>
  );
}
