
import {
  distanceBetween,
  geohashForLocation,
  geohashQueryBounds,
} from "geofire-common";

import { Coordinates } from "@/types/location";

export function coordinatesToGeohash(location: Coordinates): string {
  return geohashForLocation([location.latitude, location.longitude]);
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
