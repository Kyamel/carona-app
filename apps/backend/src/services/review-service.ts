import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import { timestampToDate } from "../lib/firestore-helpers";
import type { Review } from "../types/ride";

export const REVIEWS_COLLECTION = "reviews";

export type CreateReviewInput = {
  rideId: string;
  raterId: string;
  raterName: string;
  rateeId: string;
  rating: number;
  text?: string;
};

// Id composto garante no máximo 1 review por avaliador/avaliado/carona;
// as rules recompõem o id e validam a participação de ambos na carona.
export async function createReview(input: CreateReviewInput): Promise<void> {
  const reviewId = `${input.rideId}_${input.raterId}_${input.rateeId}`;

  await setDoc(doc(db, REVIEWS_COLLECTION, reviewId), {
    id: reviewId,
    rideId: input.rideId,
    raterId: input.raterId,
    raterName: input.raterName,
    rateeId: input.rateeId,
    rating: input.rating,
    ...(input.text?.trim() ? { text: input.text.trim() } : null),
    createdAt: serverTimestamp(),
  });
}

export async function listReviewsAbout(
  rateeId: string,
  max = 20,
): Promise<Review[]> {
  const reviews = query(
    collection(db, REVIEWS_COLLECTION),
    where("rateeId", "==", rateeId),
    orderBy("createdAt", "desc"),
    limit(max),
  );

  const snapshot = await getDocs(reviews);

  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      rideId: data.rideId,
      raterId: data.raterId,
      raterName: data.raterName,
      rateeId: data.rateeId,
      rating: data.rating,
      text: data.text,
      createdAt: timestampToDate(data.createdAt),
    };
  });
}
