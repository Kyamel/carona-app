import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { cancelPendingJoinRequest, cancelRideRequest } from "@data";

import { Colors } from "@ui/constants/theme";
import { useRideSession } from "@ui/providers/ride-session";
import { DriverRideView } from "@ui/components/ride/driver-ride-view";
import { EmptyRide } from "@ui/components/ride/empty-ride";
import { IconSymbol } from "@ui/components/icons/icon-symbol";
import { PassengerRideView } from "@ui/components/ride/passenger-ride-view";
import { useColorScheme } from "@ui/hooks/use-color-scheme";
import { useSession } from "@ui/hooks/use-session";

export default function RideTab() {
  const { user } = useSession();
  const {
    activeRide,
    role,
    ride,
    myJoinRequest,
    loading,
    setRideTabFocused,
  } = useRideSession();

  // Enquanto a aba Carona está aberta, limpa/segura o badge de aceite.
  useFocusEffect(
    useCallback(() => {
      setRideTabFocused(true);
      return () => setRideTabFocused(false);
    }, [setRideTabFocused]),
  );

  // A conclusão (prompt de avaliação) e o cancelamento são tratados
  // globalmente pelo RideCompletionWatcher e pelo NotificationProvider.
  if (!user) {
    return <EmptyRide />;
  }

  // activeRides é a fonte persistente da atividade atual. Enquanto o listener
  // inicial ou os detalhes da carona carregam, não exibimos falsamente o estado
  // vazio — isso é especialmente importante logo após publicar uma oferta.
  if (loading) {
    return <LoadingRide />;
  }

  if (!activeRide || !role) {
    return <EmptyRide />;
  }

  // Requester com pedido público aberto, aguardando um motorista aceitar.
  if (role === "requester") {
    return <SeekingRideRequest uid={user.uid} />;
  }

  if (role === "driver") {
    if (!ride) {
      return <LoadingRide />;
    }
    return <DriverRideView ride={ride} driverId={user.uid} />;
  }

  if (!myJoinRequest) {
    return <LoadingRide />;
  }

  if (myJoinRequest.status === "pending") {
    return (
      <PendingRideRequest
        rideId={myJoinRequest.rideId}
        passengerId={user.uid}
      />
    );
  }

  if (!ride) {
    return <LoadingRide />;
  }

  return <PassengerRideView ride={ride} passengerId={user.uid} />;
}

function LoadingRide() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  return (
    <View style={[styles.loading, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.tint} />
      <Text style={[styles.loadingText, { color: colors.icon }]}>
        Carregando sua carona...
      </Text>
    </View>
  );
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

function SeekingRideRequest({ uid }: { uid: string }) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { myRideRequest } = useRideSession();

  async function handleCancel() {
    try {
      await cancelRideRequest(uid);
    } catch (cause) {
      Alert.alert(
        "Ops",
        cause instanceof Error ? cause.message : "Tente novamente.",
      );
    }
  }

  return (
    <View style={[styles.pending, { backgroundColor: colors.background }]}>
      <Text style={[styles.status, { color: "#1565C0" }]}>
        Pedido no mapa
      </Text>
      <Text style={[styles.title, { color: colors.text }]}>
        Aguardando um motorista
      </Text>

      {myRideRequest ? (
        <View style={[styles.routeCard, { borderColor: colors.icon }]}>
          <View style={styles.routeRow}>
            <IconSymbol name="location.fill" size={16} color="#1565C0" />
            <Text style={[styles.routeText, { color: colors.text }]}>
              {myRideRequest.originPin.label}
            </Text>
          </View>
          <View style={styles.routeRow}>
            <IconSymbol name="mappin" size={16} color="#C8102E" />
            <Text style={[styles.routeText, { color: colors.text }]}>
              {myRideRequest.destinationPin.label}
            </Text>
          </View>
        </View>
      ) : null}

      <Text style={{ color: colors.icon }}>
        Seu pedido aparece como um pino azul no mapa. Quando alguém oferecendo
        carona aceitar, você entra na carona automaticamente.
      </Text>
      <Pressable style={styles.cancel} onPress={handleCancel}>
        <Text style={styles.cancelText}>Cancelar pedido</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24,
  },
  loadingText: { fontSize: 15, fontWeight: "600" },
  pending: { flex: 1, padding: 20, gap: 12 },
  status: { fontSize: 14, fontWeight: "700", textTransform: "uppercase" },
  title: { fontSize: 20, fontWeight: "700" },
  routeCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  routeText: { fontSize: 15, fontWeight: "600", flex: 1 },
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
