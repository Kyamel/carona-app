import type { PropsWithChildren } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconSymbol } from "@ui/components/icons/icon-symbol";
import { Colors } from "@ui/constants/theme";
import { useColorScheme } from "@ui/hooks/use-color-scheme";

type AuthScreenProps = PropsWithChildren<{
  title: string;
  subtitle: string;
}>;

export function AuthScreen({ title, subtitle, children }: AuthScreenProps) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const surface = scheme === "dark" ? "#1D2022" : "#FFFFFF";
  const pageBackground = scheme === "dark" ? "#101213" : "#F7F3F4";
  const borderColor = scheme === "dark" ? "#303437" : "#E9DEE1";
  const brandBackground = scheme === "dark" ? "#3A1B21" : "#F7DDE2";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: pageBackground }]}
      edges={["right", "bottom", "left"]}
    >
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        bottomOffset={24}
        extraKeyboardSpace={12}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.brand}>
            <View
              style={[styles.brandIcon, { backgroundColor: brandBackground }]}
            >
              <IconSymbol name="car.fill" size={27} color={colors.tint} />
            </View>
            <View>
              <Text style={[styles.brandName, { color: colors.text }]}>Carona</Text>
              <Text style={[styles.brandCampus, { color: colors.tint }]}>UFOP</Text>
            </View>
          </View>

          <View style={styles.heading}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.icon }]}>
              {subtitle}
            </Text>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: surface, borderColor },
              scheme === "light" ? styles.cardShadow : null,
            ]}
          >
            {children}
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  content: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 460,
  },
  brand: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  brandIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  brandName: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  brandCampus: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.8,
    lineHeight: 16,
  },
  heading: { gap: 8, marginBottom: 22 },
  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  subtitle: { fontSize: 16, lineHeight: 23, maxWidth: 400 },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
  },
  cardShadow: Platform.select({
    web: { boxShadow: "0 8px 18px rgba(74, 24, 34, 0.08)" },
    default: {
      elevation: 3,
      shadowColor: "#4A1822",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
    },
  }),
});
