import {
  average,
  collection,
  count,
  getAggregateFromServer,
  query,
  where,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import { RIDE_DISPUTES_COLLECTION } from "./dispute-service";
import { CANCELLATIONS_COLLECTION, RIDES_COLLECTION } from "./ride-service";
import { REVIEWS_COLLECTION } from "./review-service";

export type Reputation = {
  averageRating: number | null;
  reviewCount: number;
  cancellationCount: number;
  // Relatos de "não compareceu" feitos por passageiros contra este usuário.
  noShowCount: number;
  // null quando visto no perfil de outra pessoa (rides concluídas são privadas).
  completedRideCount: number | null;
};

// Reputação calculada na hora por agregações do servidor — nada de contadores
// gravados que possam ser manipulados pelo cliente.
export async function getReputation(uid: string): Promise<Reputation> {
  const [reviews, cancellations, noShows] = await Promise.all([
    getAggregateFromServer(
      query(collection(db, REVIEWS_COLLECTION), where("rateeId", "==", uid)),
      { count: count(), averageRating: average("rating") },
    ),
    getAggregateFromServer(
      query(collection(db, CANCELLATIONS_COLLECTION), where("uid", "==", uid)),
      { count: count() },
    ),
    getAggregateFromServer(
      query(
        collection(db, RIDE_DISPUTES_COLLECTION),
        where("reportedId", "==", uid),
      ),
      { count: count() },
    ),
  ]);

  return {
    averageRating: reviews.data().averageRating,
    reviewCount: reviews.data().count,
    cancellationCount: cancellations.data().count,
    noShowCount: noShows.data().count,
    // As caronas concluídas só são legíveis pelos participantes, então essa
    // contagem só é acessível no próprio perfil. Ver getCompletedRideCount.
    completedRideCount: null,
  };
}

// Só funciona para o próprio usuário: a query filtra rides completed em que ele
// participa, e a read rule das caronas exige que o leitor seja participante.
export async function getCompletedRideCount(uid: string): Promise<number> {
  const completedRides = await getAggregateFromServer(
    query(
      collection(db, RIDES_COLLECTION),
      where("participantIds", "array-contains", uid),
      where("status", "==", "completed"),
    ),
    { count: count() },
  );

  return completedRides.data().count;
}
