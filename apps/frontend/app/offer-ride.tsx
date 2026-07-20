import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  createRide,
  ICEA_LOCATION,
  type NamedLocation,
  type RideDirection,
} from "@carona/backend";

import { LocationPicker } from "@/components/location-picker";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSession } from "@/hooks/use-session";

const SEAT_OPTIONS = [1, 2, 3, 4];
const RIDE_DURATION_MINUTES = 60;

export default function OfferRideScreen() {
  const router = useRouter();
  const { user } = useSession();
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const [direction, setDirection] = useState<RideDirection>("toCampus");
  const [endpoint, setEndpoint] = useState<NamedLocation | null>(null);
  const [seats, setSeats] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const otherLabel =
    direction === "toCampus"
      ? "De onde você sai?"
      : "Para onde você vai (saindo do ICEA)?";

  async function handleOffer() {
    if (!endpoint || !user) {
      return;
    }

    setSubmitting(true);
    try {
      const { origin, destination } = resolveIceaEndpoints(
        endpoint,
        direction,
        ICEA_LOCATION,
      );

      await createRide({
        driverId: user.uid,
        driverName: user.displayName ?? "Motorista",
        direction,
        origin,
        destination,
        availableSeats: seats,
        durationMinutes: RIDE_DURATION_MINUTES,
      });

      router.replace("/(tabs)/ride");
    } catch (cause) {
      Alert.alert(
        "Não foi possível oferecer a carona",
        cause instanceof Error ? cause.message : "Tente novamente.",
      );
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.heading, { color: colors.text }]}>
        Toda carona passa pelo ICEA – UFOP
      </Text>

      <View style={styles.directionRow}>
        <DirectionButton
          active={direction === "toCampus"}
          label="Vou para o ICEA"
          onPress={() => setDirection("toCampus")}
          colors={colors}
        />
        <DirectionButton
          active={direction === "fromCampus"}
          label="Saio do ICEA"
          onPress={() => setDirection("fromCampus")}
          colors={colors}
        />
      </View>

      <LocationPicker
        label={otherLabel}
        value={endpoint}
        onChange={setEndpoint}
      />

      <Text style={[styles.label, { color: colors.icon }]}>Assentos livres</Text>
      <View style={styles.seatRow}>
        {SEAT_OPTIONS.map((option) => (
          <Pressable
            key={option}
            onPress={() => setSeats(option)}
            style={[
              styles.seat,
              {
                borderColor: colors.tint,
                backgroundColor: seats === option ? colors.tint : "transparent",
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

      <Pressable
        style={[
          styles.submit,
          { backgroundColor: colors.tint, opacity: endpoint ? 1 : 0.5 },
        ]}
        disabled={!endpoint || submitting}
        onPress={handleOffer}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <IconSymbol name="car.fill" size={20} color="#fff" />
            <Text style={styles.submitText}>Oferecer carona</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

function resolveIceaEndpoints(
  otherEndpoint: NamedLocation,
  direction: RideDirection,
  icea: NamedLocation,
): { origin: NamedLocation; destination: NamedLocation } {
  return direction === "toCampus"
    ? { origin: otherEndpoint, destination: icea }
    : { origin: icea, destination: otherEndpoint };
}

function DirectionButton({
  active,
  label,
  onPress,
  colors,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  colors: (typeof Colors)["light"];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.direction,
        {
          borderColor: colors.tint,
          backgroundColor: active ? colors.tint : "transparent",
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
  content: { padding: 20, gap: 16 },
  heading: { fontSize: 16, fontWeight: "600" },
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
  submit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
