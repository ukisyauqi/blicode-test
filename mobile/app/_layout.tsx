import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/auth";
import { Loader } from "../src/ui";

const qc = new QueryClient();

function Gate() {
  const { user, ready } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === "login" || segments[0] === "register";
    if (!user && !inAuth) router.replace("/login");
    else if (user && inAuth) router.replace("/");
  }, [ready, user, segments, router]);

  if (!ready) return <Loader />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="report/[id]" options={{ headerShown: true, title: "Detail Laporan" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={qc}>
      <SafeAreaProvider>
        <AuthProvider>
          <Gate />
          <StatusBar style="auto" />
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
