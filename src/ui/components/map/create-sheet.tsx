import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  corridorMatch,
  createRide,
  createRideRequest,
  distanceBetweenKm,
  ICEA_LOCATION,
  type GeoLocation,
  type NamedLocation,
  type RideDirection,
  type RideOffer,
  type RideRequest,
} from "@data";

import { IconSymbol } from "@ui/components/icons/icon-symbol";
import { LocationPicker } from "@ui/components/location-picker";
import { Colors } from "@ui/constants/theme";
import { useColorScheme } from "@ui/hooks/use-color-scheme";
import { getCurrentNamedLocation } from "@ui/lib/location";

export type MapMode = "request" | "offer";

const SEAT_OPTIONS = [1, 2, 3, 4];
const DURATION_MINUTES = 60;

type CreateSheetProps = {
  mode: MapMode;
  visible: boolean;
  accent: string;
  onClose: () => void;
  onCreated: () => void;
  user: { uid: string; displayName: string | null } | null;
  bookmarks: NamedLocation[];
  currentLocation: GeoLocation | null;
  openOffers: RideOffer[];
  openRequests: RideRequest[];
  // Local escolhido na barra de busca: semeia o destino (pedir) ou o extremo
  // não-ICEA (oferecer).
  seed: NamedLocation | null;
};

// Modal único de criação, no mapa, para os dois modos. Pedir: origem (default =
// posição atual, editável) + destino, nenhum precisa tocar o ICEA. Oferecer:
// direção + o outro extremo (o ICEA é implícito) + assentos.
export function CreateSheet({
  mode,
  visible,
  accent,
  onClose,
  onCreated,
  user,
  bookmarks,
  currentLocation,
  openOffers,
  openRequests,
  seed,
}: CreateSheetProps) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const [origin, setOrigin] = useState<NamedLocation | null>(null);
  const [destination, setDestination] = useState<NamedLocation | null>(null);
  const [direction, setDirection] = useState<RideDirection>("fromCampus");
  const [endpoint, setEndpoint] = useState<NamedLocation | null>(null);
  const [seats, setSeats] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  // Semeia os campos só UMA vez por abertura. Sem isto, limpar a origem (X)
  // dispararia o re-preenchimento e prenderia o usuário na posição atual.
  const seededRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      seededRef.current = false;
      return;
    }
    if (seededRef.current) {
      return;
    }
    seededRef.current = true;

    if (mode === "request") {
      if (seed) {
        setDestination(seed);
      }
      // Origem = posição atual já com endereço legível (reverse-geocode).
      getCurrentNamedLocation()
        .then(setOrigin)
        .catch(() => {
          if (currentLocation) {
            setOrigin({ ...currentLocation, label: "Minha localização atual" });
          }
        });
    } else if (seed) {
      setEndpoint(seed);
    }
  }, [visible, mode, seed, currentLocation]);

  function reset() {
    setOrigin(null);
    setDestination(null);
    setEndpoint(null);
    setSeats(3);
    setDirection("fromCampus");
    seededRef.current = false;
  }

  // Contador ao vivo de matches enquanto o usuário preenche.
  const matchCount = useMemo(() => {
    if (mode === "request") {
      if (!origin || !destination) {
        return null;
      }
      return openOffers.filter((offer) =>
        corridorMatch(origin, destination, offer.endpointPin),
      ).length;
    }
    if (!endpoint) {
      return null;
    }
    return openRequests.filter((request) =>
      corridorMatch(request.originPin, request.destinationPin, endpoint),
    ).length;
  }, [mode, origin, destination, endpoint, openOffers, openRequests]);

  // Origem e destino coincidentes (mesmo ponto, ~50 m): pedido sem sentido.
  const sameEndpoints =
    mode === "request" &&
    Boolean(origin && destination) &&
    distanceBetweenKm(origin!, destination!) < 0.05;

  const canSubmit =
    mode === "request"
      ? Boolean(origin && destination) && !sameEndpoints
      : Boolean(endpoint);

  async function handleSubmit() {
    if (!user || !canSubmit) {
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "request" && origin && destination) {
        await createRideRequest({
          passengerId: user.uid,
          passengerName: user.displayName ?? "Passageiro",
          origin,
          destination,
          durationMinutes: DURATION_MINUTES,
        });
      } else if (mode === "offer" && endpoint) {
        const { rideOrigin, rideDestination } = resolveIceaEndpoints(
          endpoint,
          direction,
        );
        await createRide({
          driverId: user.uid,
          driverName: user.displayName ?? "Motorista",
          direction,
          origin: rideOrigin,
          destination: rideDestination,
          availableSeats: seats,
          durationMinutes: DURATION_MINUTES,
        });
      }
      reset();
      onCreated();
    } catch (cause) {
      Alert.alert(
        "Não foi possível publicar",
        cause instanceof Error ? cause.message : "Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {mode === "request" ? "Pedir carona" : "Oferecer carona"}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <IconSymbol name="xmark" size={22} color={colors.icon} />
            </Pressable>
          </View>

          {mode === "request" ? (
            <>
              <LocationPicker
                label="De onde você sai?"
                value={origin}
                onChange={setOrigin}
                bookmarks={bookmarks}
              />
              <LocationPicker
                label="Para onde você vai?"
                value={destination}
                onChange={setDestination}
                bookmarks={bookmarks}
              />
            </>
          ) : (
            <>
              <Text style={[styles.hint, { color: colors.icon }]}>
                Toda oferta passa pelo ICEA – UFOP.
              </Text>
              <View style={styles.directionRow}>
                <DirectionButton
                  active={direction === "toCampus"}
                  label="Vou para o ICEA"
                  accent={accent}
                  colors={colors}
                  onPress={() => setDirection("toCampus")}
                />
                <DirectionButton
                  active={direction === "fromCampus"}
                  label="Saio do ICEA"
                  accent={accent}
                  colors={colors}
                  onPress={() => setDirection("fromCampus")}
                />
              </View>
              <LocationPicker
                label={
                  direction === "toCampus"
                    ? "De onde você sai?"
                    : "Para onde você vai?"
                }
                value={endpoint}
                onChange={setEndpoint}
                bookmarks={bookmarks}
              />
              <Text style={[styles.label, { color: colors.icon }]}>
                Assentos livres
              </Text>
              <View style={styles.seatRow}>
                {SEAT_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setSeats(option)}
                    style={[
                      styles.seat,
                      {
                        borderColor: accent,
                        backgroundColor:
                          seats === option ? accent : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: seats === option ? "#fff" : colors.text,
                        fontWeight: "700",
                        fontSize: 16,
                      }}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {sameEndpoints ? (
            <Text style={styles.warning}>
              Origem e destino não podem ser iguais.
            </Text>
          ) : null}

          {matchCount != null && !sameEndpoints ? (
            <Text style={[styles.match, { color: accent }]}>
              {matchCount}{" "}
              {mode === "request"
                ? matchCount === 1
                  ? "oferta compatível agora"
                  : "ofertas compatíveis agora"
                : matchCount === 1
                  ? "pedido compatível agora"
                  : "pedidos compatíveis agora"}
            </Text>
          ) : null}

          <Pressable
            style={[
              styles.submit,
              { backgroundColor: accent, opacity: canSubmit ? 1 : 0.5 },
            ]}
            disabled={!canSubmit || submitting}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {mode === "request" ? "Publicar pedido" : "Publicar oferta"}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function resolveIceaEndpoints(
  endpoint: NamedLocation,
  direction: RideDirection,
): { rideOrigin: NamedLocation; rideDestination: NamedLocation } {
  return direction === "toCampus"
    ? { rideOrigin: endpoint, rideDestination: ICEA_LOCATION }
    : { rideOrigin: ICEA_LOCATION, rideDestination: endpoint };
}

function DirectionButton({
  active,
  label,
  accent,
  colors,
  onPress,
}: {
  active: boolean;
  label: string;
  accent: string;
  colors: (typeof Colors)["light"];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.direction,
        {
          borderColor: accent,
          backgroundColor: active ? accent : "transparent",
        },
      ]}
    >
      <Text
        style={{
          color: active ? "#fff" : colors.text,
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "88%",
  },
  content: { padding: 20, gap: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 20, fontWeight: "700" },
  hint: { fontSize: 14 },
  directionRow: { flexDirection: "row", gap: 12 },
  direction: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
  },
  label: { fontSize: 13, fontWeight: "600", textTransform: "uppercase" },
  seatRow: { flexDirection: "row", gap: 12 },
  seat: {
    width: 52,
    height: 52,
    borderWidth: 1,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  match: { fontSize: 15, fontWeight: "700" },
  warning: { fontSize: 14, fontWeight: "600", color: "#C8102E" },
  submit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 4,
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
