import { subscribeTeam } from "@/lib/firestore/teamsApi";
import { subscribePlayers } from "@/lib/firestore/playersApi";
import { subscribeFormations } from "@/lib/firestore/formationsApi";
import { subscribeMatches } from "@/lib/firestore/matchesApi";
import { subscribeParent } from "@/lib/firestore/parentsApi";
import { useTeamStore } from "@/store/teamStore";
import { useMatchStore } from "@/store/matchStore";
import { useParentStore } from "@/store/parentStore";

let activeTeamId: string | null = null;
let unsubscribers: Array<() => void> = [];
const linkedParentUnsubscribers = new Map<string, () => void>();

/**
 * A manager's device has no listener for the "parents" collection at large
 * (parents register from their own phone) - so the only way a manager sees
 * a parent's name/phone/email in Settings is by following each player's
 * parentId once it's linked. Keeps one live listener per linked parent, and
 * tears one down if that player is ever unlinked.
 */
function syncLinkedParents(players: { parentId?: string }[]): void {
  const currentParentIds = new Set(
    players.map((p) => p.parentId).filter((id): id is string => !!id),
  );

  for (const [parentId, unsub] of linkedParentUnsubscribers) {
    if (!currentParentIds.has(parentId)) {
      unsub();
      linkedParentUnsubscribers.delete(parentId);
    }
  }

  for (const parentId of currentParentIds) {
    if (linkedParentUnsubscribers.has(parentId)) continue;
    const unsub = subscribeParent(parentId, (parent) => {
      if (parent) useParentStore.getState().setRemoteParent(parent);
    });
    linkedParentUnsubscribers.set(parentId, unsub);
  }
}

/**
 * Opens real-time Firestore listeners for a team's doc, players, formations
 * and matches, and pipes every update into the local Zustand stores. This is
 * what makes a manager's squad selection or live match events show up on a
 * parent's phone (and vice versa for RSVP responses) without a manual sync
 * step. Call once a teamId is known (team created, manager logged back in,
 * or a parent joined via team code); call disconnectFromTeam() on sign-out.
 */
export function connectToTeam(teamId: string): void {
  if (activeTeamId === teamId) return;
  disconnectFromTeam();
  activeTeamId = teamId;

  unsubscribers = [
    subscribeTeam(teamId, (team) => {
      if (team) useTeamStore.getState().setRemoteTeam(team);
    }),
    subscribePlayers(teamId, (players) => {
      useTeamStore.getState().setRemotePlayers(players);
      syncLinkedParents(players);
    }),
    subscribeFormations(teamId, (formations) => {
      useTeamStore.getState().setRemoteFormations(formations);
    }),
    subscribeMatches(teamId, (matches) => {
      useMatchStore.getState().setRemoteMatches(teamId, matches);
    }),
  ];
}

export function disconnectFromTeam(): void {
  unsubscribers.forEach((unsub) => unsub());
  unsubscribers = [];
  linkedParentUnsubscribers.forEach((unsub) => unsub());
  linkedParentUnsubscribers.clear();
  activeTeamId = null;
}

export function getConnectedTeamId(): string | null {
  return activeTeamId;
}
