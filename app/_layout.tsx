import { Stack, useRouter, useSegments } from "expo-router";

import GlobalProvider, { useGlobalContext } from "@/lib/global-provider";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "./globals.css";

function AppNavigator() {
  const { user, loading } = useGlobalContext();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    // Treat both an (auth) group OR a root /sign-in route as the auth area
    const inAuth = segments[0] === "(auth)" || segments[0] === "sign-in";

    if (!user && !inAuth) {
      router.replace("/sign-in");
    } else if (user && inAuth) {
      router.replace("/(root)/(tabs)");
    }
  }, [user, loading, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
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

  if (!fontsLoaded) return null;

  return (
    <GlobalProvider>
      <AppNavigator />
    </GlobalProvider>
  );
}
