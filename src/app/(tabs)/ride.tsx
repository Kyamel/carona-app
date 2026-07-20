import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { cancelPendingJoinRequest } from "@data";

import { Colors } from "@ui/constants/theme";
import { useRideSession } from "@ui/providers/ride-session";
import { DriverRideView } from "@ui/components/ride/driver-ride-view";
import { EmptyRide } from "@ui/components/ride/empty-ride";
import { PassengerRideView } from "@ui/components/ride/passenger-ride-view";
import { useColorScheme } from "@ui/hooks/use-color-scheme";
import { useSession } from "@ui/hooks/use-session";

export default function RideTab() {
  const { user } = useSession();
  const { role, ride, phase, myJoinRequest } = useRideSession();

  // A conclusão (prompt de avaliação) e o cancelamento são tratados
  // globalmente pelo RideCompletionWatcher e pelo NotificationProvider.
  if (!user || phase === "idle") {
    return <EmptyRide />;
  }

  if (role === "driver") {
    if (!ride) {
      return <EmptyRide />;
    }
    return <DriverRideView ride={ride} driverId={user.uid} />;
  }

  if (phase === "requesting" && myJoinRequest) {
    return (
      <PendingRideRequest
        rideId={myJoinRequest.rideId}
        passengerId={user.uid}
      />
    );
  }

  if (!ride) {
    return <EmptyRide />;
  }

  return <PassengerRideView ride={ride} passengerId={user.uid} />;
}

function PendingRideRequest({
  rideId,
  passengerId,
}: {
  rideId: string;
  passengerId: string;
}) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  async function handleCancel() {
    try {
      await cancelPendingJoinRequest(rideId, passengerId);
    } catch (cause) {
      Alert.alert(
        "Ops",
        cause instanceof Error ? cause.message : "Tente novamente.",
      );
    }
  }

  return (
    <View style={[styles.pending, { backgroundColor: colors.background }]}>
      <Text style={[styles.status, { color: colors.tint }]}>
        Procurando carona
      </Text>
      <Text style={[styles.title, { color: colors.text }]}>Pedido enviado</Text>
      <Text style={{ color: colors.icon }}>
        Você verá o local de saída do motorista se ele aceitar.
      </Text>
      <Pressable style={styles.cancel} onPress={handleCancel}>
        <Text style={styles.cancelText}>Cancelar pedido</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pending: { flex: 1, padding: 20, gap: 12 },
  status: { fontSize: 14, fontWeight: "700", textTransform: "uppercase" },
  title: { fontSize: 20, fontWeight: "700" },
  cancel: {
    borderWidth: 1,
    borderColor: "#C8102E",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 16,
  },
  cancelText: { color: "#C8102E", fontWeight: "700", fontSize: 16 },
});
