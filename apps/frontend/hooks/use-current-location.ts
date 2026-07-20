import { useCallback, useEffect, useState } from "react";

import type { GeoLocation } from "@carona/backend";

import { getCurrentLocation } from "@/lib/location";

export function useCurrentLocation(): {
  location: GeoLocation | null;
  error: Error | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setLocation(await getCurrentLocation());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause
          : new Error("Não foi possível obter a localização."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { location, error, loading, refresh };
}
