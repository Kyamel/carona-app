import { Link } from "expo-router";
import { StyleSheet } from "react-native";

import { LoginForm } from "@ui/components/auth/login-form";
import { ThemedText } from "@ui/components/themed-text";
import { ThemedView } from "@ui/components/themed-view";

export default function Login() {
  return (
    <ThemedView style={styles.container}>
      <LoginForm />
      <Link href="/register">
        <ThemedText type="link">Não tem conta? Criar conta</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 16, justifyContent: "center", padding: 24 },
});
