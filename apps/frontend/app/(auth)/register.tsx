import { Link } from "expo-router";
import { StyleSheet } from "react-native";

import { RegisterForm } from "@/components/auth/RegisterForm";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

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
