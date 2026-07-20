import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import { coordinatesToGeohash } from "../lib/geo";
import { timestampToDate } from "../lib/firestore-helpers";
import type { NamedLocation } from "../types/location";
import type { Bookmark } from "../types/ride";

export const USERS_COLLECTION = "users";
export const BOOKMARKS_COLLECTION = "bookmarks";

function bookmarksCollection(uid: string) {
  return collection(db, USERS_COLLECTION, uid, BOOKMARKS_COLLECTION);
}

export async function createBookmark(
  uid: string,
  location: NamedLocation,
): Promise<void> {
  const bookmarkRef = doc(bookmarksCollection(uid));

  await setDoc(bookmarkRef, {
    id: bookmarkRef.id,
    label: location.label,
    ...(location.address ? { address: location.address } : null),
    latitude: location.latitude,
    longitude: location.longitude,
    geoHash: coordinatesToGeohash(location),
    createdAt: serverTimestamp(),
  });
}

export async function deleteBookmark(
  uid: string,
  bookmarkId: string,
): Promise<void> {
  await deleteDoc(doc(bookmarksCollection(uid), bookmarkId));
}

export function observeBookmarks(
  uid: string,
  listener: (bookmarks: Bookmark[]) => void,
): () => void {
  const bookmarks = query(bookmarksCollection(uid), orderBy("createdAt", "desc"));

  return onSnapshot(bookmarks, (snapshot) => {
    listener(
      snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          label: data.label,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          geoHash: data.geoHash,
          createdAt: timestampToDate(data.createdAt),
        };
      }),
    );
  });
}

export function bookmarkToNamedLocation(bookmark: Bookmark): NamedLocation {
  return {
    latitude: bookmark.latitude,
    longitude: bookmark.longitude,
    geoHash: bookmark.geoHash,
    label: bookmark.label,
    address: bookmark.address,
  };
}
