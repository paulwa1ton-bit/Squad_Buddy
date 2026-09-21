import {
  collection, doc, getDoc, getDocs, limit, onSnapshot, query, setDoc, where, Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Team } from "@/types/models";
import { stripUndefined } from "./utils";

const teamDoc = (teamId: string) => doc(db, "teams", teamId);

export async function upsertTeam(team: Team): Promise<void> {
  await setDoc(teamDoc(team.id), stripUndefined(team));
}

export async function fetchTeam(teamId: string): Promise<Team | null> {
  const snap = await getDoc(teamDoc(teamId));
  return snap.exists() ? (snap.data() as Team) : null;
}

/** Used on manager sign-in to find a team they already own (e.g. a reinstall or second device). */
export async function findTeamByManager(managerUserId: string): Promise<Team | null> {
  const q = query(collection(db, "teams"), where("managerUserId", "==", managerUserId), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as Team);
}

/** A manager can run up to MAX_TEAMS_PER_MANAGER teams (e.g. an U9s and an U14s side) from one login. */
export const MAX_TEAMS_PER_MANAGER = 2;

export async function findTeamsByManager(managerUserId: string): Promise<Team[]> {
  const q = query(collection(db, "teams"), where("managerUserId", "==", managerUserId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Team);
}

export function subscribeTeam(teamId: string, onChange: (team: Team | null) => void): Unsubscribe {
  return onSnapshot(
    teamDoc(teamId),
    (snap) => onChange(snap.exists() ? (snap.data() as Team) : null),
    (err) => console.warn("subscribeTeam error", err),
  );
}
