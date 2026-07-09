import { Link } from "expo-router";
import { View } from "react-native";

import { RegisterForm } from "@/components/auth/RegisterForm";

export default function Register() {
  return (
    <View style={{ flex: 1, gap: 16, justifyContent: "center", padding: 24 }}>
      <RegisterForm />
      <Link href="/login">Já tem conta? Entrar</Link>
    </View>
  );
}
