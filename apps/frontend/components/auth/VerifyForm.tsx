import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { logout, sendVerificationEmail } from "@carona/backend";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSession } from "@/hooks/use-session";

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
    <View style={{ gap: 16 }}>
      <Text style={{ color: colors.text, fontSize: 16 }}>
        Enviamos um link de verificação para {user?.email ?? "seu email"}.
      </Text>

      {status ? <Text style={{ color: colors.icon }}>{status}</Text> : null}

      <Pressable
        style={[styles.button, { backgroundColor: colors.tint, opacity: isLoading ? 0.5 : 1 }]}
        onPress={handleAlreadyVerified}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>Já verifiquei</Text>
      </Pressable>

      <Pressable
        style={[styles.outline, { borderColor: colors.tint, opacity: isLoading ? 0.5 : 1 }]}
        onPress={handleResend}
        disabled={isLoading}
      >
        <Text style={[styles.outlineText, { color: colors.tint }]}>
          Reenviar email
        </Text>
      </Pressable>

      <Pressable onPress={handleLogout} disabled={isLoading} style={styles.link}>
        <Text style={{ color: colors.icon }}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  outline: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  outlineText: { fontWeight: "700", fontSize: 16 },
  link: { alignItems: "center", paddingVertical: 8 },
});
