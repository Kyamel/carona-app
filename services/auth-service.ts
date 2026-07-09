import { auth, db } from "@/lib/firebase";
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
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  await updateProfile(user, { displayName: name });
  await setDoc(doc(db, "users", user.uid), {
    id: user.uid,
    name,
    email,
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
  return auth.currentUser;
}

export function observeAuthState(
  listener: (user: User | null) => void,
): () => void {
  return onAuthStateChanged(auth, listener);
}
