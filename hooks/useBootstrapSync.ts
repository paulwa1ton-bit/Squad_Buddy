import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";
import { useParentStore } from "@/store/parentStore";
import { connectToTeam } from "@/lib/teamSync";
import { connectAsParent } from "@/lib/parentSync";
import { findTeamByManager } from "@/lib/firestore/teamsApi";

/** Resolves once a persist-middleware store has finished rehydrating from AsyncStorage. */
function waitForHydration(persistApi: {
  hasHydrated: () => boolean;
  onFinishHydration: (cb: () => void) => () => void;
}): Promise<void> {
  if (persistApi.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = persistApi.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

/**
 * Re-opens the Firestore listeners that were active when the app was last
 * closed. Sign-in flows call connectToTeam/connectAsParent directly, but a
 * plain app relaunch restores the persisted auth/team/parent state without
 * re-running sign-in - this is what resumes live sync in that case.
 */
export function useBootstrapSync(): void {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await Promise.all([
        waitForHydration(useAuthStore.persist),
        waitForHydration(useTeamStore.persist),
        waitForHydration(useParentStore.persist),
      ]);
      if (cancelled) return;

      const { accountType, managerUserId, parentId } = useAuthStore.getState();

      if (accountType === "manager" && managerUserId) {
        const localTeam = useTeamStore.getState().team;
        if (localTeam && localTeam.managerUserId === managerUserId) {
          connectToTeam(localTeam.id);
        } else {
          const remoteTeam = await findTeamByManager(managerUserId).catch(() => null);
          if (!cancelled && remoteTeam) {
            useTeamStore.getState().setRemoteTeam(remoteTeam);
            connectToTeam(remoteTeam.id);
          }
        }
      } else if (accountType === "parent" && parentId) {
        connectAsParent(parentId);
        const localTeam = useTeamStore.getState().team;
        if (localTeam) connectToTeam(localTeam.id);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}
