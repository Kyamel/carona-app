import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";

import { register } from "@/services/auth-service";

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await register({ name, email, password });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível criar a conta.",
      );
      setSubmitting(false);
    }
  }

  return (
    <View style={{ gap: 12 }}>
      <TextInput
        placeholder="Nome"
        value={name}
        onChangeText={setName}
        autoComplete="name"
      />
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
        autoComplete="new-password"
        secureTextEntry
      />
      {error ? <Text>{error}</Text> : null}
      <Button
        title={submitting ? "Criando..." : "Criar conta"}
        onPress={handleSubmit}
        disabled={submitting || !name || !email || !password}
      />
    </View>
  );
}

export default RegisterForm;
