// Lucas Camelo
// Richardy Tanure

import { getFirestore } from "firebase/firestore";
import { app } from "./firebase-app";

export { app };
// Resolved per platform: firebase-auth.web.ts on web, firebase-auth.ts elsewhere.
    export { auth } from "./firebase-auth";
export const db = getFirestore(app);
