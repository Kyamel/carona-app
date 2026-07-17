// Lucas Camelo
// Richardy Tanure

import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import * as firebaseAuth from "firebase/auth";

import { app } from "./firebase-app";

// getReactNativePersistence exists only in the react-native build of
// firebase/auth, which Metro selects through the "react-native" export
// condition. The bundled types describe the browser build, so it is invisible
// to TypeScript and has to be reached for by hand.
const { getReactNativePersistence } = firebaseAuth as unknown as {
  getReactNativePersistence: (
    storage: typeof ReactNativeAsyncStorage,
  ) => firebaseAuth.Persistence;
};

// getAuth() would fall back to memory persistence on native, dropping the
// session on every app restart. The web build resolves firebase-auth.web.ts.
export const auth = firebaseAuth.initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
