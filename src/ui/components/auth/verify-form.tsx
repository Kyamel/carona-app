import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { logout, sendVerificationEmail } from "@data";

import { authStyles } from "@ui/components/auth/auth-styles";
import { IconSymbol } from "@ui/components/icons/icon-symbol";
import { Colors } from "@ui/constants/theme";
import { useColorScheme } from "@ui/hooks/use-color-scheme";
import { useSession } from "@ui/hooks/use-session";

export function VerifyForm() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { user, refresh } = useSession();
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleResend() {
    setStatus(null);
    setIsLoading(true);

    try {
      await sendVerificationEmail();
      setStatus("Email reenviado. Confira sua caixa de entrada.");
    } catch (cause) {
      setStatus(
        cause instanceof Error
          ? cause.message
          : "Não foi possível reenviar o email.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAlreadyVerified() {
    setStatus(null);
    setIsLoading(true);

    try {
      const refreshedUser = await refresh();

      if (!refreshedUser?.emailVerified) {
        setStatus("Ainda não verificado. Tente novamente em alguns segundos.");
      }
    } catch (cause) {
      setStatus(
        cause instanceof Error
          ? cause.message
          : "Não foi possível atualizar seu status.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    setStatus(null);
    setIsLoading(true);

    try {
      await logout();
    } catch (cause) {
      setStatus(
        cause instanceof Error ? cause.message : "Não foi possível sair.",
      );
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: scheme === "dark" ? "#3A1B21" : "#F7DDE2" },
        ]}
      >
        <IconSymbol name="checkmark.circle.fill" size={34} color={colors.tint} />
      </View>

      <View style={styles.copy}>
        <Text style={[styles.instructions, { color: colors.text }]}>
          Enviamos um link de verificação para:
        </Text>
        <Text style={[styles.email, { color: colors.tint }]} numberOfLines={2}>
          {user?.email ?? "seu e-mail"}
        </Text>
        <Text style={[styles.hint, { color: colors.icon }]}>
          Abra o link recebido e volte aqui para continuar.
        </Text>
      </View>

      {status ? (
        <Text
          style={[
            authStyles.message,
            {
              color: colors.text,
              backgroundColor: scheme === "dark" ? "#292D2F" : "#F2F3F4",
            },
          ]}
        >
          {status}
        </Text>
      ) : null}

      <Pressable
        style={[
          authStyles.primaryButton,
          { backgroundColor: colors.tint, opacity: isLoading ? 0.5 : 1 },
        ]}
        onPress={handleAlreadyVerified}
        disabled={isLoading}
      >
        <Text style={authStyles.primaryButtonText}>
          {isLoading ? "Verificando..." : "Já verifiquei"}
        </Text>
      </Pressable>

      <Pressable
        style={[
          authStyles.outlineButton,
          { borderColor: colors.tint, opacity: isLoading ? 0.5 : 1 },
        ]}
        onPress={handleResend}
        disabled={isLoading}
      >
        <Text style={[authStyles.outlineButtonText, { color: colors.tint }]}>
          Reenviar email
        </Text>
      </Pressable>

      <Pressable
        onPress={handleLogout}
        disabled={isLoading}
        style={styles.link}
      >
        <Text style={{ color: colors.icon }}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  iconWrap: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 18,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  copy: { gap: 4, marginBottom: 4 },
  instructions: { fontSize: 15, lineHeight: 21 },
  email: { fontSize: 16, fontWeight: "800", lineHeight: 23 },
  hint: { fontSize: 14, lineHeight: 20, marginTop: 3 },
  link: { alignItems: "center", paddingVertical: 8 },
});
