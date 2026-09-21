import {
  collection, doc, onSnapshot, query, setDoc, where, Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MatchInvite } from "@/types/models";
import { stripUndefined } from "./utils";

const invitesCol = collection(db, "invites");
const inviteDoc = (inviteId: string) => doc(db, "invites", inviteId);

export async function upsertInvite(invite: MatchInvite): Promise<void> {
  await setDoc(inviteDoc(invite.id), stripUndefined(invite));
}

export function subscribeInvitesForParent(
  parentId: string,
  onChange: (invites: MatchInvite[]) => void,
): Unsubscribe {
  const q = query(invitesCol, where("parentId", "==", parentId));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => d.data() as MatchInvite)),
    (err) => console.warn("subscribeInvitesForParent error", err),
  );
}

export function subscribeInvitesForMatch(
  matchId: string,
  onChange: (invites: MatchInvite[]) => void,
): Unsubscribe {
  const q = query(invitesCol, where("matchId", "==", matchId));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => d.data() as MatchInvite)),
    (err) => console.warn("subscribeInvitesForMatch error", err),
  );
}
