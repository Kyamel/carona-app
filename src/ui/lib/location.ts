import * as Location from "expo-location";

import {
  createGeoLocation,
  type Coordinates,
  type GeoLocation,
  type NamedLocation,
} from "@data";

export type LocalizationPermissionStatus =
  | "granted"
  | "denied"
  | "undetermined";

export async function requestLocalizationPermission(): Promise<LocalizationPermissionStatus> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status;
}

export async function getCurrentLocation(): Promise<GeoLocation> {
  const permission = await requestLocalizationPermission();

  if (permission !== "granted") {
    throw new Error("Permissão de localização negada.");
  }

  // A última posição conhecida é instantânea; só recorre ao GPS (precisão
  // balanceada, mais rápida que a alta) quando não há cache. Isso evita a
  // espera longa por um fix novo ao selecionar um endereço.
  const position =
    (await Location.getLastKnownPositionAsync()) ??
    (await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }));

  return createGeoLocation({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  });
}

// Geocodificação reversa pelo geocoder do sistema (grátis, sem Google).
export async function reverseGeocode(
  coordinates: Coordinates,
): Promise<{ label: string; address?: string }> {
  try {
    const [place] = await Location.reverseGeocodeAsync(coordinates);
    if (!place) {
      return { label: "Minha localização atual" };
    }

    const street = [place.street, place.streetNumber]
      .filter(Boolean)
      .join(", ");
    const label =
      street || place.name || place.city || "Minha localização atual";
    const address =
      [street || place.name, place.district, place.city]
        .filter(Boolean)
        .join(" - ") || undefined;

    return { label, address };
  } catch {
    return { label: "Minha localização atual" };
  }
}

// Posição atual já resolvida para um endereço legível.
export async function getCurrentNamedLocation(): Promise<NamedLocation> {
  const geo = await getCurrentLocation();
  const { label, address } = await reverseGeocode(geo);
  return { ...geo, label, address };
}

export function watchCurrentLocation(
  listener: (location: Coordinates) => void,
): () => void {
  let subscription: Location.LocationSubscription | null = null;
  let active = true;

  Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 50,
    },
    (location) => {
      listener({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    },
  ).then((nextSubscription) => {
    if (!active) {
      nextSubscription.remove();
      return;
    }

    subscription = nextSubscription;
  });

  return () => {
    active = false;
    subscription?.remove();
  };
}
