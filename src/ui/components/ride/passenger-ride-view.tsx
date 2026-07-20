import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  cancelPendingJoinRequest,
  cancelRideAsPassenger,
  type Ride,
} from "@data";

import { Colors } from "@ui/constants/theme";
import { useRideSession } from "@ui/providers/ride-session";
import { IconSymbol } from "@ui/components/icons/icon-symbol";
import { confirmCancel } from "@ui/components/ride/cancel-warning";
import { useColorScheme } from "@ui/hooks/use-color-scheme";

export function PassengerRideView({
  ride,
  passengerId,
}: {
  ride: Ride;
  passengerId: string;
}) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { phase, passengers } = useRideSession();
  const [busy, setBusy] = useState(false);

  const coRiders = passengers.filter(
    (p) => p.status === "accepted" && p.uid !== passengerId,
  );

  const statusLabel =
    phase === "requesting"
      ? "Procurando carona"
      : phase === "waiting"
        ? "Carona confirmada"
        : "Carona em andamento";

  async function handleCancel() {
    setBusy(true);
    try {
      if (phase === "requesting") {
        // Pedido ainda pendente: não conta para reputação.
        if (await confirmCancel("Você ainda não foi aceito nesta carona.")) {
          await cancelPendingJoinRequest(ride.id, passengerId);
        }
      } else {
        if (
          await confirmCancel(
            "O motorista já contava com você e pode estar a caminho.",
          )
        ) {
          const stage =
            ride.status === "inProgress" ? "inProgress" : ride.status;
          await cancelRideAsPassenger(
            ride.id,
            passengerId,
            stage as "open" | "full" | "inProgress",
          );
        }
      }
    } catch (cause) {
      Alert.alert(
        "Ops",
        cause instanceof Error ? cause.message : "Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.status, { color: colors.tint }]}>{statusLabel}</Text>

      <View style={styles.card}>
        <IconSymbol name="car.fill" size={22} color={colors.tint} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.driver, { color: colors.text }]}>
            {ride.driverName}
          </Text>
          <Text style={{ color: colors.icon }} numberOfLines={1}>
            {ride.origin.label} → {ride.destination.label}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Outros passageiros ({coRiders.length})
      </Text>
      {coRiders.length === 0 ? (
        <Text style={{ color: colors.icon }}>
          {phase === "requesting"
            ? "Você verá os colegas de carona após ser aceito."
            : "Você é o único passageiro até agora."}
        </Text>
      ) : (
        coRiders.map((rider) => (
          <View key={rider.uid} style={styles.riderRow}>
            <IconSymbol name="person.fill" size={18} color={colors.tint} />
            <Text style={{ color: colors.text, fontSize: 15 }}>
              {rider.name}
            </Text>
          </View>
        ))
      )}

      <Pressable
        style={[styles.cancel, { opacity: busy ? 0.5 : 1 }]}
        disabled={busy}
        onPress={handleCancel}
      >
        <Text style={styles.cancelText}>
          {phase === "requesting" ? "Cancelar pedido" : "Desistir da carona"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12 },
  status: { fontSize: 14, fontWeight: "700", textTransform: "uppercase" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#8E8E93",
  },
  driver: { fontSize: 18, fontWeight: "700" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 8 },
  riderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cancel: {
    borderWidth: 1,
    borderColor: "#C8102E",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
  },
  cancelText: { color: "#C8102E", fontWeight: "700", fontSize: 16 },
});
