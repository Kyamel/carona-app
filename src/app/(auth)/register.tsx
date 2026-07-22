import { Link } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { AuthScreen } from "@ui/components/auth/auth-screen";
import { RegisterForm } from "@ui/components/auth/register-form";
import { Colors } from "@ui/constants/theme";
import { useColorScheme } from "@ui/hooks/use-color-scheme";

export default function Register() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  return (
    <AuthScreen
      title="Crie sua conta"
      subtitle="Use seu e-mail institucional e faça parte da rede de caronas da UFOP."
    >
      <RegisterForm />
      <Link href="/login" replace asChild>
        <Pressable style={styles.accountLink}>
          <Text style={[styles.accountText, { color: colors.icon }]}>
            Já tem uma conta?{" "}
            <Text style={[styles.accountAction, { color: colors.tint }]}>
              Entrar
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
