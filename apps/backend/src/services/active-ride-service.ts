import { deleteDoc, doc, getDoc, onSnapshot } from "firebase/firestore";

import { db } from "../lib/firebase";
import { timestampToDate } from "../lib/firestore-helpers";
import type { ActiveRide } from "../types/ride";
import { ACTIVE_RIDES_COLLECTION, RIDES_COLLECTION } from "./ride-service";

export function observeActiveRide(
  uid: string,
  listener: (activeRide: ActiveRide | null) => void,
): () => void {
  return onSnapshot(doc(db, ACTIVE_RIDES_COLLECTION, uid), (snapshot) => {
    if (!snapshot.exists()) {
      listener(null);
      return;
    }

    const data = snapshot.data();
    listener({
      uid: snapshot.id,
      rideId: data.rideId,
      role: data.role,
      createdAt: timestampToDate(data.createdAt),
    });
  });
}

export async function clearActiveRide(uid: string): Promise<void> {
  await deleteDoc(doc(db, ACTIVE_RIDES_COLLECTION, uid));
}

// Mutex órfão (app fechado durante uma transição, carona expirada etc.):
// se a carona apontada não existe ou já terminou, libera o mutex.
export async function healStaleActiveRide(
  activeRide: ActiveRide,
): Promise<boolean> {
  const ride = await getDoc(doc(db, RIDES_COLLECTION, activeRide.rideId));
  const status = ride.exists() ? ride.data().status : null;
  const expiresAt = ride.exists() ? timestampToDate(ride.data().expiresAt) : null;

  const stale =
    !ride.exists() ||
    status === "completed" ||
    status === "canceled" ||
    (status === "open" && expiresAt != null && expiresAt.getTime() < Date.now());

  if (stale) {
    await clearActiveRide(activeRide.uid);
  }

  return stale;
}
