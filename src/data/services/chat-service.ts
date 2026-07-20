import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type DocumentData,
  type DocumentSnapshot,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import { timestampToDate } from "../lib/firestore-helpers";
import type { ChatMessage } from "../types/ride";
import { RIDES_COLLECTION } from "./ride-service";

// DM entre o motorista e um passageiro aceito. A thread fica sob a carona e é
// identificada pelo uid do passageiro; ambos (motorista e aquele passageiro)
// leem e escrevem na mesma coleção de mensagens. As rules exigem que o
// passageiro já exista (aceito) para liberar leitura/escrita.
export const THREADS_COLLECTION = "threads";
export const MESSAGES_COLLECTION = "messages";

function messagesRef(rideId: string, threadId: string) {
  return collection(
    doc(db, RIDES_COLLECTION, rideId, THREADS_COLLECTION, threadId),
    MESSAGES_COLLECTION,
  );
}

function chatMessageFromSnapshot(
  snapshot: DocumentSnapshot<DocumentData>,
): ChatMessage {
  const data = snapshot.data() ?? {};

  return {
    id: snapshot.id,
    senderId: data.senderId,
    senderName: data.senderName,
    text: data.text,
    // Mensagem recém-enviada: o serverTimestamp ainda é null localmente até o
    // servidor confirmar. Cai para "agora" para manter a ordenação estável.
    createdAt: data.createdAt ? timestampToDate(data.createdAt) : new Date(),
  };
}

export function observeChatMessages(
  rideId: string,
  threadId: string,
  listener: (messages: ChatMessage[]) => void,
): () => void {
  const messages = query(
    messagesRef(rideId, threadId),
    orderBy("createdAt", "asc"),
  );

  return onSnapshot(
    messages,
    (snapshot) => {
      listener(
        snapshot.docs.map((docSnapshot) =>
          chatMessageFromSnapshot(docSnapshot),
        ),
      );
    },
    (error) => console.warn("[chat-service] observeChatMessages:", error.message),
  );
}

export async function sendChatMessage(
  rideId: string,
  threadId: string,
  senderId: string,
  senderName: string,
  text: string,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) {
    return;
  }

  await addDoc(messagesRef(rideId, threadId), {
    senderId,
    senderName,
    text: trimmed.slice(0, 1000),
    createdAt: serverTimestamp(),
  });
}
