import {
  createContext,
  use,
  useCallback,
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
  observeJoinRequests,
  observeMyJoinRequest,
  observeMyRideRequest,
  observePassengers,
  observeRide,
  promoteRequesterToPassenger,
  type ActiveRide,
  type ActiveRideRole,
  type JoinRequest,
  type Ride,
  type RidePassenger,
  type RideRequest,
} from "@data";

import { useSession } from "@ui/hooks/use-session";

// Fases visíveis na UI derivadas do papel + status da carona.
export type RidePhase =
  | "idle"
  | "seeking" // requester com pedido público aberto, aguardando um motorista
  | "requesting" // passageiro aguardando aceite
  | "waiting" // passageiro aceito, aguardando início
  | "offering" // motorista com carona aberta
  | "full" // motorista marcou cheio
  | "inProgress"; // corrida em andamento

type RideSession = {
  activeRide: ActiveRide | null;
  ride: Ride | null;
  myJoinRequest: JoinRequest | null;
  // Pedido público do próprio usuário enquanto ele é 'requester'.
  myRideRequest: RideRequest | null;
  passengers: RidePassenger[];
  phase: RidePhase;
  role: ActiveRideRole | null;
  // Momento de referência para o contador do topo (mm:ss).
  since: Date | null;
  loading: boolean;
  // Id da carona que acabou de ser concluída, capturado antes de o mutex ser
  // limpo. Consumido pelo watcher global que abre o fluxo de avaliação.
  completedRideId: string | null;
  acknowledgeCompletion: () => void;
  // Badge vermelho na aba Carona: liga quando algo pede atenção (pedido aceito,
  // novo passageiro, novo pedido para o motorista) e o usuário não está com a
  // aba Carona aberta; desliga ao abrir a aba.
  acceptanceBadge: boolean;
  flagAcceptance: () => void;
  setRideTabFocused: (focused: boolean) => void;
  // Nº de pedidos pendentes na carona do motorista (para notificar/badge de
  // "alguém quer entrar").
  pendingJoinCount: number;
};

const RideSessionContext = createContext<RideSession | null>(null);

export function RideSessionProvider({ children }: PropsWithChildren) {
  const { user } = useSession();
  const uid = user?.uid ?? null;

  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [ride, setRide] = useState<Ride | null>(null);
  const [myJoinRequest, setMyJoinRequest] = useState<JoinRequest | null>(null);
  const [myRideRequest, setMyRideRequest] = useState<RideRequest | null>(null);
  const [passengers, setPassengers] = useState<RidePassenger[]>([]);
  const [pendingJoinCount, setPendingJoinCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completedRideId, setCompletedRideId] = useState<string | null>(null);
  const [acceptanceBadge, setAcceptanceBadge] = useState(false);
  const rideTabFocusedRef = useRef(false);
  const healedFor = useRef<string | null>(null);

  // Só marca o badge se o usuário não estiver com a aba Carona aberta (senão ele
  // já está vendo o aceite).
  const flagAcceptance = useCallback(() => {
    if (!rideTabFocusedRef.current) {
      setAcceptanceBadge(true);
    }
  }, []);

  const setRideTabFocused = useCallback((focused: boolean) => {
    rideTabFocusedRef.current = focused;
    if (focused) {
      setAcceptanceBadge(false);
    }
  }, []);
  const completedFor = useRef<string | null>(null);
  const promotingFor = useRef<string | null>(null);
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
      // requester ainda não tem ride (só um rideRequest público). Observar
      // rides/{id} aqui acharia nada e o self-heal limparia o mutex por engano.
      activeRide.role === "requester" ||
      (activeRide.role === "passenger" && myJoinRequest?.status !== "accepted")
    ) {
      setRide(null);
      healedFor.current = null;
      return;
    }

    return observeRide(
      activeRide.rideId,
      (next) => {
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
      },
      // Mutex órfão apontando pra uma ride ilegível (permission-denied):
      // trata como estado terminal e cura o mutex. Se o próprio getDoc do
      // heal também for negado, limpa direto — o mutex está dessincronizado
      // pra este cliente de qualquer forma.
      () => {
        setRide(null);
        if (healedFor.current === activeRide.rideId) {
          return;
        }
        healedFor.current = activeRide.rideId;
        healStaleActiveRide(activeRide).catch(() => {
          if (uid) {
            clearActiveRide(uid).catch(() => {
              healedFor.current = null;
            });
          }
        });
      },
    );
  }, [activeRide, myJoinRequest?.status, uid]);

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

  // Requester: observa o próprio pedido público. Quando um motorista o casa
  // (status 'matched'), promove o mutex de 'requester' para 'passenger'
  // apontando pra ride. Se o pedido some sem match, libera o mutex órfão.
  useEffect(() => {
    if (!activeRide || activeRide.role !== "requester" || !uid) {
      setMyRideRequest(null);
      return;
    }

    return observeMyRideRequest(uid, (request) => {
      setMyRideRequest(request);

      if (
        request?.status === "matched" &&
        request.matchedRideId &&
        promotingFor.current !== request.matchedRideId
      ) {
        promotingFor.current = request.matchedRideId;
        promoteRequesterToPassenger(uid, request.matchedRideId).catch(() => {
          promotingFor.current = null;
        });
        return;
      }

      // Pedido sumiu (expirou/removido) e não estamos promovendo: mutex órfão.
      if (request == null && promotingFor.current == null) {
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

  // Motorista: observa os pedidos da própria carona globalmente (independente da
  // aba) para poder notificar/badge quando alguém pede pra entrar.
  useEffect(() => {
    if (!activeRide || activeRide.role !== "driver") {
      setPendingJoinCount(0);
      return;
    }

    return observeJoinRequests(activeRide.rideId, (requests) => {
      setPendingJoinCount(
        requests.filter((request) => request.status === "pending").length,
      );
    });
  }, [activeRide]);

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
      } else if (role === "requester") {
        // Pedido público aberto, aguardando um motorista aceitar.
        phase = "seeking";
        since = activeRide.createdAt;
      }
    }

    return {
      activeRide,
      ride,
      myJoinRequest,
      myRideRequest,
      passengers,
      phase,
      role,
      since,
      loading,
      completedRideId,
      acknowledgeCompletion: () => setCompletedRideId(null),
      acceptanceBadge,
      flagAcceptance,
      setRideTabFocused,
      pendingJoinCount,
    };
  }, [
    activeRide,
    ride,
    myJoinRequest,
    myRideRequest,
    passengers,
    loading,
    completedRideId,
    acceptanceBadge,
    flagAcceptance,
    setRideTabFocused,
    pendingJoinCount,
  ]);

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
