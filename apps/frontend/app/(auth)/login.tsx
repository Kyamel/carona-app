import { Link } from "expo-router";
import { StyleSheet } from "react-native";

import { LoginForm } from "@/components/auth/LoginForm";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

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
