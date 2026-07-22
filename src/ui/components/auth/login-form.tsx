import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

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
    if (!email.trim() || !password) {
      return;
    }

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
    <View style={authStyles.form}>
      <View style={authStyles.field}>
        <Text style={[authStyles.label, { color: colors.text }]}>E-mail</Text>
        <TextInput
          style={[authStyles.input, authInputStyle(scheme)]}
          placeholder="seu.email@ufop.edu.br"
          placeholderTextColor={colors.icon}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="next"
          textContentType="emailAddress"
        />
      </View>
      <View style={authStyles.field}>
        <Text style={[authStyles.label, { color: colors.text }]}>Senha</Text>
        <PasswordInput
          value={password}
          onChangeText={setPassword}
          autoComplete="current-password"
          onSubmitEditing={handleSubmit}
          returnKeyType="go"
          textContentType="password"
        />
      </View>
      {error ? <Text style={authStyles.error}>{error}</Text> : null}
      <Pressable
        style={[
          authStyles.primaryButton,
          {
            backgroundColor: colors.tint,
            opacity: submitting || !email || !password ? 0.5 : 1,
          },
        ]}
        onPress={handleSubmit}
        disabled={submitting || !email || !password}
      >
        <Text style={authStyles.primaryButtonText}>
          {submitting ? "Entrando..." : "Entrar"}
        </Text>
      </Pressable>
    </View>
  );
}

export default LoginForm;
