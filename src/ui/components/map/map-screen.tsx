import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

import {
  bookmarkToNamedLocation,
  ICEA_LOCATION,
  isNearIcea,
  JOAO_MONLEVADE_REGION,
  observeBookmarks,
  observeOpenRideOffers,
  requestToJoinRide,
  type NamedLocation,
  type RideDirection,
  type RideOffer,
} from "@data";

import { IconSymbol } from "@ui/components/icons/icon-symbol";
import { RideSheet } from "@ui/components/map/ride-sheet";
import { SearchBar } from "@ui/components/map/search-bar";
import { Colors } from "@ui/constants/theme";
import { useColorScheme } from "@ui/hooks/use-color-scheme";
import { useCurrentLocation } from "@ui/hooks/use-current-location";
import { useSession } from "@ui/hooks/use-session";
import { useRideSession } from "@ui/providers/ride-session";

export function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const router = useRouter();
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const { user } = useSession();
  const { phase } = useRideSession();
  const { location } = useCurrentLocation();
  const [destination, setDestination] = useState<NamedLocation | null>(null);
  const [openOffers, setOpenOffers] = useState<RideOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<RideOffer | null>(null);
  const [bookmarks, setBookmarks] = useState<NamedLocation[]>([]);
  const centeredOnUser = useRef(false);

  const hasActiveRide = phase !== "idle";

  useEffect(() => {
    if (!user) {
      return;
    }
    return observeBookmarks(user.uid, (list) =>
      setBookmarks(list.map(bookmarkToNamedLocation)),
    );
  }, [user]);

  // Direção inferida pelo destino: ICEA => indo ao campus; senão => saindo.
  const direction: RideDirection | null = destination
    ? isNearIcea(destination)
      ? "toCampus"
      : "fromCampus"
    : null;

  // Ponto do passageiro fora do campus, usado para montar pickup/dropoff
  // conforme a direção.
  const riderPoint: NamedLocation | null = useMemo(() => {
    if (!destination || !direction) {
      return null;
    }
    if (direction === "toCampus") {
      return location ? { ...location, label: "Meu embarque" } : null;
    }
    return destination;
  }, [destination, direction, location]);

  useEffect(() => {
    if (location && !centeredOnUser.current) {
      centeredOnUser.current = true;
      mapRef.current?.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.015,
        },
        600,
      );
    }
  }, [location]);

  // Observa ofertas abertas na direção desejada.
  useEffect(() => {
    if (!direction || hasActiveRide) {
      setOpenOffers([]);
      return;
    }
    return observeOpenRideOffers(direction, setOpenOffers);
  }, [direction, hasActiveRide]);

  async function handleRequest(offer: RideOffer) {
    if (!user || !riderPoint) {
      return;
    }

    const pickup = direction === "toCampus" ? riderPoint : ICEA_LOCATION;
    const dropoff = direction === "toCampus" ? ICEA_LOCATION : riderPoint;

    try {
      await requestToJoinRide({
        rideId: offer.rideId,
        passengerId: user.uid,
        passengerName: user.displayName ?? "Passageiro",
        pickup,
        dropoff,
      });
      setSelectedOffer(null);
      router.navigate("/(tabs)/ride");
    } catch (cause) {
      Alert.alert(
        "Não foi possível pedir a carona",
        cause instanceof Error ? cause.message : "Tente novamente.",
      );
    }
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        initialRegion={JOAO_MONLEVADE_REGION}
        showsUserLocation
        showsMyLocationButton
        toolbarEnabled={false}
      >
        <Marker
          coordinate={ICEA_LOCATION}
          title={ICEA_LOCATION.label}
          description={ICEA_LOCATION.address}
          pinColor="#C8102E"
        />

        {destination && !isNearIcea(destination) ? (
          <Marker
            coordinate={destination}
            title={destination.label}
            description={destination.address}
          />
        ) : null}
      </MapView>

      {!hasActiveRide ? (
        <SearchBar
          destination={destination}
          bookmarks={bookmarks}
          onSelectDestination={(next) => {
            setDestination(next);
            setSelectedOffer(null);
          }}
        />
      ) : null}

      {hasActiveRide ? (
        <Pressable
          style={styles.banner}
          onPress={() => router.navigate("/(tabs)/ride")}
        >
          <Text style={styles.bannerText}>
            Você tem uma carona ativa. Toque para gerenciar.
          </Text>
        </Pressable>
      ) : null}

      {!hasActiveRide && destination && openOffers.length === 0 ? (
        <View style={[styles.hint, { backgroundColor: colors.background }]}>
          <Text style={{ color: colors.text }}>
            Nenhuma carona nessa direção agora. Que tal oferecer uma?
          </Text>
        </View>
      ) : null}

      {!hasActiveRide &&
      destination &&
      openOffers.length > 0 &&
      !selectedOffer ? (
        <View
          style={[styles.offerList, { backgroundColor: colors.background }]}
        >
          <Text style={[styles.offerTitle, { color: colors.text }]}>
            {openOffers.length}{" "}
            {openOffers.length === 1
              ? "pessoa oferecendo carona"
              : "pessoas oferecendo carona"}
          </Text>
          <Text style={{ color: colors.icon, fontSize: 13 }}>
            A localização do motorista fica oculta até ele aceitar seu pedido.
          </Text>
          <View style={styles.offerRows}>
            {openOffers.slice(0, 4).map((offer) => (
              <Pressable
                key={offer.id}
                style={styles.offerRow}
                onPress={() => setSelectedOffer(offer)}
              >
                <IconSymbol name="car.fill" size={18} color={colors.tint} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.offerName, { color: colors.text }]}>
                    {offer.driverName}
                  </Text>
                  <Text style={{ color: colors.icon, fontSize: 13 }}>
                    {offer.seatsAvailable} de {offer.availableSeats} assentos
                    livres
                  </Text>
                </View>
                <IconSymbol
                  name="chevron.right"
                  size={18}
                  color={colors.icon}
                />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {selectedOffer ? (
        <RideSheet
          offer={selectedOffer}
          onRequest={() => handleRequest(selectedOffer)}
          onClose={() => setSelectedOffer(null)}
        />
      ) : !hasActiveRide ? (
        <Pressable
          style={[styles.fab, { backgroundColor: colors.tint }]}
          onPress={() => router.navigate("/offer-ride")}
        >
          <IconSymbol name="car.fill" size={22} color="#fff" />
          <Text style={styles.fabText}>Oferecer carona</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  fab: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  banner: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    backgroundColor: "#C8102E",
    borderRadius: 12,
    padding: 14,
  },
  bannerText: { color: "#fff", fontWeight: "600", textAlign: "center" },
  hint: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 14,
    elevation: 3,
  },
  offerList: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 94,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  offerTitle: { fontSize: 16, fontWeight: "700" },
  offerRows: { gap: 10, marginTop: 2 },
  offerRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  offerName: { fontSize: 15, fontWeight: "600" },
});
