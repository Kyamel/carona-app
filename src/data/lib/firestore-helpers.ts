import { Timestamp } from "firebase/firestore";

export function timestampToDate(value: unknown): Date {
  return value instanceof Timestamp ? value.toDate() : new Date(0);
}

export function nullableTimestampToDate(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}
