import { StyleSheet } from "react-native";

import { Colors } from "@/constants/theme";

// Estilos temáticos compartilhados pelos formulários de autenticação para
// garantir legibilidade em ambos os temas (claro/escuro).
export function authInputStyle(scheme: "light" | "dark") {
  const colors = Colors[scheme];
  return {
    color: colors.text,
    borderColor: colors.icon,
    backgroundColor: colors.background,
  };
}

export const authStyles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    color: "#C8102E",
  },
});
