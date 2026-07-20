import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import "react-native-reanimated";

import { TimerBar } from "@/components/timer-bar";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { SessionProvider, useSession } from "@/hooks/use-session";
import { NotificationProvider } from "@/providers/notifications";
import { RideSessionProvider, useRideSession } from "@/providers/ride-session";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Abre o fluxo de avaliação quando qualquer carona da qual o usuário participa é
// concluída — global, independente da aba em que ele estiver.
function RideCompletionWatcher() {
  const router = useRouter();
  const { completedRideId, acknowledgeCompletion } = useRideSession();

  useEffect(() => {
    if (!completedRideId) {
      return;
    }
    const rideId = completedRideId;
    acknowledgeCompletion();
    router.push({ pathname: "/review", params: { rideId } });
  }, [completedRideId, acknowledgeCompletion, router]);

  return null;
}

function RootNavigator() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { user, loading } = useSession();
  const { phase } = useRideSession();

  if (loading) {
    return null;
  }

  const signedIn = !!user && user.emailVerified;
  const timerActive = signedIn && phase !== "idle";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Faixa da status bar: única fonte de safe area no topo. Fica vermelha
          quando o contador está ativo, emendando com a TimerBar. */}
      <View
        style={{
          height: insets.top,
          backgroundColor: timerActive ? "#C8102E" : colors.background,
        }}
      />
      {signedIn ? <RideCompletionWatcher /> : null}
      {timerActive ? <TimerBar /> : null}

      <View style={{ flex: 1 }}>
        <Stack>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack.Protected>

          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="offer-ride"
              options={{ presentation: "modal", title: "Oferecer carona" }}
            />
            <Stack.Screen
              name="review"
              options={{ presentation: "modal", title: "Avaliar carona" }}
            />
          </Stack.Protected>
        </Stack>
      </View>
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SessionProvider>
        <RideSessionProvider>
          <NotificationProvider>
            <ThemeProvider
              value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
              <RootNavigator />
              <StatusBar style="auto" />
            </ThemeProvider>
          </NotificationProvider>
        </RideSessionProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
