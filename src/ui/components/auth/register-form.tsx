import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { ALLOW_NON_UFOP, isUfopEmail, register } from "@data";

import { authInputStyle, authStyles } from "@ui/components/auth/auth-styles";
import { PasswordInput } from "@ui/components/auth/password-input";
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
    <View style={authStyles.form}>
      <View style={authStyles.field}>
        <Text style={[authStyles.label, { color: colors.text }]}>Nome</Text>
        <TextInput
          style={[authStyles.input, authInputStyle(scheme)]}
          placeholder="Como você quer ser chamado"
          placeholderTextColor={colors.icon}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="next"
          textContentType="name"
        />
      </View>
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
          autoComplete="new-password"
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          textContentType="newPassword"
        />
      </View>
      {error ? <Text style={authStyles.error}>{error}</Text> : null}
      <Pressable
        style={[
          authStyles.primaryButton,
          {
            backgroundColor: colors.tint,
            opacity: submitting || !name || !email || !password ? 0.5 : 1,
          },
        ]}
        onPress={handleSubmit}
        disabled={submitting || !name || !email || !password}
      >
        <Text style={authStyles.primaryButtonText}>
          {submitting ? "Criando..." : "Criar conta"}
        </Text>
      </Pressable>
    </View>
  );
}

export default RegisterForm;
