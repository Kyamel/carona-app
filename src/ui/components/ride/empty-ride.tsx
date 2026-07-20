import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { Colors } from "@ui/constants/theme";
import { ThemedText } from "@ui/components/themed-text";
import { ThemedView } from "@ui/components/themed-view";
import { useColorScheme } from "@ui/hooks/use-color-scheme";

export function EmptyRide() {
  const router = useRouter();
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Nenhuma carona ativa</ThemedText>
      <ThemedText style={styles.hint}>
        Use o mapa para pedir ou oferecer uma carona.
      </ThemedText>
      <Pressable
        style={[styles.button, { backgroundColor: colors.tint }]}
        onPress={() => router.navigate("/(tabs)")}
      >
        <Text style={styles.buttonText}>Ir para o mapa</Text>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  hint: { textAlign: "center" },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
