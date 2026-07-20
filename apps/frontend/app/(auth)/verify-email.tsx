import { StyleSheet } from "react-native";

import { VerifyForm } from "@/components/auth/VerifyForm";
import { ThemedView } from "@/components/themed-view";

export default function VerifyEmailPage() {
  return (
    <ThemedView style={styles.container}>
      <VerifyForm />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 16, justifyContent: "center", padding: 24 },
});
