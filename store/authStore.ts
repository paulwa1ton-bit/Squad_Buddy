import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOutFirebase } from "@/lib/auth";
import { disconnectFromTeam } from "@/lib/teamSync";
import { disconnectAsParent } from "@/lib/parentSync";
import { useTeamStore } from "@/store/teamStore";
import { useMatchStore } from "@/store/matchStore";
import { useParentStore } from "@/store/parentStore";

export type AccountType = "manager" | "parent" | null;

interface AuthState {
  accountType: AccountType;
  managerUserId: string | null; // Firebase Auth uid, used as Team.managerUserId / ManagerProfile.id
  parentId: string | null; // Firebase Auth uid, matches Parent.id in parentStore
  hasCompletedOnboarding: boolean;

  signInAsManager: (managerUserId: string) => void;
  signInAsParent: (parentId: string) => void;
  completeOnboarding: () => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accountType: null,
      managerUserId: null,
      parentId: null,
      hasCompletedOnboarding: false,

      signInAsManager: (managerUserId) => set({ accountType: "manager", managerUserId, parentId: null }),
      signInAsParent: (parentId) => set({ accountType: "parent", parentId, managerUserId: null }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),

      signOut: () => {
        disconnectFromTeam();
        disconnectAsParent();
        useTeamStore.getState().reset();
        useMatchStore.getState().reset();
        useParentStore.getState().reset();
        signOutFirebase().catch((err) => console.warn("[authStore] Firebase sign-out failed:", err));
        set({ accountType: null, managerUserId: null, parentId: null, hasCompletedOnboarding: false });
      },
    }),
    {
      name: "squad-buddy-auth",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
