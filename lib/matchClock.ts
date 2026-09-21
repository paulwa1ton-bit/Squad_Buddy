import { Match, PlayerMatchEntry } from "@/types/models";

export function totalPeriods(match: Pick<Match, "periodType">): number {
  return match.periodType === "quarters" ? 4 : 2;
}

export function isFinalPeriod(match: Pick<Match, "periodType" | "currentPeriod">): boolean {
  return match.currentPeriod >= totalPeriods(match);
}

/** Seconds elapsed in the currently-running period only (0 if not live). */
export function getPeriodElapsedSeconds(match: Pick<Match, "status" | "periodStartedAt">): number {
  if (match.status !== "live" || !match.periodStartedAt) return 0;
  const startedMs = new Date(match.periodStartedAt).getTime();
  return Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
}

/** Total match-clock seconds across all periods played so far, ticking live. */
export function getTotalMatchSeconds(
  match: Pick<Match, "status" | "periodStartedAt" | "elapsedSecondsBeforeCurrentStart">,
): number {
  return match.elapsedSecondsBeforeCurrentStart + getPeriodElapsedSeconds(match);
}

/** A single player's live seconds played, including time on the current shift. */
export function getPlayerLiveSeconds(
  entry: Pick<PlayerMatchEntry, "secondsPlayed" | "onFieldSince">,
  match: Pick<Match, "status">,
): number {
  if (!entry.onFieldSince || match.status !== "live") return entry.secondsPlayed;
  const sinceMs = new Date(entry.onFieldSince).getTime();
  return entry.secondsPlayed + Math.max(0, Math.floor((Date.now() - sinceMs) / 1000));
}

export function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(clamped / 60).toString().padStart(2, "0");
  const ss = (clamped % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export function currentPeriodMinute(
  match: Pick<Match, "status" | "periodStartedAt" | "minutesPerPeriod">,
): number {
  return Math.floor(getPeriodElapsedSeconds(match) / 60) + 1;
}
