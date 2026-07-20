import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { authInputStyle, authStyles } from "@ui/components/auth/auth-styles";
import { IconSymbol } from "@ui/components/icons/icon-symbol";
import { Colors } from "@ui/constants/theme";
import { useColorScheme } from "@ui/hooks/use-color-scheme";

type PasswordInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  autoComplete?: TextInputProps["autoComplete"];
};

// Campo de senha com botão de olho para exibir/ocultar o texto digitado.
export function PasswordInput({
  value,
  onChangeText,
  placeholder = "Senha",
  autoComplete = "current-password",
}: PasswordInputProps) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <TextInput
        style={[authStyles.input, authInputStyle(scheme), styles.input]}
        placeholder={placeholder}
        placeholderTextColor={colors.icon}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoComplete={autoComplete}
        secureTextEntry={!visible}
      />
      <Pressable
        style={styles.toggle}
        onPress={() => setVisible((current) => !current)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Ocultar senha" : "Mostrar senha"}
      >
        <IconSymbol
          name={visible ? "eye.slash" : "eye"}
          size={22}
          color={colors.icon}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: "center" },
  input: { paddingRight: 48 },
  toggle: { position: "absolute", right: 12, padding: 4 },
});
