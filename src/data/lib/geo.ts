import {
  distanceBetween,
  geohashForLocation,
  geohashQueryBounds,
} from "geofire-common";

import { Coordinates, GeoLocation } from "../types/location";

export function coordinatesToGeohash(location: Coordinates): string {
  return geohashForLocation([location.latitude, location.longitude]);
}

export function createGeoLocation(coordinates: Coordinates): GeoLocation {
  return {
    ...coordinates,
    geoHash: coordinatesToGeohash(coordinates),
  };
}

export function distanceBetweenKm(
  first: Coordinates,
  second: Coordinates,
): number {
  return distanceBetween(
    [first.latitude, first.longitude],
    [second.latitude, second.longitude],
  );
}

export function createGeohashBounds(
  center: Coordinates,
  radiusKm: number,
): [string, string][] {
  return geohashQueryBounds(
    [center.latitude, center.longitude],
    radiusKm * 1000,
  );
}

// Grade de arredondamento do pino público (~0.01° ≈ 1 km nesta latitude).
// geofire-common não decodifica geohash de volta pra coordenada, então em vez
// de "centro da célula geohash" usamos snap numa grade fixa — mesmo efeito de
// borrar pro nível de bairro, de forma determinística.
const FUZZ_GRID_DEGREES = 0.01;
// geohash de 6 chars ≈ célula de ~1.2 km × 0.6 km. As rules exigem esse
// tamanho no pino público, limitando a precisão que pode ser gravada.
export const FUZZ_GEOHASH_PRECISION = 6;

// Borra a coordenada exata pro centro de uma célula de ~1 km. Usado para os
// pinos PÚBLICOS (rideOffers/rideRequests): o ponto exato nunca vai pro doc
// público, só é revelado no doc privado (joinRequest/passengers) após o aceite.
export function fuzzLocation(coordinates: Coordinates): GeoLocation {
  const latitude =
    Math.round(coordinates.latitude / FUZZ_GRID_DEGREES) * FUZZ_GRID_DEGREES;
  const longitude =
    Math.round(coordinates.longitude / FUZZ_GRID_DEGREES) * FUZZ_GRID_DEGREES;

  return {
    latitude,
    longitude,
    geoHash: geohashForLocation(
      [latitude, longitude],
      FUZZ_GEOHASH_PRECISION,
    ),
  };
}
