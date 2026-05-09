import { Stack } from "expo-router";

import GlobalProvider, { useGlobalContext } from "@/lib/global-provider";
import { initI18nFromStorage } from "@/lib/i18n";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import "./globals.css";

/**
 * Auth gates using Expo Router protected routes.
 * @see https://docs.expo.dev/router/advanced/protected/
 */
function RootNavigator() {
  const { user, loading } = useGlobalContext();
  const isAuthed = Boolean(user);

  // Prevent transient protected-route mounts while auth/profile state refreshes.
  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isAuthed}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="reset-password" />
      </Stack.Protected>

      <Stack.Protected guard={isAuthed}>
        <Stack.Screen name="(root)" />
        <Stack.Screen name="become-agent" />
        <Stack.Screen name="admin/verify-agents" />
        <Stack.Screen name="admin/active-agents" />
        <Stack.Screen name="admin/suspended-agents" />
        <Stack.Screen name="admin/moderate-listings" />
        <Stack.Screen name="admin/reports" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    void initI18nFromStorage().finally(() => setI18nReady(true));
  }, []);

  const [fontsLoaded] = useFonts({
    "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
    "Rubik-ExtraBold": require("../assets/fonts/Rubik-ExtraBold.ttf"),
    "Rubik-Light": require("../assets/fonts/Rubik-Light.ttf"),
    "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
    "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
    "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded || !i18nReady) return null;

  return (
    <GlobalProvider>
      <RootNavigator />
    </GlobalProvider>
  );
}
