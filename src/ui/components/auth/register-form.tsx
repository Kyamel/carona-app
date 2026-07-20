import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ALLOW_NON_UFOP, isUfopEmail, register } from "@data";

import { authInputStyle, authStyles } from "@ui/components/auth/auth-styles";
import { Colors } from "@ui/constants/theme";
import { useColorScheme } from "@ui/hooks/use-color-scheme";

export function RegisterForm() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!ALLOW_NON_UFOP && !isUfopEmail(email)) {
      setError(
        "Use seu e-mail institucional UFOP (@ufop.edu.br ou @aluno.ufop.edu.br).",
      );
      return;
    }

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
        style={[authStyles.input, authInputStyle(scheme)]}
        placeholder="Nome"
        placeholderTextColor={colors.icon}
        value={name}
        onChangeText={setName}
        autoComplete="name"
      />
      <TextInput
        style={[authStyles.input, authInputStyle(scheme)]}
        placeholder="Email"
        placeholderTextColor={colors.icon}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <TextInput
        style={[authStyles.input, authInputStyle(scheme)]}
        placeholder="Senha"
        placeholderTextColor={colors.icon}
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
        secureTextEntry
      />
      {error ? <Text style={authStyles.error}>{error}</Text> : null}
      <Pressable
        style={[
          styles.button,
          {
            backgroundColor: colors.tint,
            opacity: submitting || !name || !email || !password ? 0.5 : 1,
          },
        ]}
        onPress={handleSubmit}
        disabled={submitting || !name || !email || !password}
      >
        <Text style={styles.buttonText}>
          {submitting ? "Criando..." : "Criar conta"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

export default RegisterForm;
