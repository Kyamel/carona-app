import {
  createContext,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import {
  clearActiveRide,
  healStaleActiveRide,
  observeActiveRide,
  observeMyJoinRequest,
  observePassengers,
  observeRide,
  type ActiveRide,
  type JoinRequest,
  type Ride,
  type RidePassenger,
} from "@data";

import { useSession } from "@ui/hooks/use-session";

// Fases visíveis na UI derivadas do papel + status da carona.
export type RidePhase =
  | "idle"
  | "requesting" // passageiro aguardando aceite
  | "waiting" // passageiro aceito, aguardando início
  | "offering" // motorista com carona aberta
  | "full" // motorista marcou cheio
  | "inProgress"; // corrida em andamento

type RideSession = {
  activeRide: ActiveRide | null;
  ride: Ride | null;
  myJoinRequest: JoinRequest | null;
  passengers: RidePassenger[];
  phase: RidePhase;
  role: "driver" | "passenger" | null;
  // Momento de referência para o contador do topo (mm:ss).
  since: Date | null;
  loading: boolean;
  // Id da carona que acabou de ser concluída, capturado antes de o mutex ser
  // limpo. Consumido pelo watcher global que abre o fluxo de avaliação.
  completedRideId: string | null;
  acknowledgeCompletion: () => void;
};

const RideSessionContext = createContext<RideSession | null>(null);

export function RideSessionProvider({ children }: PropsWithChildren) {
  const { user } = useSession();
  const uid = user?.uid ?? null;

  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [ride, setRide] = useState<Ride | null>(null);
  const [myJoinRequest, setMyJoinRequest] = useState<JoinRequest | null>(null);
  const [passengers, setPassengers] = useState<RidePassenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedRideId, setCompletedRideId] = useState<string | null>(null);
  const healedFor = useRef<string | null>(null);
  const completedFor = useRef<string | null>(null);
  const passengerCanReadRide =
    activeRide?.role === "passenger" && myJoinRequest?.status === "accepted";

  useEffect(() => {
    if (!uid) {
      setActiveRide(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    return observeActiveRide(uid, (next) => {
      setActiveRide(next);
      setLoading(false);
    });
  }, [uid]);

  // Observa a carona apontada pelo mutex. Passageiro pendente ainda não pode
  // ler a ride completa, porque ela contém o local de saída do motorista.
  useEffect(() => {
    if (
      !activeRide ||
      (activeRide.role === "passenger" && myJoinRequest?.status !== "accepted")
    ) {
      setRide(null);
      healedFor.current = null;
      return;
    }

    return observeRide(activeRide.rideId, (next) => {
      setRide(next);

      // Captura a conclusão ANTES do self-heal limpar o mutex, para que o
      // prompt de avaliação seja disparado de forma confiável.
      if (next?.status === "completed" && completedFor.current !== next.id) {
        completedFor.current = next.id;
        setCompletedRideId(next.id);
      }

      const terminal =
        next == null ||
        next.status === "completed" ||
        next.status === "canceled";

      if (terminal && healedFor.current !== activeRide.rideId) {
        healedFor.current = activeRide.rideId;
        healStaleActiveRide(activeRide).catch(() => {
          healedFor.current = null;
        });
      }
    });
  }, [activeRide, myJoinRequest?.status]);

  // Passageiro: observa o próprio pedido; libera mutex se recusado.
  useEffect(() => {
    if (!activeRide || activeRide.role !== "passenger" || !uid) {
      setMyJoinRequest(null);
      return;
    }

    return observeMyJoinRequest(activeRide.rideId, uid, (request) => {
      setMyJoinRequest(request);

      if (request?.status === "declined") {
        clearActiveRide(uid).catch(() => undefined);
      }
    });
  }, [activeRide, uid]);

  // Lista de passageiros da carona. Passageiro pendente não lista esta
  // subcoleção; isso evita permission-denied e mantém co-caronistas ocultos até
  // o aceite.
  useEffect(() => {
    if (
      !activeRide ||
      (activeRide.role === "passenger" && !passengerCanReadRide)
    ) {
      setPassengers([]);
      return;
    }

    return observePassengers(activeRide.rideId, setPassengers);
  }, [activeRide, passengerCanReadRide]);

  const value = useMemo<RideSession>(() => {
    const role = activeRide?.role ?? null;
    let phase: RidePhase = "idle";
    let since: Date | null = null;

    if (activeRide) {
      if (role === "driver") {
        if (ride) {
          phase =
            ride.status === "inProgress"
              ? "inProgress"
              : ride.status === "full"
                ? "full"
                : "offering";
          since = ride.createdAt;
        }
      } else if (role === "passenger") {
        if (ride?.status === "inProgress") {
          phase = "inProgress";
        } else if (myJoinRequest?.status === "accepted") {
          phase = "waiting";
        } else {
          phase = "requesting";
        }
        since = myJoinRequest?.createdAt ?? activeRide.createdAt;
      }
    }

    return {
      activeRide,
      ride,
      myJoinRequest,
      passengers,
      phase,
      role,
      since,
      loading,
      completedRideId,
      acknowledgeCompletion: () => setCompletedRideId(null),
    };
  }, [activeRide, ride, myJoinRequest, passengers, loading, completedRideId]);

  return <RideSessionContext value={value}>{children}</RideSessionContext>;
}

export function useRideSession() {
  const session = use(RideSessionContext);
  if (!session) {
    throw new Error(
      "useRideSession precisa estar dentro de um <RideSessionProvider>.",
    );
  }
  return session;
}
