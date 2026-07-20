import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { login } from "@data";

import { authInputStyle, authStyles } from "@ui/components/auth/auth-styles";
import { PasswordInput } from "@ui/components/auth/password-input";
import { Colors } from "@ui/constants/theme";
import { useColorScheme } from "@ui/hooks/use-color-scheme";

export function LoginForm() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
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
        style={[authStyles.input, authInputStyle(scheme)]}
        placeholder="Email"
        placeholderTextColor={colors.icon}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <PasswordInput
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
      />
      {error ? <Text style={authStyles.error}>{error}</Text> : null}
      <Pressable
        style={[
          styles.button,
          {
            backgroundColor: colors.tint,
            opacity: submitting || !email || !password ? 0.5 : 1,
          },
        ]}
        onPress={handleSubmit}
        disabled={submitting || !email || !password}
      >
        <Text style={styles.buttonText}>
          {submitting ? "Entrando..." : "Entrar"}
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

export default LoginForm;
