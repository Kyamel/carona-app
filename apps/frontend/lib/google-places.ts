import {
  createGeoLocation,
  JOAO_MONLEVADE_REGION,
  type NamedLocation,
} from "@carona/backend";

const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

export type PlaceSuggestion = {
  placeId: string;
  primaryText: string;
  secondaryText: string;
};

export async function autocompletePlaces(
  input: string,
): Promise<PlaceSuggestion[]> {
  const trimmed = input.trim();

  if (!PLACES_KEY || trimmed.length < 3) {
    return [];
  }

  const response = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": PLACES_KEY,
      },
      body: JSON.stringify({
        input: trimmed,
        languageCode: "pt-BR",
        regionCode: "BR",
        locationBias: {
          circle: {
            center: {
              latitude: JOAO_MONLEVADE_REGION.latitude,
              longitude: JOAO_MONLEVADE_REGION.longitude,
            },
            radius: 15000,
          },
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error("Não foi possível buscar endereços.");
  }

  const data: {
    suggestions?: {
      placePrediction?: {
        placeId: string;
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
        text?: { text?: string };
      };
    }[];
  } = await response.json();

  return (data.suggestions ?? []).flatMap((suggestion) => {
    const prediction = suggestion.placePrediction;

    if (!prediction) {
      return [];
    }

    return [
      {
        placeId: prediction.placeId,
        primaryText:
          prediction.structuredFormat?.mainText?.text ??
          prediction.text?.text ??
          "Endereço",
        secondaryText: prediction.structuredFormat?.secondaryText?.text ?? "",
      },
    ];
  });
}

export async function getPlaceLocation(
  suggestion: PlaceSuggestion,
): Promise<NamedLocation> {
  if (!PLACES_KEY) {
    throw new Error("Chave do Google Maps não configurada.");
  }

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${suggestion.placeId}`,
    {
      headers: {
        "X-Goog-Api-Key": PLACES_KEY,
        "X-Goog-FieldMask": "location,formattedAddress",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Não foi possível carregar o endereço selecionado.");
  }

  const data: {
    location?: { latitude?: number; longitude?: number };
    formattedAddress?: string;
  } = await response.json();

  if (
    typeof data.location?.latitude !== "number" ||
    typeof data.location?.longitude !== "number"
  ) {
    throw new Error("Endereço sem coordenadas.");
  }

  return {
    ...createGeoLocation({
      latitude: data.location.latitude,
      longitude: data.location.longitude,
    }),
    label: suggestion.primaryText,
    address: data.formattedAddress,
  };
}
