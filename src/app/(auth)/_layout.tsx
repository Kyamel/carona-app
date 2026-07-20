import { Stack } from "expo-router";

import { useSession } from "@ui/hooks/use-session";

export default function AuthLayout() {
  const { user } = useSession();

  // The root guard only lets us render when the user is missing or unverified,
  // so a signed-in user here is always an unverified one.
  return (
    <Stack>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" options={{ title: "Entrar" }} />
        <Stack.Screen name="register" options={{ title: "Criar conta" }} />
      </Stack.Protected>

      <Stack.Protected guard={!!user}>
        <Stack.Screen
          name="verify-email"
          options={{ title: "Verifique seu email" }}
        />
      </Stack.Protected>
    </Stack>
  );
}
