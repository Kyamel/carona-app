import { createGeoLocation } from "../lib/geo";
import type { Coordinates, NamedLocation } from "../types/location";

// Campus ICEA – UFOP, João Monlevade (OSM way 627050352).
export const ICEA_COORDINATES: Coordinates = {
  latitude: -19.8358432,
  longitude: -43.1678773,
};

export const ICEA_LOCATION: NamedLocation = {
  ...createGeoLocation(ICEA_COORDINATES),
  label: "ICEA – UFOP",
  address: "R. Trinta e Seis, 115 – Loanda, João Monlevade – MG",
};

// Caixa de ~±440 m em torno do campus. Espelhada em firestore.rules
// (função nearIcea) — mantenha as duas em sincronia.
export const ICEA_BOUNDS = {
  minLatitude: ICEA_COORDINATES.latitude - 0.004,
  maxLatitude: ICEA_COORDINATES.latitude + 0.004,
  minLongitude: ICEA_COORDINATES.longitude - 0.004,
  maxLongitude: ICEA_COORDINATES.longitude + 0.004,
};

export function isNearIcea(coordinates: Coordinates): boolean {
  return (
    coordinates.latitude > ICEA_BOUNDS.minLatitude &&
    coordinates.latitude < ICEA_BOUNDS.maxLatitude &&
    coordinates.longitude > ICEA_BOUNDS.minLongitude &&
    coordinates.longitude < ICEA_BOUNDS.maxLongitude
  );
}

// Região inicial do mapa: João Monlevade inteira, com o ICEA visível.
export const JOAO_MONLEVADE_REGION = {
  latitude: -19.8215,
  longitude: -43.1715,
  latitudeDelta: 0.06,
  longitudeDelta: 0.045,
};
