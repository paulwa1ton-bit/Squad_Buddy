import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import { MatchInvite, Parent, RsvpStatus } from "@/types/models";
import { sendPushNotification } from "@/lib/notifications";
import { upsertParent } from "@/lib/firestore/parentsApi";
import { upsertInvite } from "@/lib/firestore/invitesApi";

function logSyncError(action: string) {
  return (err: unknown) => console.warn(`[parentStore] Firestore sync failed (${action}):`, err);
}

interface ParentState {
  parents: Parent[];
  invites: MatchInvite[];

  /** id should be the Firebase Auth uid so Firestore security rules can match request.auth.uid. */
  registerParent: (input: {
    id: string;
    name: string;
    phone: string;
    email: string;
  }) => Parent;
  updateParent: (parentId: string, patch: Partial<Parent>) => void;
  linkChildToParent: (parentId: string, playerId: string) => void;
  setPushToken: (parentId: string, token: string) => void;

  /** Manager selects a squad for a match; each selected player's parent gets an invite + push notification. */
  sendMatchInvites: (input: {
    matchId: string;
    playerIds: string[];
    parentsByPlayerId: Record<string, string>; // playerId -> parentId
    opposition: string;
    kickOff: string;
    location?: string;
    minutesPerPeriod: number;
  }) => MatchInvite[];

  respondToInvite: (inviteId: string, status: RsvpStatus) => void;
  invitesForParent: (parentId: string) => MatchInvite[];
  invitesForMatch: (matchId: string) => MatchInvite[];

  /** Applied from Firestore onSnapshot listeners - see lib/parentSync.ts. Not for direct UI use. */
  setRemoteParent: (parent: Parent) => void;
  setRemoteInvitesForParent: (parentId: string, invites: MatchInvite[]) => void;
  setRemoteInvitesForMatch: (matchId: string, invites: MatchInvite[]) => void;
  /** Clears all local state, e.g. on sign-out. */
  reset: () => void;
}

export const useParentStore = create<ParentState>()(
  persist(
    (set, get) => ({
      parents: [],
      invites: [],

      registerParent: (input) => {
        const parent: Parent = {
          id: input.id,
          name: input.name,
          phone: input.phone,
          email: input.email,
          childPlayerIds: [],
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ parents: [...s.parents.filter((p) => p.id !== parent.id), parent] }));
        upsertParent(parent).catch(logSyncError("registerParent"));
        return parent;
      },

      updateParent: (parentId, patch) => {
        let updated: Parent | undefined;
        set((s) => ({
          parents: s.parents.map((p) => {
            if (p.id !== parentId) return p;
            updated = { ...p, ...patch };
            return updated;
          }),
        }));
        if (updated) upsertParent(updated).catch(logSyncError("updateParent"));
      },

      linkChildToParent: (parentId, playerId) => {
        get().updateParent(parentId, {
          childPlayerIds: (() => {
            const parent = get().parents.find((p) => p.id === parentId);
            if (!parent) return [];
            return parent.childPlayerIds.includes(playerId)
              ? parent.childPlayerIds
              : [...parent.childPlayerIds, playerId];
          })(),
        });
      },

      setPushToken: (parentId, token) => {
        get().updateParent(parentId, { pushToken: token });
      },

      sendMatchInvites: ({ matchId, playerIds, parentsByPlayerId, opposition, kickOff, location, minutesPerPeriod }) => {
        const created: MatchInvite[] = [];
        const parents = get().parents;

        for (const playerId of playerIds) {
          const parentId = parentsByPlayerId[playerId];
          if (!parentId) continue;
          const invite: MatchInvite = {
            id: uuidv4(),
            matchId,
            playerId,
            parentId,
            status: "pending",
            createdAt: new Date().toISOString(),
          };
          created.push(invite);
          upsertInvite(invite).catch(logSyncError("sendMatchInvites"));

          const parent = parents.find((p) => p.id === parentId);
          if (parent?.pushToken) {
            const kickOffDate = new Date(kickOff);
            const dateLabel = kickOffDate.toLocaleDateString(undefined, {
              weekday: "short", day: "numeric", month: "short",
            });
            const timeLabel = kickOffDate.toLocaleTimeString(undefined, {
              hour: "2-digit", minute: "2-digit",
            });
            sendPushNotification(parent.pushToken, {
              title: "You're in the squad!",
              body: `vs ${opposition} - ${dateLabel} ${timeLabel} (${minutesPerPeriod * 2} min)${location ? ` @ ${location}` : ""}. Tap to accept or decline.`,
              data: { type: "match_invite", inviteId: invite.id, matchId },
            });
          }
        }

        set((s) => ({ invites: [...s.invites, ...created] }));
        return created;
      },

      respondToInvite: (inviteId, status) => {
        let updated: MatchInvite | undefined;
        set((s) => ({
          invites: s.invites.map((i) => {
            if (i.id !== inviteId) return i;
            updated = { ...i, status, respondedAt: new Date().toISOString() };
            return updated;
          }),
        }));
        if (updated) upsertInvite(updated).catch(logSyncError("respondToInvite"));
      },

      invitesForParent: (parentId) => get().invites.filter((i) => i.parentId === parentId),
      invitesForMatch: (matchId) => get().invites.filter((i) => i.matchId === matchId),

      setRemoteParent: (parent) => {
        set((s) => ({ parents: [...s.parents.filter((p) => p.id !== parent.id), parent] }));
      },

      setRemoteInvitesForParent: (parentId, remoteInvites) => {
        set((s) => ({
          invites: [...s.invites.filter((i) => i.parentId !== parentId), ...remoteInvites],
        }));
      },

      setRemoteInvitesForMatch: (matchId, remoteInvites) => {
        set((s) => ({
          invites: [...s.invites.filter((i) => i.matchId !== matchId), ...remoteInvites],
        }));
      },

      reset: () => set({ parents: [], invites: [] }),
    }),
    {
      name: "squad-buddy-parents",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
