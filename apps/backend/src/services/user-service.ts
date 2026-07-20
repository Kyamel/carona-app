import { doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";

import { db } from "../lib/firebase";
import { timestampToDate } from "../lib/firestore-helpers";
import type { UserProfile } from "../types/user";
import { USERS_COLLECTION } from "./bookmark-service";

// O doc users/{uid} é privado (só o dono lê — contém e-mail e chave PIX).
export function observeMyProfile(
  uid: string,
  listener: (profile: UserProfile | null) => void,
): () => void {
  return onSnapshot(doc(db, USERS_COLLECTION, uid), (snapshot) => {
    if (!snapshot.exists()) {
      listener(null);
      return;
    }

    const data = snapshot.data();
    listener({
      id: snapshot.id,
      name: data.name,
      email: data.email,
      pixKey: data.pixKey ?? null,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
      photo: data.photo,
      bio: data.bio,
    });
  });
}

// Chave PIX para gorjeta (opcional). Ela só é compartilhada com os passageiros
// da carona no momento da conclusão (campo driverPixKey no doc da ride).
export async function updatePixKey(
  uid: string,
  pixKey: string | null,
): Promise<void> {
  const trimmed = pixKey?.trim() || null;

  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    ...(trimmed ? { pixKey: trimmed } : { pixKey: null }),
    updatedAt: serverTimestamp(),
  });
}
