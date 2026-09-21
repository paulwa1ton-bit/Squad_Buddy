import { subscribeParent } from "@/lib/firestore/parentsApi";
import { subscribeInvitesForParent, subscribeInvitesForMatch } from "@/lib/firestore/invitesApi";
import { useParentStore } from "@/store/parentStore";

let ownUnsubscribers: Array<() => void> = [];
const matchUnsubscribers = new Map<string, () => void>();

/** Keeps a parent's own profile + their invites live-synced. Call once after a parent signs in. */
export function connectAsParent(parentId: string): void {
  disconnectAsParent();
  ownUnsubscribers = [
    subscribeParent(parentId, (parent) => {
      if (parent) useParentStore.getState().setRemoteParent(parent);
    }),
    subscribeInvitesForParent(parentId, (invites) => {
      useParentStore.getState().setRemoteInvitesForParent(parentId, invites);
    }),
  ];
}

export function disconnectAsParent(): void {
  ownUnsubscribers.forEach((unsub) => unsub());
  ownUnsubscribers = [];
}

/** Lets a manager see RSVP responses for a specific match's invites live. Safe to call repeatedly. */
export function watchInvitesForMatch(matchId: string): () => void {
  matchUnsubscribers.get(matchId)?.();
  const unsub = subscribeInvitesForMatch(matchId, (invites) => {
    useParentStore.getState().setRemoteInvitesForMatch(matchId, invites);
  });
  matchUnsubscribers.set(matchId, unsub);
  return () => {
    unsub();
    matchUnsubscribers.delete(matchId);
  };
}
