import { Link } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { AuthScreen } from "@ui/components/auth/auth-screen";
import { LoginForm } from "@ui/components/auth/login-form";
import { Colors } from "@ui/constants/theme";
import { useColorScheme } from "@ui/hooks/use-color-scheme";

export default function Login() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  return (
    <AuthScreen
      title="Bem-vindo de volta"
      subtitle="Entre para encontrar ou oferecer caronas na comunidade UFOP."
    >
      <LoginForm />
      <Link href="/register" replace asChild>
        <Pressable style={styles.accountLink}>
          <Text style={[styles.accountText, { color: colors.icon }]}>
            Ainda não tem conta?{" "}
            <Text style={[styles.accountAction, { color: colors.tint }]}>
              Criar conta
            </Text>
          </Text>
        </Pressable>
      </Link>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  accountLink: { alignItems: "center", marginTop: 20, paddingVertical: 4 },
  accountText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  accountAction: { fontWeight: "800" },
});
