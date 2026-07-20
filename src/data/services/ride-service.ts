import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import { distanceBetweenKm, fuzzLocation } from "../lib/geo";
import {
  nullableTimestampToDate,
  timestampToDate,
} from "../lib/firestore-helpers";
import type {
  Coordinates,
  GeoLocation,
  NamedLocation,
} from "../types/location";
import type {
  JoinRequest,
  Ride,
  RideDirection,
  RideOffer,
  RidePassenger,
  RideRequest,
} from "../types/ride";

// Evita "Uncaught Error in snapshot listener" no console quando um listener é
// negado pelas rules (ex.: query pública sem verificação, doc órfão). Listeners
// que precisam reagir ao erro (ex.: self-heal do mutex) recebem callback próprio.
function logSnapshotError(scope: string) {
  return (error: Error) => console.warn(`[ride-service] ${scope}:`, error.message);
}

export const RIDES_COLLECTION = "rides";
export const RIDE_OFFERS_COLLECTION = "rideOffers";
export const RIDE_REQUESTS_COLLECTION = "rideRequests";
export const JOIN_REQUESTS_COLLECTION = "joinRequests";
export const PASSENGERS_COLLECTION = "passengers";
export const ACTIVE_RIDES_COLLECTION = "activeRides";
export const CANCELLATIONS_COLLECTION = "cancellations";

export type CreateRideInput = {
  driverId: string;
  driverName: string;
  direction: RideDirection;
  origin: NamedLocation;
  destination: NamedLocation;
  availableSeats: number;
  durationMinutes: number;
};

function rideFromSnapshot(snapshot: DocumentSnapshot<DocumentData>): Ride {
  const data = snapshot.data() ?? {};

  return {
    id: snapshot.id,
    driverId: data.driverId,
    driverName: data.driverName,
    direction: data.direction,
    origin: data.origin,
    destination: data.destination,
    availableSeats: data.availableSeats,
    seatsAvailable: data.seatsAvailable,
    status: data.status,
    participantIds: data.participantIds ?? [],
    driverPixKey: data.driverPixKey ?? null,
    createdAt: timestampToDate(data.createdAt),
    expiresAt: timestampToDate(data.expiresAt),
    startedAt: nullableTimestampToDate(data.startedAt),
    endedAt: nullableTimestampToDate(data.endedAt),
    canceledBy: data.canceledBy ?? null,
  };
}

function rideOfferFromSnapshot(
  snapshot: DocumentSnapshot<DocumentData>,
): RideOffer {
  const data = snapshot.data() ?? {};

  return {
    id: snapshot.id,
    rideId: data.rideId,
    driverName: data.driverName,
    direction: data.direction,
    endpointPin: data.endpointPin,
    availableSeats: data.availableSeats,
    seatsAvailable: data.seatsAvailable,
    status: data.status,
    createdAt: timestampToDate(data.createdAt),
    expiresAt: timestampToDate(data.expiresAt),
  };
}

function joinRequestFromSnapshot(
  rideId: string,
  snapshot: DocumentSnapshot<DocumentData>,
): JoinRequest {
  const data = snapshot.data() ?? {};

  return {
    id: snapshot.id,
    rideId,
    passengerId: data.passengerId,
    passengerName: data.passengerName,
    pickup: data.pickup,
    dropoff: data.dropoff,
    status: data.status,
    createdAt: timestampToDate(data.createdAt),
    respondedAt: nullableTimestampToDate(data.respondedAt),
  };
}

function passengerFromSnapshot(
  snapshot: DocumentSnapshot<DocumentData>,
): RidePassenger {
  const data = snapshot.data() ?? {};

  return {
    uid: snapshot.id,
    name: data.name,
    pickup: data.pickup,
    dropoff: data.dropoff,
    status: data.status,
    // Docs antigos (antes do fluxo de confirmação) não têm o campo: contam como
    // já confirmados.
    confirmed: data.confirmed ?? true,
    joinedAt: timestampToDate(data.joinedAt),
    canceledAt: nullableTimestampToDate(data.canceledAt),
  };
}

function activeRideRef(uid: string) {
  return doc(db, ACTIVE_RIDES_COLLECTION, uid);
}

function rideRef(rideId: string) {
  return doc(db, RIDES_COLLECTION, rideId);
}

function rideOfferRef(rideId: string) {
  return doc(db, RIDE_OFFERS_COLLECTION, rideId);
}

function joinRequestRef(rideId: string, passengerId: string) {
  return doc(rideRef(rideId), JOIN_REQUESTS_COLLECTION, passengerId);
}

function passengerRef(rideId: string, passengerId: string) {
  return doc(rideRef(rideId), PASSENGERS_COLLECTION, passengerId);
}

// Cria a oferta de carona e o mutex de carona ativa na mesma transação; as
// rules exigem existsAfter(activeRides/uid) na criação da ride, então uma
// oferta nunca nasce sem o mutex.
export async function createRide(input: CreateRideInput): Promise<string> {
  const newRideRef = doc(collection(db, RIDES_COLLECTION));
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + input.durationMinutes * 60_000),
  );

  // Pino público borrado do lado não-ICEA (de onde sai / para onde vai). O
  // ponto exato (origin/destination) fica só na ride privada.
  const endpointPin = fuzzLocation(
    input.direction === "toCampus" ? input.origin : input.destination,
  );

  await runTransaction(db, async (transaction) => {
    const mutex = await transaction.get(activeRideRef(input.driverId));

    if (mutex.exists()) {
      throw new Error("Você já tem uma carona ativa.");
    }

    transaction.set(activeRideRef(input.driverId), {
      uid: input.driverId,
      rideId: newRideRef.id,
      role: "driver",
      createdAt: serverTimestamp(),
    });

    transaction.set(newRideRef, {
      id: newRideRef.id,
      driverId: input.driverId,
      driverName: input.driverName,
      direction: input.direction,
      origin: input.origin,
      destination: input.destination,
      availableSeats: input.availableSeats,
      seatsAvailable: input.availableSeats,
      status: "open",
      participantIds: [input.driverId],
      driverPixKey: null,
      createdAt: serverTimestamp(),
      expiresAt,
      startedAt: null,
      endedAt: null,
      canceledBy: null,
    });

    transaction.set(rideOfferRef(newRideRef.id), {
      id: newRideRef.id,
      rideId: newRideRef.id,
      driverName: input.driverName,
      direction: input.direction,
      endpointPin,
      availableSeats: input.availableSeats,
      seatsAvailable: input.availableSeats,
      status: "open",
      createdAt: serverTimestamp(),
      expiresAt,
    });
  });

  return newRideRef.id;
}

export function observeRide(
  rideId: string,
  listener: (ride: Ride | null) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    rideRef(rideId),
    (snapshot) => {
      listener(snapshot.exists() ? rideFromSnapshot(snapshot) : null);
    },
    // Ex.: mutex órfão apontando pra uma ride que este usuário não pode ler
    // (permission-denied). Sem este callback o erro fica "uncaught" no console.
    (error) => onError?.(error),
  );
}

// Ofertas abertas na direção desejada. Este documento público não contém
// origem/destino do motorista; a localização só aparece no doc privado da ride
// depois que o passageiro é aceito.
export function observeOpenRideOffers(
  direction: RideDirection,
  listener: (offers: RideOffer[]) => void,
): () => void {
  const openOffers = query(
    collection(db, RIDE_OFFERS_COLLECTION),
    where("status", "==", "open"),
    where("direction", "==", direction),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    openOffers,
    (snapshot) => {
      const now = Date.now();
      listener(
        snapshot.docs
          .map((docSnapshot) => rideOfferFromSnapshot(docSnapshot))
          .filter((offer) => offer.expiresAt.getTime() > now),
      );
    },
    logSnapshotError("observeOpenRideOffers"),
  );
}

// Todas as ofertas abertas (qualquer direção), para os pinos do mapa. O
// contador/matching por direção é feito no cliente.
export function observeAllOpenRideOffers(
  listener: (offers: RideOffer[]) => void,
): () => void {
  const openOffers = query(
    collection(db, RIDE_OFFERS_COLLECTION),
    where("status", "==", "open"),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    openOffers,
    (snapshot) => {
      const now = Date.now();
      listener(
        snapshot.docs
          .map((docSnapshot) => rideOfferFromSnapshot(docSnapshot))
          .filter((offer) => offer.expiresAt.getTime() > now),
      );
    },
    logSnapshotError("observeAllOpenRideOffers"),
  );
}

export type JoinRideInput = {
  rideId: string;
  passengerId: string;
  passengerName: string;
  pickup: NamedLocation;
  dropoff: NamedLocation;
};

export async function requestToJoinRide(input: JoinRideInput): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const mutex = await transaction.get(activeRideRef(input.passengerId));

    if (mutex.exists()) {
      throw new Error("Você já tem uma carona ativa.");
    }

    const existingRequest = await transaction.get(
      joinRequestRef(input.rideId, input.passengerId),
    );

    transaction.set(activeRideRef(input.passengerId), {
      uid: input.passengerId,
      rideId: input.rideId,
      role: "passenger",
      createdAt: serverTimestamp(),
    });

    if (existingRequest.exists()) {
      // Pedido cancelado/recusado anteriormente nesta mesma carona: reabre.
      transaction.update(joinRequestRef(input.rideId, input.passengerId), {
        status: "pending",
      });
      return;
    }

    transaction.set(joinRequestRef(input.rideId, input.passengerId), {
      id: input.passengerId,
      rideId: input.rideId,
      passengerId: input.passengerId,
      passengerName: input.passengerName,
      pickup: input.pickup,
      dropoff: input.dropoff,
      status: "pending",
      createdAt: serverTimestamp(),
      respondedAt: null,
    });
  });
}

// Cancelamento de pedido ainda pendente: sem registro de reputação.
export async function cancelPendingJoinRequest(
  rideId: string,
  passengerId: string,
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(joinRequestRef(rideId, passengerId), { status: "canceled" });
  batch.delete(activeRideRef(passengerId));
  await batch.commit();
}

// Recusa não segura o mutex do passageiro preso: o cliente dele observa o
// próprio pedido e libera o mutex ao ver "declined" (ride-session provider).
export async function declineJoinRequest(
  rideId: string,
  passengerId: string,
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(joinRequestRef(rideId, passengerId), {
    status: "declined",
    respondedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function acceptJoinRequest(
  rideId: string,
  passengerId: string,
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const ride = await transaction.get(rideRef(rideId));

    if (!ride.exists() || ride.data().status !== "open") {
      throw new Error("A carona não está mais aberta.");
    }

    if (ride.data().seatsAvailable <= 0) {
      throw new Error("Não há mais assentos disponíveis.");
    }

    const request = await transaction.get(joinRequestRef(rideId, passengerId));

    if (!request.exists() || request.data().status !== "pending") {
      throw new Error("Este pedido não está mais pendente.");
    }

    const requestData = request.data();
    const seatsLeft = ride.data().seatsAvailable - 1;

    transaction.update(joinRequestRef(rideId, passengerId), {
      status: "accepted",
      respondedAt: serverTimestamp(),
    });

    transaction.set(passengerRef(rideId, passengerId), {
      uid: passengerId,
      name: requestData.passengerName,
      pickup: requestData.pickup,
      dropoff: requestData.dropoff,
      status: "accepted",
      // Fluxo de oferta: o passageiro já escolheu esta carona ao pedir, então
      // entra confirmado.
      confirmed: true,
      joinedAt: serverTimestamp(),
      canceledAt: null,
    });

    transaction.update(rideRef(rideId), {
      participantIds: arrayUnion(passengerId),
      seatsAvailable: increment(-1),
      ...(seatsLeft <= 0 ? { status: "full" } : null),
    });

    transaction.update(rideOfferRef(rideId), {
      seatsAvailable: increment(-1),
      ...(seatsLeft <= 0 ? { status: "full" } : null),
    });
  });
}

// "Marcar carro como cheio": para de receber pedidos mesmo com assentos vagos.
export async function markRideFull(rideId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(rideRef(rideId), { status: "full" });
  batch.update(rideOfferRef(rideId), { status: "full" });
  await batch.commit();
}

export async function reopenRide(rideId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(rideRef(rideId), { status: "open" });
  batch.update(rideOfferRef(rideId), { status: "open" });
  await batch.commit();
}

// Inicia a corrida e recusa em lote os pedidos ainda pendentes.
export async function startRide(
  rideId: string,
  pendingPassengerIds: string[],
): Promise<void> {
  const batch = writeBatch(db);

  batch.update(rideRef(rideId), {
    status: "inProgress",
    startedAt: serverTimestamp(),
  });
  batch.update(rideOfferRef(rideId), { status: "inProgress" });

  for (const passengerId of pendingPassengerIds) {
    batch.update(joinRequestRef(rideId, passengerId), {
      status: "declined",
      respondedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

// Conclui a carona. Não apaga o mutex do motorista aqui de propósito: quem
// limpa é o self-heal (healStaleActiveRide) no cliente, do mesmo jeito que para
// os passageiros. Assim a conclusão é observada simetricamente por todos os
// participantes (dispara o prompt de avaliação de forma confiável).
export async function completeRide(
  rideId: string,
  driverPixKey: string | null,
): Promise<void> {
  const batch = writeBatch(db);

  batch.update(rideRef(rideId), {
    status: "completed",
    endedAt: serverTimestamp(),
    driverPixKey,
  });
  batch.update(rideOfferRef(rideId), { status: "completed" });

  await batch.commit();
}

// Cancelamento pelo motorista. Só registra na reputação (coleção cancellations)
// quando havia passageiros a bordo — cancelar uma carona ainda vazia não conta.
export async function cancelRideAsDriver(
  rideId: string,
  driverId: string,
  stage: "open" | "full" | "inProgress",
  recordReputation: boolean,
): Promise<void> {
  const batch = writeBatch(db);

  batch.update(rideRef(rideId), {
    status: "canceled",
    canceledBy: driverId,
    endedAt: serverTimestamp(),
  });
  batch.update(rideOfferRef(rideId), { status: "canceled" });
  if (recordReputation) {
    batch.set(doc(collection(db, CANCELLATIONS_COLLECTION)), {
      uid: driverId,
      rideId,
      role: "driver",
      stage,
      createdAt: serverTimestamp(),
    });
  }
  batch.delete(activeRideRef(driverId));

  await batch.commit();
}

// Desistência de passageiro já aceito: registra na reputação.
export async function cancelRideAsPassenger(
  rideId: string,
  passengerId: string,
  stage: "open" | "full" | "inProgress",
): Promise<void> {
  const batch = writeBatch(db);

  batch.update(passengerRef(rideId, passengerId), {
    status: "canceled",
    canceledAt: serverTimestamp(),
  });
  batch.set(doc(collection(db, CANCELLATIONS_COLLECTION)), {
    uid: passengerId,
    rideId,
    role: "passenger",
    stage,
    createdAt: serverTimestamp(),
  });
  batch.delete(activeRideRef(passengerId));

  await batch.commit();
}

// Pedinte confirma que quer ir com este motorista (fluxo mão dupla). Só depois
// disso o motorista consegue iniciar a corrida.
export async function confirmRidePassenger(
  rideId: string,
  passengerId: string,
): Promise<void> {
  await setDoc(
    passengerRef(rideId, passengerId),
    { confirmed: true },
    { merge: true },
  );
}

// Pedinte recusa a proposta do motorista (antes de confirmar). Diferente de
// desistir de uma carona já confirmada, recusar uma proposta NÃO registra na
// reputação. Libera o assento (via releasePassengerSeat do motorista, que
// observa o passenger 'canceled') e o mutex do pedinte.
export async function declineRideProposal(
  rideId: string,
  passengerId: string,
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(passengerRef(rideId, passengerId), {
    status: "canceled",
    canceledAt: serverTimestamp(),
  });
  batch.delete(activeRideRef(passengerId));
  await batch.commit();
}

// O motorista devolve o assento quando observa a desistência de um passageiro.
export async function releasePassengerSeat(
  rideId: string,
  reopen: boolean,
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(rideRef(rideId), {
    seatsAvailable: increment(1),
    ...(reopen ? { status: "open" } : null),
  });
  batch.update(rideOfferRef(rideId), {
    seatsAvailable: increment(1),
    ...(reopen ? { status: "open" } : null),
  });
  await batch.commit();
}

export async function getRide(rideId: string): Promise<Ride | null> {
  const snapshot = await getDoc(rideRef(rideId));
  return snapshot.exists() ? rideFromSnapshot(snapshot) : null;
}

export async function getRidePassengers(
  rideId: string,
): Promise<RidePassenger[]> {
  const snapshot = await getDocs(
    collection(rideRef(rideId), PASSENGERS_COLLECTION),
  );
  return snapshot.docs.map((docSnapshot) => passengerFromSnapshot(docSnapshot));
}

// Caronas em que o usuário participou, mais recentes primeiro (histórico).
export function observeMyRideHistory(
  uid: string,
  listener: (rides: Ride[]) => void,
): () => void {
  const history = query(
    collection(db, RIDES_COLLECTION),
    where("participantIds", "array-contains", uid),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    history,
    (snapshot) => {
      listener(
        snapshot.docs.map((docSnapshot) => rideFromSnapshot(docSnapshot)),
      );
    },
    logSnapshotError("observeMyRideHistory"),
  );
}

export function observeJoinRequests(
  rideId: string,
  listener: (requests: JoinRequest[]) => void,
): () => void {
  const requests = query(
    collection(rideRef(rideId), JOIN_REQUESTS_COLLECTION),
    orderBy("createdAt", "asc"),
  );

  return onSnapshot(
    requests,
    (snapshot) => {
      listener(
        snapshot.docs.map((docSnapshot) =>
          joinRequestFromSnapshot(rideId, docSnapshot),
        ),
      );
    },
    logSnapshotError("observeJoinRequests"),
  );
}

export function observeMyJoinRequest(
  rideId: string,
  passengerId: string,
  listener: (request: JoinRequest | null) => void,
): () => void {
  return onSnapshot(
    joinRequestRef(rideId, passengerId),
    (snapshot) => {
      listener(
        snapshot.exists() ? joinRequestFromSnapshot(rideId, snapshot) : null,
      );
    },
    logSnapshotError("observeMyJoinRequest"),
  );
}

export function observePassengers(
  rideId: string,
  listener: (passengers: RidePassenger[]) => void,
): () => void {
  const passengers = query(
    collection(rideRef(rideId), PASSENGERS_COLLECTION),
    orderBy("joinedAt", "asc"),
  );

  return onSnapshot(
    passengers,
    (snapshot) => {
      listener(
        snapshot.docs.map((docSnapshot) => passengerFromSnapshot(docSnapshot)),
      );
    },
    logSnapshotError("observePassengers"),
  );
}

// ===========================================================================
// Pedidos de carona públicos (rideRequests) + reserva mão dupla
// ===========================================================================

function rideRequestRef(uid: string) {
  return doc(db, RIDE_REQUESTS_COLLECTION, uid);
}

function rideRequestFromSnapshot(
  snapshot: DocumentSnapshot<DocumentData>,
): RideRequest {
  const data = snapshot.data() ?? {};

  return {
    id: snapshot.id,
    passengerId: data.passengerId,
    passengerName: data.passengerName,
    originPin: data.originPin,
    destinationPin: data.destinationPin,
    status: data.status,
    matchedRideId: data.matchedRideId ?? null,
    createdAt: timestampToDate(data.createdAt),
    expiresAt: timestampToDate(data.expiresAt),
  };
}

function pinToNamedLocation(pin: GeoLocation, label: string): NamedLocation {
  return {
    latitude: pin.latitude,
    longitude: pin.longitude,
    geoHash: pin.geoHash,
    label,
  };
}

export type CreateRideRequestInput = {
  passengerId: string;
  passengerName: string;
  // Pontos EXATOS escolhidos pelo usuário; são borrados aqui e só a versão
  // fuzzy vai pro doc público.
  origin: Coordinates;
  destination: Coordinates;
  durationMinutes: number;
};

// Publica um pedido de carona (pino público) e segura o mutex como 'requester'
// na mesma transação. O pino é FUZZY; o ponto exato não é persistido.
export async function createRideRequest(
  input: CreateRideRequestInput,
): Promise<void> {
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + input.durationMinutes * 60_000),
  );

  await runTransaction(db, async (transaction) => {
    const mutex = await transaction.get(activeRideRef(input.passengerId));

    if (mutex.exists()) {
      throw new Error("Você já tem uma carona ativa.");
    }

    // O mutex do requester aponta pra si mesmo (não há ride ainda).
    transaction.set(activeRideRef(input.passengerId), {
      uid: input.passengerId,
      rideId: input.passengerId,
      role: "requester",
      createdAt: serverTimestamp(),
    });

    transaction.set(rideRequestRef(input.passengerId), {
      id: input.passengerId,
      passengerId: input.passengerId,
      passengerName: input.passengerName,
      originPin: fuzzLocation(input.origin),
      destinationPin: fuzzLocation(input.destination),
      status: "open",
      matchedRideId: null,
      createdAt: serverTimestamp(),
      expiresAt,
    });
  });
}

export function observeMyRideRequest(
  uid: string,
  listener: (request: RideRequest | null) => void,
): () => void {
  return onSnapshot(
    rideRequestRef(uid),
    (snapshot) => {
      listener(snapshot.exists() ? rideRequestFromSnapshot(snapshot) : null);
    },
    logSnapshotError("observeMyRideRequest"),
  );
}

// Pedidos abertos (pinos públicos). Coleção pequena: busca todos os abertos e o
// cliente filtra por corredor (matchesCorridor). Evita índices geohash.
export function observeOpenRideRequests(
  listener: (requests: RideRequest[]) => void,
): () => void {
  const openRequests = query(
    collection(db, RIDE_REQUESTS_COLLECTION),
    where("status", "==", "open"),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    openRequests,
    (snapshot) => {
      const now = Date.now();
      listener(
        snapshot.docs
          .map((docSnapshot) => rideRequestFromSnapshot(docSnapshot))
          .filter((request) => request.expiresAt.getTime() > now),
      );
    },
    logSnapshotError("observeOpenRideRequests"),
  );
}

// Cancela o pedido antes de qualquer match: apaga o pino e libera o mutex.
export async function cancelRideRequest(uid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(rideRequestRef(uid));
  batch.delete(activeRideRef(uid));
  await batch.commit();
}

// Reconciliação feita pelo cliente do requester ao ver o pedido virar 'matched':
// troca o mutex 'requester' por 'passenger' apontando pra ride. Feito em duas
// etapas porque activeRides não permite update (só create/delete).
export async function promoteRequesterToPassenger(
  uid: string,
  rideId: string,
): Promise<void> {
  const cleanup = writeBatch(db);
  cleanup.delete(rideRequestRef(uid));
  cleanup.delete(activeRideRef(uid));
  await cleanup.commit();

  await setDoc(activeRideRef(uid), {
    uid,
    rideId,
    role: "passenger",
    createdAt: serverTimestamp(),
  });
}

// Motorista aceita um pedido público direto do pino (mão dupla). Cria o
// joinRequest JÁ aceito + o passenger no mesmo batch, consome 1 assento e marca
// o pedido como 'matched' (o requester promove o próprio mutex ao observar isso).
export async function acceptRideRequest(
  rideId: string,
  request: RideRequest,
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const ride = await transaction.get(rideRef(rideId));

    if (!ride.exists() || ride.data().status !== "open") {
      throw new Error("Sua carona não está mais aberta.");
    }

    if (ride.data().seatsAvailable <= 0) {
      throw new Error("Não há mais assentos disponíveis.");
    }

    const requestSnap = await transaction.get(rideRequestRef(request.id));

    if (!requestSnap.exists() || requestSnap.data().status !== "open") {
      throw new Error("Este pedido não está mais disponível.");
    }

    const pickup = pinToNamedLocation(request.originPin, "Embarque aprox.");
    const dropoff = pinToNamedLocation(
      request.destinationPin,
      "Desembarque aprox.",
    );
    const seatsLeft = ride.data().seatsAvailable - 1;

    transaction.set(joinRequestRef(rideId, request.id), {
      id: request.id,
      rideId,
      passengerId: request.id,
      passengerName: request.passengerName,
      pickup,
      dropoff,
      status: "accepted",
      createdAt: serverTimestamp(),
      respondedAt: serverTimestamp(),
    });

    transaction.set(passengerRef(rideId, request.id), {
      uid: request.id,
      name: request.passengerName,
      pickup,
      dropoff,
      status: "accepted",
      // Mão dupla: o motorista escolheu o pedinte, mas o pedinte ainda não
      // escolheu o motorista. Nasce não confirmado; só depois de o pedinte
      // confirmar (confirmRidePassenger) o motorista pode iniciar a corrida.
      confirmed: false,
      joinedAt: serverTimestamp(),
      canceledAt: null,
    });

    transaction.update(rideRef(rideId), {
      participantIds: arrayUnion(request.id),
      seatsAvailable: increment(-1),
      ...(seatsLeft <= 0 ? { status: "full" } : null),
    });

    transaction.update(rideOfferRef(rideId), {
      seatsAvailable: increment(-1),
      ...(seatsLeft <= 0 ? { status: "full" } : null),
    });

    transaction.update(rideRequestRef(request.id), {
      status: "matched",
      matchedRideId: rideId,
    });
  });
}

// Núcleo do matching (a nível de coordenada): um pedido "casa" com uma oferta
// se um dos extremos do pedido cai perto do lado não-ICEA da oferta (~mesmo
// bairro). Aproximação sem rotas, suficiente para o contador. Usado também com
// rascunhos (antes de criar) para o contador ao vivo no modal.
export function corridorMatch(
  requestOrigin: Coordinates,
  requestDestination: Coordinates,
  offerEndpoint: Coordinates,
  radiusKm = 3,
): boolean {
  const near = (a: Coordinates, b: Coordinates) =>
    distanceBetweenKm(a, b) <= radiusKm;

  return (
    near(requestOrigin, offerEndpoint) ||
    near(requestDestination, offerEndpoint)
  );
}

// Contador simétrico entre um pedido e uma oferta já existentes.
export function matchesCorridor(
  request: RideRequest,
  offer: RideOffer,
  radiusKm = 3,
): boolean {
  return corridorMatch(
    request.originPin,
    request.destinationPin,
    offer.endpointPin,
    radiusKm,
  );
}
