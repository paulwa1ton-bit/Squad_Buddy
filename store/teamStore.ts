import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import {
  AgeGroup, Formation, MatchFormat, Player, PeriodType, PlayingPosition, Team,
} from "@/types/models";
import { FA_AGE_GROUP_GUIDELINES } from "@/data/faGuidelines";
import { cloneFormationForTeam, getPresetsForFormat } from "@/data/formationPresets";
import { upsertTeam } from "@/lib/firestore/teamsApi";
import { upsertPlayer } from "@/lib/firestore/playersApi";
import { deleteFormationRemote, upsertFormation } from "@/lib/firestore/formationsApi";

function logSyncError(action: string) {
  return (err: unknown) => console.warn(`[teamStore] Firestore sync failed (${action}):`, err);
}

interface TeamState {
  team: Team | null;
  players: Player[];
  formations: Formation[];

  createTeam: (input: {
    name: string;
    league: string;
    ageGroup: AgeGroup;
    logoUri?: string;
    homePhotoUri?: string;
    managerUserId: string;
    periodTypeOverride?: PeriodType;
    minutesPerPeriodOverride?: number;
  }) => Team;
  updateTeam: (patch: Partial<Team>) => void;

  addPlayer: (input: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    shirtNumber?: number;
    primaryPositions: PlayingPosition[];
    photoUri?: string;
    parentId?: string;
  }) => Player;
  updatePlayer: (playerId: string, patch: Partial<Player>) => void;
  archivePlayer: (playerId: string) => void;

  adoptFormationPreset: (presetId: string) => Formation;
  createCustomFormation: (name: string, format: MatchFormat, slots: Formation["slots"]) => Formation;
  updateFormation: (formationId: string, patch: Partial<Formation>) => void;
  deleteFormation: (formationId: string) => void;

  /** Applied from Firestore onSnapshot listeners - see lib/teamSync.ts. Not for direct UI use. */
  setRemoteTeam: (team: Team) => void;
  setRemotePlayers: (players: Player[]) => void;
  setRemoteFormations: (formations: Formation[]) => void;
  /** Clears all local state, e.g. on sign-out. */
  reset: () => void;
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      team: null,
      players: [],
      formations: [],

      createTeam: (input) => {
        const guideline = FA_AGE_GROUP_GUIDELINES[input.ageGroup];
        const team: Team = {
          id: uuidv4(),
          name: input.name,
          league: input.league,
          ageGroup: input.ageGroup,
          format: guideline.format,
          periodType: input.periodTypeOverride ?? guideline.defaultPeriodType,
          minutesPerPeriod: input.minutesPerPeriodOverride ?? guideline.minutesPerPeriod,
          logoUri: input.logoUri,
          homePhotoUri: input.homePhotoUri,
          managerUserId: input.managerUserId,
          createdAt: new Date().toISOString(),
        };
        set({ team });
        upsertTeam(team).catch(logSyncError("createTeam"));
        return team;
      },

      updateTeam: (patch) => {
        const current = get().team;
        if (!current) return;
        const updated = { ...current, ...patch };
        set({ team: updated });
        upsertTeam(updated).catch(logSyncError("updateTeam"));
      },

      addPlayer: (input) => {
        const team = get().team;
        const player: Player = {
          id: uuidv4(),
          teamId: team?.id ?? "",
          firstName: input.firstName,
          lastName: input.lastName,
          dateOfBirth: input.dateOfBirth,
          shirtNumber: input.shirtNumber,
          primaryPositions: input.primaryPositions,
          photoUri: input.photoUri,
          parentId: input.parentId,
          archived: false,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ players: [...s.players, player] }));
        if (player.teamId) upsertPlayer(player.teamId, player).catch(logSyncError("addPlayer"));
        return player;
      },

      updatePlayer: (playerId, patch) => {
        let updatedPlayer: Player | undefined;
        set((s) => ({
          players: s.players.map((p) => {
            if (p.id !== playerId) return p;
            updatedPlayer = { ...p, ...patch };
            return updatedPlayer;
          }),
        }));
        if (updatedPlayer?.teamId) {
          upsertPlayer(updatedPlayer.teamId, updatedPlayer).catch(logSyncError("updatePlayer"));
        }
      },

      archivePlayer: (playerId) => {
        get().updatePlayer(playerId, { archived: true });
      },

      adoptFormationPreset: (presetId) => {
        const team = get().team;
        if (!team) throw new Error("Cannot adopt a formation before a team is created");
        const presets = getPresetsForFormat(team.format);
        const found = presets.find((p) => p.id === presetId);
        if (!found) throw new Error(`Unknown formation preset: ${presetId}`);
        const cloned = cloneFormationForTeam(found, team.id, uuidv4());
        set((s) => ({ formations: [...s.formations, cloned] }));
        upsertFormation(team.id, cloned).catch(logSyncError("adoptFormationPreset"));
        return cloned;
      },

      createCustomFormation: (name, format, slots) => {
        const team = get().team;
        const formation: Formation = {
          id: uuidv4(),
          teamId: team?.id ?? "",
          name,
          format,
          slots,
          isPreset: false,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ formations: [...s.formations, formation] }));
        if (formation.teamId) upsertFormation(formation.teamId, formation).catch(logSyncError("createCustomFormation"));
        return formation;
      },

      updateFormation: (formationId, patch) => {
        let updatedFormation: Formation | undefined;
        set((s) => ({
          formations: s.formations.map((f) => {
            if (f.id !== formationId) return f;
            updatedFormation = { ...f, ...patch };
            return updatedFormation;
          }),
        }));
        if (updatedFormation?.teamId) {
          upsertFormation(updatedFormation.teamId, updatedFormation).catch(logSyncError("updateFormation"));
        }
      },

      deleteFormation: (formationId) => {
        const formation = get().formations.find((f) => f.id === formationId);
        set((s) => ({ formations: s.formations.filter((f) => f.id !== formationId) }));
        if (formation?.teamId) {
          deleteFormationRemote(formation.teamId, formationId).catch(logSyncError("deleteFormation"));
        }
      },

      setRemoteTeam: (team) => set({ team }),
      setRemotePlayers: (players) => set({ players }),
      setRemoteFormations: (formations) => set({ formations }),

      reset: () => set({ team: null, players: [], formations: [] }),
    }),
    {
      name: "squad-buddy-team",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
