import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";

import { login } from "@/services/auth-service";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await login({ email, password });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível entrar.",
      );
      setSubmitting(false);
    }
  }

  return (
    <View style={{ gap: 12 }}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Senha"
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        secureTextEntry
      />
      {error ? <Text>{error}</Text> : null}
      <Button
        title={submitting ? "Entrando..." : "Entrar"}
        onPress={handleSubmit}
        disabled={submitting || !email || !password}
      />
    </View>
  );
}

export default LoginForm;
