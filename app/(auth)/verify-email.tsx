import { View } from "react-native";

import { VerifyForm } from "@/components/auth/VerifyForm";

export default function VerifyEmailPage() {
  return (
    <View style={{ flex: 1, gap: 16, justifyContent: "center", padding: 24 }}>
      <VerifyForm />
    </View>
  );
}
