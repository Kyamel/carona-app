import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  acceptJoinRequest,
  cancelRideAsDriver,
  completeRide,
  declineJoinRequest,
  markRideFull,
  observeJoinRequests,
  observeMyProfile,
  releasePassengerSeat,
  reopenRide,
  startRide,
  type JoinRequest,
  type Ride,
} from "@data";

import { Colors } from "@ui/constants/theme";
import { useRideSession } from "@ui/providers/ride-session";
import { IconSymbol } from "@ui/components/icons/icon-symbol";
import { confirmCancel } from "@ui/components/ride/cancel-warning";
import { useColorScheme } from "@ui/hooks/use-color-scheme";

const STATUS_LABEL: Record<string, string> = {
  open: "Oferecendo carona",
  full: "Carro cheio",
  inProgress: "Carona em andamento",
};

export function DriverRideView({
  ride,
  driverId,
}: {
  ride: Ride;
  driverId: string;
}) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { passengers } = useRideSession();

  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [pixKey, setPixKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const releasedSeats = useRef<Set<string>>(new Set());

  useEffect(() => observeJoinRequests(ride.id, setRequests), [ride.id]);
  useEffect(
    () => observeMyProfile(driverId, (p) => setPixKey(p?.pixKey ?? null)),
    [driverId],
  );

  const pending = requests.filter((request) => request.status === "pending");
  const accepted = passengers.filter((p) => p.status === "accepted");
  // Só libera iniciar quando todos os passageiros confirmaram (pedintes de
  // pedido público entram como não confirmados até aceitarem o motorista).
  const allConfirmed = accepted.every((p) => p.confirmed);

  // Devolve o assento quando um passageiro aceito desiste (uma vez por uid).
  useEffect(() => {
    const canceled = passengers.filter(
      (p) => p.status === "canceled" && !releasedSeats.current.has(p.uid),
    );
    if (canceled.length === 0) {
      return;
    }
    canceled.forEach((p) => releasedSeats.current.add(p.uid));
    releasePassengerSeat(ride.id, ride.status === "full").catch(
      () => undefined,
    );
  }, [passengers, ride.id, ride.status]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (cause) {
      Alert.alert(
        "Ops",
        cause instanceof Error ? cause.message : "Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    await run(() =>
      startRide(
        ride.id,
        pending.map((request) => request.passengerId),
      ),
    );
  }

  async function handleComplete() {
    await run(() => completeRide(ride.id, pixKey));
  }

  async function handleCancel() {
    const stage = ride.status === "inProgress" ? "inProgress" : ride.status;
    const hasPassengers = accepted.length > 0;
    const message = hasPassengers
      ? "Passageiros podem já estar a caminho do ponto de encontro."
      : "Sua carona ainda não tem ninguém a bordo.";

    if (await confirmCancel(message, hasPassengers)) {
      await run(() =>
        cancelRideAsDriver(
          ride.id,
          driverId,
          stage as "open" | "full" | "inProgress",
          hasPassengers,
        ),
      );
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.status, { color: colors.tint }]}>
        {STATUS_LABEL[ride.status] ?? ride.status}
      </Text>
      <View style={[styles.routeCard, { borderColor: colors.icon }]}>
        <View style={styles.routeRow}>
          <IconSymbol name="location.fill" size={16} color="#1565C0" />
          <Text style={[styles.routeText, { color: colors.text }]}>
            {ride.origin.label}
          </Text>
        </View>
        <View style={styles.routeRow}>
          <IconSymbol name="mappin" size={16} color="#C8102E" />
          <Text style={[styles.routeText, { color: colors.text }]}>
            {ride.destination.label}
          </Text>
        </View>
      </View>
      <Text style={[styles.seats, { color: colors.icon }]}>
        {ride.seatsAvailable} de {ride.availableSeats} assentos livres
      </Text>

      {ride.status !== "inProgress" ? (
        <Section title={`Pedidos (${pending.length})`} colors={colors}>
          {pending.length === 0 ? (
            <Text style={{ color: colors.icon }}>
              Nenhum pedido no momento.
            </Text>
          ) : (
            pending.map((request) => (
              <View key={request.id} style={styles.requestRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.text }]}>
                    {request.passengerName}
                  </Text>
                  <Text
                    style={{ color: colors.icon, fontSize: 13 }}
                    numberOfLines={1}
                  >
                    Embarque: {request.pickup.label}
                  </Text>
                </View>
                <Pressable
                  disabled={busy}
                  onPress={() =>
                    run(() => acceptJoinRequest(ride.id, request.passengerId))
                  }
                  style={[styles.iconButton, { backgroundColor: colors.tint }]}
                >
                  <IconSymbol name="checkmark" size={18} color="#fff" />
                </Pressable>
                <Pressable
                  disabled={busy}
                  onPress={() =>
                    run(() => declineJoinRequest(ride.id, request.passengerId))
                  }
                  style={[styles.iconButton, { backgroundColor: "#8E8E93" }]}
                >
                  <IconSymbol name="xmark" size={18} color="#fff" />
                </Pressable>
              </View>
            ))
          )}
        </Section>
      ) : null}

      <Section title={`A bordo (${accepted.length})`} colors={colors}>
        {accepted.length === 0 ? (
          <Text style={{ color: colors.icon }}>Ninguém a bordo ainda.</Text>
        ) : (
          accepted.map((passenger) => (
            <View key={passenger.uid} style={styles.passengerRow}>
              <IconSymbol name="person.fill" size={18} color={colors.tint} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>
                  {passenger.name}
                </Text>
                <Text
                  style={{ color: colors.icon, fontSize: 13 }}
                  numberOfLines={1}
                >
                  {passenger.pickup.label} → {passenger.dropoff.label}
                </Text>
                {!passenger.confirmed ? (
                  <Text style={styles.pendingConfirm}>
                    Aguardando confirmação
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/chat",
                    params: {
                      rideId: ride.id,
                      threadId: passenger.uid,
                      title: passenger.name,
                    },
                  })
                }
                style={[styles.iconButton, { backgroundColor: colors.tint }]}
              >
                <IconSymbol name="bubble.left.fill" size={18} color="#fff" />
              </Pressable>
            </View>
          ))
        )}
      </Section>

      <View style={styles.actions}>
        {ride.status === "open" ? (
          <ActionButton
            label="Marcar carro como cheio"
            onPress={() => run(() => markRideFull(ride.id))}
            disabled={busy}
            colors={colors}
            variant="outline"
          />
        ) : null}
        {ride.status === "full" ? (
          <ActionButton
            label="Reabrir para pedidos"
            onPress={() => run(() => reopenRide(ride.id))}
            disabled={busy}
            colors={colors}
            variant="outline"
          />
        ) : null}
        {ride.status !== "inProgress" ? (
          <ActionButton
            label={
              accepted.length > 0 && !allConfirmed
                ? "Aguardando confirmação dos passageiros"
                : "Iniciar carona"
            }
            onPress={handleStart}
            disabled={busy || accepted.length === 0 || !allConfirmed}
            colors={colors}
          />
        ) : (
          <ActionButton
            label="Finalizar carona"
            onPress={handleComplete}
            disabled={busy}
            colors={colors}
          />
        )}
        <ActionButton
          label="Cancelar carona"
          onPress={handleCancel}
          disabled={busy}
          colors={colors}
          variant="danger"
        />
      </View>
    </ScrollView>
  );
}

function Section({
  title,
  colors,
  children,
}: {
  title: string;
  colors: (typeof Colors)["light"];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  colors,
  variant = "solid",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  colors: (typeof Colors)["light"];
  variant?: "solid" | "outline" | "danger";
}) {
  const background =
    variant === "solid"
      ? colors.tint
      : variant === "danger"
        ? "#fff"
        : "transparent";
  const textColor =
    variant === "solid"
      ? "#fff"
      : variant === "danger"
        ? "#C8102E"
        : colors.tint;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.action,
        {
          backgroundColor: background,
          borderColor: variant === "danger" ? "#C8102E" : colors.tint,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Text style={{ color: textColor, fontWeight: "700", fontSize: 16 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 8 },
  status: { fontSize: 14, fontWeight: "700", textTransform: "uppercase" },
  routeCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 4,
  },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  routeText: { fontSize: 15, fontWeight: "600", flex: 1 },
  seats: { fontSize: 14, marginTop: 8, marginBottom: 8 },
  section: { gap: 10, marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  requestRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  passengerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: { fontSize: 15, fontWeight: "600" },
  pendingConfirm: { fontSize: 12, fontWeight: "700", color: "#B26A00" },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: { gap: 12, marginTop: 20 },
  action: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
});
