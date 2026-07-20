import { Alert } from "react-native";

// Aviso desencorajador de cancelamento. Resolve true se o usuário confirmar.
// affectsReputation controla a frase sobre reputação (não aparece ao cancelar
// uma carona ainda sem passageiros).
export function confirmCancel(
  message: string,
  affectsReputation = true,
): Promise<boolean> {
  const reputationNote = affectsReputation
    ? "\n\nCancelamentos ficam registrados e afetam sua reputação."
    : "";

  return new Promise((resolve) => {
    Alert.alert("Tem certeza?", `${message}${reputationNote}`, [
      { text: "Voltar", style: "cancel", onPress: () => resolve(false) },
      {
        text: "Cancelar mesmo assim",
        style: "destructive",
        onPress: () => resolve(true),
      },
    ]);
  });
}
