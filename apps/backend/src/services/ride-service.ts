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
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import {
  nullableTimestampToDate,
  timestampToDate,
} from "../lib/firestore-helpers";
import type { NamedLocation } from "../types/location";
import type {
  JoinRequest,
  Ride,
  RideDirection,
  RideOffer,
  RidePassenger,
} from "../types/ride";

export const RIDES_COLLECTION = "rides";
export const RIDE_OFFERS_COLLECTION = "rideOffers";
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
): () => void {
  return onSnapshot(rideRef(rideId), (snapshot) => {
    listener(snapshot.exists() ? rideFromSnapshot(snapshot) : null);
  });
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

  return onSnapshot(openOffers, (snapshot) => {
    const now = Date.now();
    listener(
      snapshot.docs
        .map((docSnapshot) => rideOfferFromSnapshot(docSnapshot))
        .filter((offer) => offer.expiresAt.getTime() > now),
    );
  });
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

  return onSnapshot(history, (snapshot) => {
    listener(snapshot.docs.map((docSnapshot) => rideFromSnapshot(docSnapshot)));
  });
}

export function observeJoinRequests(
  rideId: string,
  listener: (requests: JoinRequest[]) => void,
): () => void {
  const requests = query(
    collection(rideRef(rideId), JOIN_REQUESTS_COLLECTION),
    orderBy("createdAt", "asc"),
  );

  return onSnapshot(requests, (snapshot) => {
    listener(
      snapshot.docs.map((docSnapshot) =>
        joinRequestFromSnapshot(rideId, docSnapshot),
      ),
    );
  });
}

export function observeMyJoinRequest(
  rideId: string,
  passengerId: string,
  listener: (request: JoinRequest | null) => void,
): () => void {
  return onSnapshot(joinRequestRef(rideId, passengerId), (snapshot) => {
    listener(
      snapshot.exists() ? joinRequestFromSnapshot(rideId, snapshot) : null,
    );
  });
}

export function observePassengers(
  rideId: string,
  listener: (passengers: RidePassenger[]) => void,
): () => void {
  const passengers = query(
    collection(rideRef(rideId), PASSENGERS_COLLECTION),
    orderBy("joinedAt", "asc"),
  );

  return onSnapshot(passengers, (snapshot) => {
    listener(
      snapshot.docs.map((docSnapshot) => passengerFromSnapshot(docSnapshot)),
    );
  });
}
