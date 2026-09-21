import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useBootstrapSync } from "@/hooks/useBootstrapSync";

export default function RootLayout() {
  useBootstrapSync();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="player/[id]" options={{ headerShown: true, title: "Player" }} />
          <Stack.Screen name="formation-builder" options={{ headerShown: true, title: "Custom Formation" }} />
          <Stack.Screen name="match/[id]/setup" options={{ headerShown: true, title: "Match Setup" }} />
          <Stack.Screen name="match/[id]/live" options={{ headerShown: false }} />
          <Stack.Screen name="match/[id]/summary" options={{ headerShown: true, title: "Match Summary" }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
