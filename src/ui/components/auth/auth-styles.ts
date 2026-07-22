import { StyleSheet } from "react-native";

import { Colors } from "@ui/constants/theme";

// Estilos temáticos compartilhados pelos formulários de autenticação para
// garantir legibilidade em ambos os temas (claro/escuro).
export function authInputStyle(scheme: "light" | "dark") {
  const colors = Colors[scheme];
  return {
    color: colors.text,
    borderColor: scheme === "dark" ? "#3A3F43" : "#D7DBDE",
    backgroundColor: scheme === "dark" ? "#24282A" : "#F8F9FA",
  };
}

export const authStyles = StyleSheet.create({
  form: { gap: 16 },
  field: { gap: 7 },
  label: { fontSize: 14, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  outlineButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  outlineButtonText: { fontSize: 16, fontWeight: "800" },
  message: {
    borderRadius: 10,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: {
    color: "#C8102E",
    fontSize: 14,
    lineHeight: 20,
  },
});
