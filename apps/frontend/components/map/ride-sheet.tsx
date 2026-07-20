import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RideOffer } from "@carona/backend";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type RideSheetProps = {
  offer: RideOffer;
  onRequest: () => void;
  onClose: () => void;
};

// Painel inferior com os detalhes da carona selecionada no mapa.
export function RideSheet({ offer, onRequest, onClose }: RideSheetProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const takenSeats = offer.availableSeats - offer.seatsAvailable;
  const directionLabel =
    offer.direction === "toCampus" ? "Indo para o ICEA" : "Saindo do ICEA";

  return (
    <View
      style={[
        styles.sheet,
        { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.driver, { color: colors.text }]}>
          {offer.driverName}
        </Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <IconSymbol name="xmark" size={22} color={colors.icon} />
        </Pressable>
      </View>

      <View style={styles.route}>
        <Text style={[styles.routeText, { color: colors.text }]} numberOfLines={1}>
          {directionLabel}
        </Text>
      </View>
      <Text style={{ color: colors.icon, fontSize: 13 }}>
        O local de saída do motorista aparece depois que ele aceitar.
      </Text>

      <View style={styles.stats}>
        <Stat
          icon="person.2.fill"
          label={`${offer.seatsAvailable} de ${offer.availableSeats} livres`}
          colors={colors}
        />
        {takenSeats > 0 ? (
          <Stat
            icon="checkmark"
            label={`${takenSeats} a bordo`}
            colors={colors}
          />
        ) : null}
      </View>

      <Pressable
        style={[
          styles.request,
          {
            backgroundColor: colors.tint,
            opacity: offer.seatsAvailable > 0 ? 1 : 0.5,
          },
        ]}
        disabled={offer.seatsAvailable <= 0}
        onPress={onRequest}
      >
        <Text style={styles.requestText}>
          {offer.seatsAvailable > 0 ? "Pedir carona" : "Sem assentos"}
        </Text>
      </Pressable>
    </View>
  );
}

function Stat({
  icon,
  label,
  colors,
}: {
  icon: Parameters<typeof IconSymbol>[0]["name"];
  label: string;
  colors: (typeof Colors)["light"];
}) {
  return (
    <View style={styles.stat}>
      <IconSymbol name={icon} size={16} color={colors.tint} />
      <Text style={{ color: colors.text, fontSize: 14 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 14,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  driver: { fontSize: 18, fontWeight: "700" },
  route: { flexDirection: "row", alignItems: "center", gap: 8 },
  routeText: { flex: 1, fontSize: 15 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  stat: { flexDirection: "row", alignItems: "center", gap: 6 },
  request: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  requestText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
