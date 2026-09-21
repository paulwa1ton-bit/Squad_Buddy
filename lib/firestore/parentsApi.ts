import { doc, getDoc, onSnapshot, setDoc, Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Parent } from "@/types/models";
import { stripUndefined } from "./utils";

const parentDoc = (parentId: string) => doc(db, "parents", parentId);

export async function upsertParent(parent: Parent): Promise<void> {
  await setDoc(parentDoc(parent.id), stripUndefined(parent));
}

export async function fetchParent(parentId: string): Promise<Parent | null> {
  const snap = await getDoc(parentDoc(parentId));
  return snap.exists() ? (snap.data() as Parent) : null;
}

export function subscribeParent(parentId: string, onChange: (parent: Parent | null) => void): Unsubscribe {
  return onSnapshot(
    parentDoc(parentId),
    (snap) => onChange(snap.exists() ? (snap.data() as Parent) : null),
    (err) => console.warn("subscribeParent error", err),
  );
}
