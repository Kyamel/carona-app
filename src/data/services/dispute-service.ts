import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "../lib/firebase";

export const RIDE_DISPUTES_COLLECTION = "rideDisputes";

// Relato de "não compareceu" em uma carona concluída. Funciona nos dois sentidos:
// passageiro → motorista (não deu a carona) e motorista → passageiro (aceito mas
// não apareceu). Id composto (rideId_reporter_reported) garante 1 relato por par
// por carona. Alimenta a reputação de quem foi relatado (getReputation).
export async function reportNoShow(
  rideId: string,
  reporterId: string,
  reportedId: string,
): Promise<void> {
  const disputeId = `${rideId}_${reporterId}_${reportedId}`;

  await setDoc(doc(db, RIDE_DISPUTES_COLLECTION, disputeId), {
    rideId,
    reporterId,
    reportedId,
    type: "no-show",
    createdAt: serverTimestamp(),
  });
}
