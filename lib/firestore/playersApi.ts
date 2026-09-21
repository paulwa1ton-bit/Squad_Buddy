import { collection, doc, onSnapshot, setDoc, Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Player } from "@/types/models";
import { stripUndefined } from "./utils";

const playersCol = (teamId: string) => collection(db, "teams", teamId, "players");
const playerDoc = (teamId: string, playerId: string) => doc(db, "teams", teamId, "players", playerId);

export async function upsertPlayer(teamId: string, player: Player): Promise<void> {
  await setDoc(playerDoc(teamId, player.id), stripUndefined(player));
}

export function subscribePlayers(teamId: string, onChange: (players: Player[]) => void): Unsubscribe {
  return onSnapshot(
    playersCol(teamId),
    (snap) => onChange(snap.docs.map((d) => d.data() as Player)),
    (err) => console.warn("subscribePlayers error", err),
  );
}
