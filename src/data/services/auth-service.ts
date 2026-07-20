import { auth, db } from "../lib/firebase";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { ALLOW_NON_UFOP, isUfopEmail, normalizeEmail } from "../utils/email";

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export async function register({
  name,
  email,
  password,
}: RegisterInput): Promise<User> {
  const normalizedEmail = normalizeEmail(email);

  if (!ALLOW_NON_UFOP && !isUfopEmail(normalizedEmail)) {
    throw new Error(
      "Cadastro permitido apenas com e-mail institucional UFOP (*.ufop.edu.br).",
    );
  }

  const { user } = await createUserWithEmailAndPassword(
    auth,
    normalizedEmail,
    password,
  );

  await updateProfile(user, { displayName: name });
  await setDoc(doc(db, "users", user.uid), {
    id: user.uid,
    name,
    email: normalizedEmail,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await sendEmailVerification(user);

  return user;
}

export async function login({ email, password }: LoginInput): Promise<User> {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function sendVerificationEmail(): Promise<void> {
  if (!auth.currentUser) {
    throw new Error("Não há usuário autenticado para verificar.");
  }
  await sendEmailVerification(auth.currentUser);
}

export async function refreshCurrentUser(): Promise<User | null> {
  await auth.currentUser?.reload();
  // Firestore rules read email_verified from the ID token; reload() alone
  // keeps the stale token, so force a refresh to pick the flag up.
  await auth.currentUser?.getIdToken(true);
  return auth.currentUser;
}

export function observeAuthState(
  listener: (user: User | null) => void,
): () => void {
  return onAuthStateChanged(auth, listener);
}
