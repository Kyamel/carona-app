import { useState } from "react";
import { Button, Text, View } from "react-native";

import { useSession } from "@/hooks/use-session";
import { logout, sendVerificationEmail } from "@/services/auth-service";

export function VerifyForm() {
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
      <Text>
        Enviamos um link de verificação para {user?.email ?? "seu email"}.
      </Text>

      {status ? <Text>{status}</Text> : null}

      <Button
        title="Já verifiquei"
        onPress={handleAlreadyVerified}
        disabled={isLoading}
      />

      <Button
        title="Reenviar email"
        onPress={handleResend}
        disabled={isLoading}
      />

      <Button title="Sair" onPress={handleLogout} disabled={isLoading} />
    </View>
  );
}
