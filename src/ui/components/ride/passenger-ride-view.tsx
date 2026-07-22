import { useRouter } from "expo-router";
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
  confirmRidePassenger,
  declineRideProposal,
  type Ride,
} from "@data";

import { IconSymbol } from "@ui/components/icons/icon-symbol";
import { confirmCancel } from "@ui/components/ride/cancel-warning";
import { DriverReviews } from "@ui/components/ride/driver-reviews";
import { Colors } from "@ui/constants/theme";
import { useColorScheme } from "@ui/hooks/use-color-scheme";
import { useRideSession } from "@ui/providers/ride-session";

export function PassengerRideView({
  ride,
  passengerId,
}: {
  ride: Ride;
  passengerId: string;
}) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { phase, passengers } = useRideSession();
  const [busy, setBusy] = useState(false);

  const coRiders = passengers.filter(
    (p) => p.status === "accepted" && p.uid !== passengerId,
  );

  const myPassenger = passengers.find((p) => p.uid === passengerId);
  // Motorista aceitou meu pedido público, mas eu ainda não confirmei que quero
  // ir com ele. Enquanto isso, ele não consegue iniciar a corrida.
  const needsConfirmation =
    phase === "waiting" && myPassenger != null && !myPassenger.confirmed;
  // Chat só depois do aceite (existe passenger doc) — antes disso não há par.
  const canChat = myPassenger != null && phase !== "requesting";

  const statusLabel =
    phase === "requesting"
      ? "Procurando carona"
      : needsConfirmation
        ? "Confirme sua carona"
        : phase === "waiting"
          ? "Carona confirmada"
          : "Carona em andamento";

  async function handleConfirm() {
    setBusy(true);
    try {
      await confirmRidePassenger(ride.id, passengerId);
    } catch (cause) {
      Alert.alert(
        "Ops",
        cause instanceof Error ? cause.message : "Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  function handleDecline() {
    Alert.alert(
      "Recusar carona",
      `Recusar a carona de ${ride.driverName}? Você sai desta carona e fica livre para pedir de novo.`,
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Recusar",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await declineRideProposal(ride.id, passengerId);
            } catch (cause) {
              Alert.alert(
                "Ops",
                cause instanceof Error ? cause.message : "Tente novamente.",
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  function openChat() {
    router.push({
      pathname: "/chat",
      params: {
        rideId: ride.id,
        threadId: passengerId,
        title: ride.driverName,
      },
    });
  }

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

      <DriverReviews
        driverId={ride.driverId}
        driverName={ride.driverName}
        routeLabel={`${ride.origin.label} → ${ride.destination.label}`}
        canChat={canChat}
        onChat={openChat}
      />

      {needsConfirmation ? (
        <Text style={{ color: colors.icon }}>
          {ride.driverName} aceitou seu pedido. Confirme para embarcar; só então
          o motorista poderá iniciar a corrida.
        </Text>
      ) : null}

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

      {needsConfirmation ? (
        <>
          <Pressable
            style={[
              styles.confirm,
              { backgroundColor: colors.tint, opacity: busy ? 0.5 : 1 },
            ]}
            disabled={busy}
            onPress={handleConfirm}
          >
            <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />
            <Text style={styles.confirmText}>
              Confirmar carona com {ride.driverName}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.cancel, { opacity: busy ? 0.5 : 1 }]}
            disabled={busy}
            onPress={handleDecline}
          >
            <Text style={styles.cancelText}>Recusar</Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          style={[styles.cancel, { opacity: busy ? 0.5 : 1 }]}
          disabled={busy}
          onPress={handleCancel}
        >
          <Text style={styles.cancelText}>
            {phase === "requesting" ? "Cancelar pedido" : "Desistir da carona"}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12 },
  status: { fontSize: 14, fontWeight: "700", textTransform: "uppercase" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 8 },
  riderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  confirm: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 20,
  },
  confirmText: { color: "#fff", fontWeight: "700", fontSize: 16 },
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
