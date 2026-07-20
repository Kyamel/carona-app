export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type GeoLocation = Coordinates & {
  geoHash: string;
};

export type NamedLocation = GeoLocation & {
  label: string;
  address?: string;
};
