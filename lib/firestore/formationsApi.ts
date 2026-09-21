import {
  collection, deleteDoc, doc, onSnapshot, setDoc, Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Formation } from "@/types/models";
import { stripUndefined } from "./utils";

const formationsCol = (teamId: string) => collection(db, "teams", teamId, "formations");
const formationDoc = (teamId: string, formationId: string) =>
  doc(db, "teams", teamId, "formations", formationId);

export async function upsertFormation(teamId: string, formation: Formation): Promise<void> {
  await setDoc(formationDoc(teamId, formation.id), stripUndefined(formation));
}

export async function deleteFormationRemote(teamId: string, formationId: string): Promise<void> {
  await deleteDoc(formationDoc(teamId, formationId));
}

export function subscribeFormations(teamId: string, onChange: (formations: Formation[]) => void): Unsubscribe {
  return onSnapshot(
    formationsCol(teamId),
    (snap) => onChange(snap.docs.map((d) => d.data() as Formation)),
    (err) => console.warn("subscribeFormations error", err),
  );
}
