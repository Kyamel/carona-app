import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type LongPressEvent,
} from "react-native-maps";

import {
  acceptRideRequest,
  bookmarkToNamedLocation,
  createGeoLocation,
  ICEA_LOCATION,
  JOAO_MONLEVADE_REGION,
  observeAllOpenRideOffers,
  observeBookmarks,
  observeOpenRideRequests,
  requestToJoinRide,
  type NamedLocation,
  type RideOffer,
  type RideRequest,
} from "@data";

import { IconSymbol } from "@ui/components/icons/icon-symbol";
import { CreateSheet, type MapMode } from "@ui/components/map/create-sheet";
import { RideSheet } from "@ui/components/map/ride-sheet";
import { SearchBar } from "@ui/components/map/search-bar";
import { Colors } from "@ui/constants/theme";
import { useColorScheme } from "@ui/hooks/use-color-scheme";
import { useCurrentLocation } from "@ui/hooks/use-current-location";
import { reverseGeocode } from "@ui/lib/location";
import { useSession } from "@ui/hooks/use-session";
import { useRideSession } from "@ui/providers/ride-session";

// Cores dos pinos e dos modos — distintas do vermelho UFOP (ICEA).
const ICEA_COLOR = "#C8102E";
const OFFER_COLOR = "#2E7D32"; // verde: quem oferece
const REQUEST_COLOR = "#1565C0"; // azul: quem pede
const ACTIVE_COLOR = "#F9A825"; // âmbar: ponto exato da carona ativa (pós-aceite)

type Coordinate = { latitude: number; longitude: number };

// Pinos públicos são borrados para uma grade de ~1 km, então vários podem cair
// exatamente na mesma coordenada e um cobrir o outro (impossível tocar no de
// baixo). Espalha os que coincidem num pequeno círculo (~85 m) mantendo-os na
// mesma célula, para que todos fiquem clicáveis.
function spreadOverlapping(
  points: { key: string; latitude: number; longitude: number }[],
): Map<string, Coordinate> {
  const groups = new Map<string, typeof points>();
  for (const point of points) {
    const groupKey = `${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`;
    const bucket = groups.get(groupKey);
    if (bucket) {
      bucket.push(point);
    } else {
      groups.set(groupKey, [point]);
    }
  }

  const result = new Map<string, Coordinate>();
  const radius = 0.0008; // ~85 m nesta latitude
  for (const group of groups.values()) {
    if (group.length === 1) {
      const point = group[0];
      result.set(point.key, {
        latitude: point.latitude,
        longitude: point.longitude,
      });
      continue;
    }
    group.forEach((point, index) => {
      const angle = (2 * Math.PI * index) / group.length;
      result.set(point.key, {
        latitude: point.latitude + radius * Math.cos(angle),
        longitude: point.longitude + radius * Math.sin(angle),
      });
    });
  }
  return result;
}

export function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const { user } = useSession();
  const { phase, role, ride } = useRideSession();
  const { location } = useCurrentLocation();

  const [mode, setMode] = useState<MapMode>("request");
  const [seed, setSeed] = useState<NamedLocation | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<NamedLocation[]>([]);
  const [openOffers, setOpenOffers] = useState<RideOffer[]>([]);
  const [openRequests, setOpenRequests] = useState<RideRequest[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<RideOffer | null>(null);
  const centeredOnUser = useRef(false);

  const hasActiveRide = phase !== "idle";
  const isOfferingDriver =
    role === "driver" && (phase === "offering" || phase === "full") && !!ride;
  const accent = mode === "request" ? REQUEST_COLOR : OFFER_COLOR;

  // Coordenadas dos pinos públicos já com desempate para os que coincidem.
  const spread = useMemo(
    () =>
      spreadOverlapping([
        ...openOffers.map((offer) => ({
          key: `offer-${offer.id}`,
          latitude: offer.endpointPin.latitude,
          longitude: offer.endpointPin.longitude,
        })),
        ...openRequests.map((request) => ({
          key: `request-${request.id}`,
          latitude: request.originPin.latitude,
          longitude: request.originPin.longitude,
        })),
      ]),
    [openOffers, openRequests],
  );

  // Ponto EXATO da carona ativa (lado não-ICEA), legível só após o aceite — a
  // ride privada substitui o pino borrado pela localização real. Só enquanto a
  // carona está viva; some ao finalizar/cancelar.
  const rideLive =
    ride != null &&
    (ride.status === "open" ||
      ride.status === "full" ||
      ride.status === "inProgress");
  const exactEndpoint = rideLive
    ? ride!.direction === "toCampus"
      ? ride!.origin
      : ride!.destination
    : null;

  useEffect(() => {
    if (!user) {
      return;
    }
    return observeBookmarks(user.uid, (list) =>
      setBookmarks(list.map(bookmarkToNamedLocation)),
    );
  }, [user]);

  // Pinos públicos: sempre visíveis (ofertas e pedidos abertos).
  useEffect(() => observeAllOpenRideOffers(setOpenOffers), []);
  useEffect(() => observeOpenRideRequests(setOpenRequests), []);

  useEffect(() => {
    if (location && !centeredOnUser.current) {
      centeredOnUser.current = true;
      mapRef.current?.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.04,
        },
        600,
      );
    }
  }, [location]);

  // Passageiro toca numa oferta e pede pra entrar. Ponto exato do embarque =
  // GPS atual; o lado do campus é o ICEA (satisfaz nearIcea nas rules).
  async function joinOffer(offer: RideOffer) {
    if (!user) {
      return;
    }
    const point: NamedLocation | null = location
      ? { ...location, label: "Meu embarque" }
      : null;
    if (!point) {
      Alert.alert("Localização indisponível", "Ative o GPS e tente de novo.");
      return;
    }
    const pickup = offer.direction === "toCampus" ? point : ICEA_LOCATION;
    const dropoff = offer.direction === "toCampus" ? ICEA_LOCATION : point;

    try {
      await requestToJoinRide({
        rideId: offer.rideId,
        passengerId: user.uid,
        passengerName: user.displayName ?? "Passageiro",
        pickup,
        dropoff,
      });
      setSelectedOffer(null);
    } catch (cause) {
      Alert.alert(
        "Não foi possível pedir a carona",
        cause instanceof Error ? cause.message : "Tente novamente.",
      );
    }
  }

  // Motorista com carona aberta aceita um pedido público direto do pino.
  function onRequestPin(request: RideRequest) {
    if (!isOfferingDriver || !ride) {
      Alert.alert(
        "Pedido de carona",
        "Ofereça uma carona para poder aceitar pedidos de outras pessoas.",
      );
      return;
    }
    Alert.alert(
      "Aceitar pedido?",
      `${request.passengerName}: ${request.originPin.label} → ${request.destinationPin.label}. Ao aceitar, ele entra na sua carona.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aceitar",
          onPress: async () => {
            try {
              await acceptRideRequest(ride.id, request);
            } catch (cause) {
              Alert.alert(
                "Não foi possível aceitar",
                cause instanceof Error ? cause.message : "Tente novamente.",
              );
            }
          },
        },
      ],
    );
  }

  // Tocar num modo já selecionado abre a busca; tocar no outro troca o modo.
  function onModePress(target: MapMode) {
    if (mode === target) {
      setSearchOpen(true);
    } else {
      setMode(target);
    }
  }

  // Segurar o dedo no mapa solta um marcador ali e usa aquele ponto como destino
  // (pedir) / endpoint (oferecer) — alternativa à busca por texto.
  async function onMapLongPress(event: LongPressEvent) {
    if (hasActiveRide || sheetOpen || selectedOffer) {
      return;
    }
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const geo = createGeoLocation({ latitude, longitude });
    const { label, address } = await reverseGeocode({ latitude, longitude });
    setSeed({ ...geo, label, address });
    setSearchOpen(false);
    setSheetOpen(true);
  }

  function onOfferPin(offer: RideOffer) {
    if (hasActiveRide) {
      Alert.alert(
        "Você já tem uma atividade",
        "Gerencie ou cancele sua carona/pedido atual antes de entrar em outra.",
      );
      return;
    }
    setSelectedOffer(offer);
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
        onLongPress={onMapLongPress}
      >
        <Marker
          coordinate={ICEA_LOCATION}
          title={ICEA_LOCATION.label}
          description={ICEA_LOCATION.address}
          pinColor={ICEA_COLOR}
        />

        {/* Ponto escolhido por long-press (antes de publicar). */}
        {seed && !hasActiveRide ? (
          <Marker
            coordinate={seed}
            title={seed.label}
            description={mode === "request" ? "Destino do pedido" : "Ponto da oferta"}
            pinColor={accent}
          />
        ) : null}

        {openOffers.map((offer) => (
          <Marker
            key={`offer-${offer.id}`}
            coordinate={spread.get(`offer-${offer.id}`) ?? offer.endpointPin}
            title={`${offer.driverName} · oferecendo`}
            description={`${
              offer.direction === "toCampus"
                ? `${offer.endpointPin.label} → ICEA`
                : `ICEA → ${offer.endpointPin.label}`
            } · ${offer.seatsAvailable} de ${offer.availableSeats} assentos`}
            pinColor={OFFER_COLOR}
            onPress={() => onOfferPin(offer)}
          />
        ))}

        {openRequests.map((request) => (
          <Marker
            key={`request-${request.id}`}
            coordinate={spread.get(`request-${request.id}`) ?? request.originPin}
            title={`${request.passengerName} · pedindo carona`}
            description={`${request.originPin.label} → ${request.destinationPin.label}`}
            pinColor={REQUEST_COLOR}
            onPress={() => onRequestPin(request)}
          />
        ))}

        {/* Ponto exato da carona ativa, revelado só após o aceite. */}
        {exactEndpoint ? (
          <Marker
            key="active-exact"
            coordinate={exactEndpoint}
            title={exactEndpoint.label}
            description={
              role === "driver" ? "Seu ponto na carona" : "Ponto do motorista"
            }
            pinColor={ACTIVE_COLOR}
          />
        ) : null}
      </MapView>

      {!hasActiveRide ? (
        <SearchBar
          destination={seed}
          bookmarks={bookmarks}
          tintColor={accent}
          expanded={searchOpen}
          onExpandedChange={setSearchOpen}
          placeholder={
            mode === "request" ? "Para onde você vai?" : "De/para onde? (ICEA)"
          }
          onSelectDestination={(next) => {
            setSeed(next);
            if (next) {
              setSheetOpen(true);
            }
          }}
        />
      ) : null}

      {!hasActiveRide ? (
        <View style={[styles.counter, { backgroundColor: colors.background }]}>
          <IconSymbol name="car.fill" size={15} color={OFFER_COLOR} />
          <Text style={[styles.counterText, { color: colors.text }]}>
            {openOffers.length}
          </Text>
          <IconSymbol name="figure.wave" size={15} color={REQUEST_COLOR} />
          <Text style={[styles.counterText, { color: colors.text }]}>
            {openRequests.length}
          </Text>
        </View>
      ) : null}

      {!hasActiveRide ? (
        <View style={styles.modeSelector}>
          <ModeButton
            active={mode === "request"}
            label="Pedir carona"
            icon="figure.wave"
            color={REQUEST_COLOR}
            colors={colors}
            onPress={() => onModePress("request")}
          />
          <ModeButton
            active={mode === "offer"}
            label="Oferecer"
            icon="car.fill"
            color={OFFER_COLOR}
            colors={colors}
            onPress={() => onModePress("offer")}
          />
        </View>
      ) : null}

      {selectedOffer ? (
        <RideSheet
          offer={selectedOffer}
          onRequest={() => joinOffer(selectedOffer)}
          onClose={() => setSelectedOffer(null)}
        />
      ) : null}

      <CreateSheet
        mode={mode}
        visible={sheetOpen && !hasActiveRide}
        accent={accent}
        seed={seed}
        user={user ? { uid: user.uid, displayName: user.displayName } : null}
        bookmarks={bookmarks}
        currentLocation={location}
        openOffers={openOffers}
        openRequests={openRequests}
        onClose={() => setSheetOpen(false)}
        onCreated={() => {
          setSheetOpen(false);
          setSeed(null);
        }}
      />
    </View>
  );
}

function ModeButton({
  active,
  label,
  icon,
  color,
  colors,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: ComponentProps<typeof IconSymbol>["name"];
  color: string;
  colors: (typeof Colors)["light"];
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.modeButton,
        {
          backgroundColor: active ? color : colors.background,
        },
      ]}
      onPress={onPress}
    >
      <IconSymbol name={icon} size={18} color={active ? "#fff" : color} />
      <Text
        style={[
          styles.modeText,
          { color: active ? "#fff" : colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  counter: {
    position: "absolute",
    top: 74,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  counterText: { fontSize: 14, fontWeight: "700", marginRight: 4 },
  modeSelector: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    flexDirection: "row",
    gap: 10,
    padding: 6,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  modeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  modeText: { fontWeight: "700", fontSize: 15 },
});
