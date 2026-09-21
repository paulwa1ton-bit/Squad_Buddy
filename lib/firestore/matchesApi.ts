import {
  collection, deleteDoc, doc, onSnapshot, setDoc, Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Match } from "@/types/models";
import { stripUndefined } from "./utils";

const matchesCol = (teamId: string) => collection(db, "teams", teamId, "matches");
const matchDoc = (teamId: string, matchId: string) => doc(db, "teams", teamId, "matches", matchId);

export async function upsertMatch(match: Match): Promise<void> {
  await setDoc(matchDoc(match.teamId, match.id), stripUndefined(match));
}

export async function deleteMatchRemote(teamId: string, matchId: string): Promise<void> {
  await deleteDoc(matchDoc(teamId, matchId));
}

export function subscribeMatches(teamId: string, onChange: (matches: Match[]) => void): Unsubscribe {
  return onSnapshot(
    matchesCol(teamId),
    (snap) => onChange(snap.docs.map((d) => d.data() as Match)),
    (err) => console.warn("subscribeMatches error", err),
  );
}
