import { StyleSheet, Text, View } from "react-native";

// A versão web não usa react-native-maps (sem suporte); o alvo do app é
// Android/iOS e este stub mantém o build web compilando.
export function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        O mapa está disponível apenas no app Android/iOS.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  text: {
    fontSize: 16,
    textAlign: "center",
  },
});
