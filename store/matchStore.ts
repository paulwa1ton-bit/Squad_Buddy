import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import {
  Match, MatchEvent, MatchEventType, MatchFormat, PeriodType, PlayerMatchEntry,
  PlayingPosition, SeasonStatsTotals,
} from "@/types/models";
import { getPeriodElapsedSeconds, isFinalPeriod } from "@/lib/matchClock";
import { deleteMatchRemote, upsertMatch } from "@/lib/firestore/matchesApi";

interface MatchState {
  matches: Match[];

  createMatch: (input: {
    teamId: string;
    opposition: string;
    location?: string;
    kickOff: string;
    isHome: boolean;
    format: MatchFormat;
    periodType: PeriodType;
    minutesPerPeriod: number;
    squadPlayerIds: string[];
    formationId?: string;
  }) => Match;

  setLineup: (
    matchId: string,
    starters: { playerId: string; position: PlayingPosition; slotId: string }[],
  ) => void;

  updateMatchSquad: (matchId: string, squadPlayerIds: string[]) => void;
  updateMatchFormation: (matchId: string, formationId: string) => void;
  markParentsNotified: (matchId: string, parentIds: string[]) => void;

  startMatch: (matchId: string) => void;
  endCurrentPeriod: (matchId: string) => void;
  startNextPeriod: (matchId: string) => void;
  completeMatch: (matchId: string) => void;

  recordEvent: (
    matchId: string,
    type: MatchEventType,
    playerId: string,
    relatedPlayerId?: string,
  ) => void;
  removeEvent: (matchId: string, eventId: string) => void;
  adjustOppositionScore: (matchId: string, delta: number) => void;

  makeSubstitution: (matchId: string, playerOffId: string, playerOnId: string) => void;

  deleteMatch: (matchId: string) => void;

  getSeasonTotals: (teamId: string, playerId: string, excludeMatchId?: string) => SeasonStatsTotals;

  /** Applied from a Firestore onSnapshot listener - see lib/teamSync.ts. Not for direct UI use. */
  setRemoteMatches: (teamId: string, matches: Match[]) => void;
  /** Clears all local state, e.g. on sign-out. */
  reset: () => void;
}

function freezeOnFieldEntry(entry: PlayerMatchEntry, match: Match): PlayerMatchEntry {
  if (!entry.onFieldSince) return entry;
  const sinceMs = new Date(entry.onFieldSince).getTime();
  const addedSeconds = Math.max(0, Math.floor((Date.now() - sinceMs) / 1000));
  return { ...entry, secondsPlayed: entry.secondsPlayed + addedSeconds, onFieldSince: undefined };
}

function logSyncError(action: string) {
  return (err: unknown) => console.warn(`[matchStore] Firestore sync failed (${action}):`, err);
}

export const useMatchStore = create<MatchState>()(
  persist(
    (set, get) => {
      /** Reads the just-mutated match back out of state and pushes it to Firestore. */
      function persistMatch(matchId: string, action: string) {
        const match = get().matches.find((m) => m.id === matchId);
        if (match) upsertMatch(match).catch(logSyncError(action));
      }

      return {
        matches: [],

        createMatch: (input) => {
          const match: Match = {
            id: uuidv4(),
            teamId: input.teamId,
            opposition: input.opposition,
            location: input.location,
            kickOff: input.kickOff,
            isHome: input.isHome,
            format: input.format,
            periodType: input.periodType,
            minutesPerPeriod: input.minutesPerPeriod,
            formationId: input.formationId,
            squadPlayerIds: input.squadPlayerIds,
            lineup: input.squadPlayerIds.map((playerId) => ({
              playerId,
              isStarter: false,
              secondsPlayed: 0,
            })),
            status: "scheduled",
            currentPeriod: 0,
            elapsedSecondsBeforeCurrentStart: 0,
            events: [],
            teamScore: 0,
            oppositionScore: 0,
            notifiedParentIds: [],
            createdAt: new Date().toISOString(),
          };
          set((s) => ({ matches: [...s.matches, match] }));
          upsertMatch(match).catch(logSyncError("createMatch"));
          return match;
        },

        setLineup: (matchId, starters) => {
          set((s) => ({
            matches: s.matches.map((m) => {
              if (m.id !== matchId) return m;
              const starterIds = new Set(starters.map((st) => st.playerId));
              const lineup: PlayerMatchEntry[] = m.squadPlayerIds.map((playerId) => {
                const starter = starters.find((st) => st.playerId === playerId);
                const existing = m.lineup.find((e) => e.playerId === playerId);
                return {
                  playerId,
                  isStarter: starterIds.has(playerId),
                  positionAtStart: starter?.position,
                  currentPosition: starter?.position,
                  slotId: starter?.slotId,
                  secondsPlayed: existing?.secondsPlayed ?? 0,
                  onFieldSince: existing?.onFieldSince,
                };
              });
              return { ...m, lineup };
            }),
          }));
          persistMatch(matchId, "setLineup");
        },

        updateMatchSquad: (matchId, squadPlayerIds) => {
          set((s) => ({
            matches: s.matches.map((m) => {
              if (m.id !== matchId) return m;
              const lineup: PlayerMatchEntry[] = squadPlayerIds.map((playerId) => {
                const existing = m.lineup.find((e) => e.playerId === playerId);
                return existing ?? { playerId, isStarter: false, secondsPlayed: 0 };
              });
              return { ...m, squadPlayerIds, lineup };
            }),
          }));
          persistMatch(matchId, "updateMatchSquad");
        },

        updateMatchFormation: (matchId, formationId) => {
          set((s) => ({
            matches: s.matches.map((m) => (m.id === matchId ? { ...m, formationId } : m)),
          }));
          persistMatch(matchId, "updateMatchFormation");
        },

        markParentsNotified: (matchId, parentIds) => {
          set((s) => ({
            matches: s.matches.map((m) =>
              m.id === matchId
                ? { ...m, notifiedParentIds: [...new Set([...m.notifiedParentIds, ...parentIds])] }
                : m,
            ),
          }));
          persistMatch(matchId, "markParentsNotified");
        },

        startMatch: (matchId) => {
          const nowIso = new Date().toISOString();
          set((s) => ({
            matches: s.matches.map((m) => {
              if (m.id !== matchId) return m;
              return {
                ...m,
                status: "live",
                currentPeriod: 1,
                periodStartedAt: nowIso,
                elapsedSecondsBeforeCurrentStart: 0,
                lineup: m.lineup.map((e) =>
                  e.isStarter ? { ...e, onFieldSince: nowIso } : e,
                ),
              };
            }),
          }));
          persistMatch(matchId, "startMatch");
        },

        endCurrentPeriod: (matchId) => {
          set((s) => ({
            matches: s.matches.map((m) => {
              if (m.id !== matchId) return m;
              const periodSeconds = getPeriodElapsedSeconds(m);
              const frozenLineup = m.lineup.map((e) => freezeOnFieldEntry(e, m));
              const finished = isFinalPeriod(m);
              return {
                ...m,
                status: finished ? "completed" : "paused",
                lineup: frozenLineup,
                elapsedSecondsBeforeCurrentStart: m.elapsedSecondsBeforeCurrentStart + periodSeconds,
                periodStartedAt: undefined,
              };
            }),
          }));
          persistMatch(matchId, "endCurrentPeriod");
        },

        startNextPeriod: (matchId) => {
          const nowIso = new Date().toISOString();
          set((s) => ({
            matches: s.matches.map((m) => {
              if (m.id !== matchId) return m;
              if (m.status === "completed") return m;
              return {
                ...m,
                status: "live",
                currentPeriod: m.currentPeriod + 1,
                periodStartedAt: nowIso,
                // A player who was on the pitch when the previous period ended still has
                // currentPosition set (endCurrentPeriod only clears onFieldSince; a sub
                // clears currentPosition too) - so this reliably identifies who resumes.
                lineup: m.lineup.map((e) =>
                  !e.onFieldSince && e.currentPosition ? { ...e, onFieldSince: nowIso } : e,
                ),
              };
            }),
          }));
          persistMatch(matchId, "startNextPeriod");
        },

        completeMatch: (matchId) => {
          set((s) => ({
            matches: s.matches.map((m) => {
              if (m.id !== matchId) return m;
              const periodSeconds = getPeriodElapsedSeconds(m);
              return {
                ...m,
                status: "completed",
                lineup: m.lineup.map((e) => freezeOnFieldEntry(e, m)),
                elapsedSecondsBeforeCurrentStart: m.elapsedSecondsBeforeCurrentStart + periodSeconds,
                periodStartedAt: undefined,
              };
            }),
          }));
          persistMatch(matchId, "completeMatch");
        },

        recordEvent: (matchId, type, playerId, relatedPlayerId) => {
          set((s) => ({
            matches: s.matches.map((m) => {
              if (m.id !== matchId) return m;
              const event: MatchEvent = {
                id: uuidv4(),
                matchId,
                type,
                playerId,
                relatedPlayerId,
                minute: Math.floor(getPeriodElapsedSeconds(m) / 60) + 1,
                period: m.currentPeriod,
                createdAt: new Date().toISOString(),
              };
              return {
                ...m,
                events: [...m.events, event],
                teamScore: m.teamScore + (type === "goal" ? 1 : 0),
                oppositionScore: m.oppositionScore + (type === "own_goal" ? 1 : 0),
              };
            }),
          }));
          persistMatch(matchId, "recordEvent");
        },

        removeEvent: (matchId, eventId) => {
          set((s) => ({
            matches: s.matches.map((m) => {
              if (m.id !== matchId) return m;
              const event = m.events.find((e) => e.id === eventId);
              if (!event) return m;
              return {
                ...m,
                events: m.events.filter((e) => e.id !== eventId),
                teamScore: m.teamScore - (event.type === "goal" ? 1 : 0),
                oppositionScore: m.oppositionScore - (event.type === "own_goal" ? 1 : 0),
              };
            }),
          }));
          persistMatch(matchId, "removeEvent");
        },

        adjustOppositionScore: (matchId, delta) => {
          set((s) => ({
            matches: s.matches.map((m) =>
              m.id === matchId
                ? { ...m, oppositionScore: Math.max(0, m.oppositionScore + delta) }
                : m,
            ),
          }));
          persistMatch(matchId, "adjustOppositionScore");
        },

        makeSubstitution: (matchId, playerOffId, playerOnId) => {
          const nowIso = new Date().toISOString();
          set((s) => ({
            matches: s.matches.map((m) => {
              if (m.id !== matchId) return m;
              const offEntry = m.lineup.find((e) => e.playerId === playerOffId);
              if (!offEntry) return m;
              const positionHandedOver = offEntry.currentPosition;
              const slotHandedOver = offEntry.slotId;

              const lineup = m.lineup.map((e) => {
                if (e.playerId === playerOffId) {
                  return { ...freezeOnFieldEntry(e, m), currentPosition: undefined, slotId: undefined };
                }
                if (e.playerId === playerOnId) {
                  return { ...e, onFieldSince: nowIso, currentPosition: positionHandedOver, slotId: slotHandedOver };
                }
                return e;
              });

              const event: MatchEvent = {
                id: uuidv4(),
                matchId,
                type: "substitution",
                playerId: playerOnId,
                relatedPlayerId: playerOffId,
                minute: Math.floor(getPeriodElapsedSeconds(m) / 60) + 1,
                period: m.currentPeriod,
                createdAt: nowIso,
              };

              return { ...m, lineup, events: [...m.events, event] };
            }),
          }));
          persistMatch(matchId, "makeSubstitution");
        },

        deleteMatch: (matchId) => {
          const match = get().matches.find((m) => m.id === matchId);
          set((s) => ({ matches: s.matches.filter((m) => m.id !== matchId) }));
          if (match) deleteMatchRemote(match.teamId, matchId).catch(logSyncError("deleteMatch"));
        },

        getSeasonTotals: (teamId, playerId, excludeMatchId) => {
          const totals: SeasonStatsTotals = {
            appearances: 0, minutesPlayed: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0,
          };
          const matches = get().matches.filter(
            (m) => m.teamId === teamId && m.status === "completed" && m.id !== excludeMatchId,
          );
          for (const m of matches) {
            const entry = m.lineup.find((e) => e.playerId === playerId);
            if (!entry) continue;
            if (entry.secondsPlayed > 0) {
              totals.appearances += 1;
              totals.minutesPlayed += Math.round(entry.secondsPlayed / 60);
            }
            for (const ev of m.events) {
              if (ev.type === "goal" && ev.playerId === playerId) totals.goals += 1;
              if (ev.type === "assist" && ev.playerId === playerId) totals.assists += 1;
              if (ev.type === "yellow_card" && ev.playerId === playerId) totals.yellowCards += 1;
              if (ev.type === "red_card" && ev.playerId === playerId) totals.redCards += 1;
            }
          }
          return totals;
        },

        setRemoteMatches: (teamId, remoteMatches) => {
          set((s) => ({
            matches: [...s.matches.filter((m) => m.teamId !== teamId), ...remoteMatches],
          }));
        },

        reset: () => set({ matches: [] }),
      };
    },
    {
      name: "squad-buddy-matches",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
