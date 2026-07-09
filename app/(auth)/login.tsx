import { Link } from "expo-router";
import { View } from "react-native";

import { LoginForm } from "@/components/auth/LoginForm";

export default function Login() {
  return (
    <View style={{ flex: 1, gap: 16, justifyContent: "center", padding: 24 }}>
      <LoginForm />
      <Link href="/register">Não tem conta? Criar conta</Link>
    </View>
  );
}
