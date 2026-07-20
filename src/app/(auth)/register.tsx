import { Link } from "expo-router";
import { StyleSheet } from "react-native";

import { RegisterForm } from "@ui/components/auth/register-form";
import { ThemedText } from "@ui/components/themed-text";
import { ThemedView } from "@ui/components/themed-view";

export default function Register() {
  return (
    <ThemedView style={styles.container}>
      <RegisterForm />
      <Link href="/login">
        <ThemedText type="link">Já tem conta? Entrar</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 16, justifyContent: "center", padding: 24 },
});
