import { StyleSheet } from "react-native";

import { VerifyForm } from "@ui/components/auth/verify-form";
import { ThemedView } from "@ui/components/themed-view";

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
