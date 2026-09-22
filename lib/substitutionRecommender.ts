import {
  Match, Player, PlayerMatchEntry, PlayingPosition, SeasonStatsTotals, SubstitutionSuggestion,
} from "@/types/models";
import { getPlayerLiveSeconds, totalPeriods } from "@/lib/matchClock";

interface RecommendInput {
  match: Match;
  players: Player[];
  // prior-to-this-match season totals, keyed by playerId, used to balance
  // equitable game time across the season rather than just this one match.
  seasonTotalsByPlayerId: Record<string, SeasonStatsTotals>;
  maxSuggestions?: number;
}

function totalMinutesIncludingMatch(
  playerId: string,
  entry: PlayerMatchEntry | undefined,
  seasonTotalsByPlayerId: Record<string, SeasonStatsTotals>,
): number {
  const priorMinutes = seasonTotalsByPlayerId[playerId]?.minutesPlayed ?? 0;
  const thisMatchMinutes = entry ? entry.secondsPlayed / 60 : 0;
  return priorMinutes + thisMatchMinutes;
}

function isDedicatedGoalkeeper(positions: PlayingPosition[]): boolean {
  return positions.length > 0 && positions.every((p) => p === "GK");
}

/**
 * Whether a bench player could sanely fill the slot being vacated. A
 * goalkeeper can only be replaced by another goalkeeper, and a
 * goalkeeper-only player is never sent out to fill an outfield slot -
 * without this, the equitable-time-only ranking below would happily swap
 * an outfield sub on for the keeper (or vice versa) purely because they'd
 * played fewer minutes.
 */
function canFillPosition(
  benchPositions: PlayingPosition[],
  neededPosition: PlayingPosition | undefined,
): boolean {
  if (neededPosition === "GK") return benchPositions.includes("GK");
  return !isDedicatedGoalkeeper(benchPositions);
}

function positionFitScore(
  benchPositions: PlayingPosition[],
  neededPosition: PlayingPosition | undefined,
): number {
  if (!neededPosition) return 0.5; // no specific slot to fill - neutral fit
  if (benchPositions.includes(neededPosition)) return 1;
  // Loose adjacency: same broad line (defence/midfield/attack) is a partial fit.
  const lines: Record<string, PlayingPosition[]> = {
    def: ["LB", "CB", "RB", "LWB", "RWB", "SW"],
    mid: ["CDM", "CM", "LM", "RM", "CAM"],
    att: ["LW", "RW", "ST", "CF"],
  };
  const lineOf = (pos: PlayingPosition) =>
    Object.entries(lines).find(([, positions]) => positions.includes(pos))?.[0];
  const neededLine = lineOf(neededPosition);
  const sharesLine = benchPositions.some((p) => lineOf(p) === neededLine);
  return sharesLine ? 0.6 : 0.2;
}

/**
 * Each outfield squad player's "fair share" of this match's total playing
 * time, assuming the outfield shirts rotate evenly across everyone
 * available who isn't a dedicated keeper. The goalkeeper shirt is excluded
 * from the pool entirely - at grassroots level it doesn't rotate the way
 * outfield positions do, and this recommender never suggests moving it
 * anyway (see canFillPosition above).
 */
function fairShareSecondsPerOutfieldPlayer(match: Match, players: Player[]): number {
  const totalTargetSeconds = match.minutesPerPeriod * totalPeriods(match) * 60;
  // Before kickoff nobody has onFieldSince yet, but the starting lineup
  // (and therefore the number of outfield pitch slots) is already fixed -
  // fall back to isStarter so this also works for pre-match planning.
  const onFieldNow = match.status === "scheduled"
    ? match.lineup.filter((e) => e.isStarter)
    : match.lineup.filter((e) => !!e.onFieldSince);
  const outfieldSlots = onFieldNow.filter((e) => e.currentPosition !== "GK").length;
  const playerById = new Map(players.map((p) => [p.id, p]));
  const outfieldSquadCount = match.squadPlayerIds.filter((id) => {
    const player = playerById.get(id);
    return !player || !isDedicatedGoalkeeper(player.primaryPositions);
  }).length;
  if (outfieldSlots === 0 || outfieldSquadCount === 0) return 0;
  return (totalTargetSeconds * outfieldSlots) / outfieldSquadCount;
}

/**
 * Recommends substitutions balancing (1) position appropriateness of the
 * incoming player, (2) equitable playing time across the season, and (3)
 * how each player's minutes so far *this match* compare to their fair
 * share of it. Not a strict optimizer - surfaces a ranked shortlist for
 * the manager to accept, tweak, or ignore.
 */
export function recommendSubstitutions({
  match,
  players,
  seasonTotalsByPlayerId,
  maxSuggestions = 3,
}: RecommendInput): SubstitutionSuggestion[] {
  const entryByPlayerId = new Map(match.lineup.map((e) => [e.playerId, e]));
  const playerById = new Map(players.map((p) => [p.id, p]));
  const fairShareSeconds = fairShareSecondsPerOutfieldPlayer(match, players);

  const onFieldNow = match.lineup.filter((e) => !!e.onFieldSince);
  const bench = match.squadPlayerIds
    .filter((id) => !onFieldNow.some((e) => e.playerId === id))
    .map((id) => entryByPlayerId.get(id))
    .filter((e): e is PlayerMatchEntry => !!e);

  if (bench.length === 0 || onFieldNow.length === 0) return [];

  const candidatesOff = [...onFieldNow]
    .map((entry) => ({
      entry,
      totalMinutes: totalMinutesIncludingMatch(entry.playerId, entry, seasonTotalsByPlayerId),
      thisMatchSeconds: getPlayerLiveSeconds(entry, match),
      hasYellow: match.events.some(
        (e) => e.type === "yellow_card" && e.playerId === entry.playerId,
      ),
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes || (b.hasYellow ? 1 : 0) - (a.hasYellow ? 1 : 0));

  const candidatesOn = [...bench]
    .map((entry) => ({
      entry,
      player: playerById.get(entry.playerId),
      totalMinutes: totalMinutesIncludingMatch(entry.playerId, entry, seasonTotalsByPlayerId),
      thisMatchSeconds: getPlayerLiveSeconds(entry, match),
    }))
    .filter((c) => !!c.player)
    .sort((a, b) => a.totalMinutes - b.totalMinutes);

  const totalMatchSecondsSoFar = onFieldNow.reduce((sum, e) => sum + getPlayerLiveSeconds(e, match), 0)
    + bench.reduce((sum, e) => sum + getPlayerLiveSeconds(e, match), 0);
  const remainingMatchSeconds = Math.max(
    0,
    match.minutesPerPeriod * totalPeriods(match) * 60 * onFieldNow.length - totalMatchSecondsSoFar,
  );

  const suggestions: SubstitutionSuggestion[] = [];
  const usedOnIds = new Set<string>();

  for (const off of candidatesOff) {
    if (suggestions.length >= maxSuggestions) break;

    const eligible = candidatesOn.filter(
      (c) => !usedOnIds.has(c.entry.playerId) && c.player
        && canFillPosition(c.player.primaryPositions, off.entry.currentPosition),
    );
    if (eligible.length === 0) continue; // no sane replacement for this shirt right now

    // Among eligible replacements, prefer whoever is furthest behind their
    // fair share of this match; season-long minutes break ties.
    const bestOn = [...eligible].sort((a, b) => {
      const gapA = fairShareSeconds - a.thisMatchSeconds;
      const gapB = fairShareSeconds - b.thisMatchSeconds;
      return gapB - gapA || a.totalMinutes - b.totalMinutes;
    })[0];
    if (!bestOn.player) continue;

    const fit = positionFitScore(bestOn.player.primaryPositions, off.entry.currentPosition);
    const minutesGap = off.totalMinutes - bestOn.totalMinutes;
    const onFairShareGapMinutes = (fairShareSeconds - bestOn.thisMatchSeconds) / 60;
    // Weight equitable-time gap most heavily (both season-long and this
    // match's fair share), then reward a good positional match so the
    // suggestion is still tactically sane.
    const score = minutesGap * 0.5 + Math.max(0, onFairShareGapMinutes) * 0.5 + fit * 30 + (off.hasYellow ? 10 : 0);

    const reasonParts: string[] = [];
    if (onFairShareGapMinutes > 3) {
      reasonParts.push(
        `${Math.round(onFairShareGapMinutes)} min behind a fair share of this match`,
      );
    } else if (minutesGap > 5) {
      reasonParts.push(
        `${Math.round(minutesGap)} fewer minutes played so far`,
      );
    }
    if (fit >= 1) reasonParts.push("direct position match");
    else if (fit >= 0.6) reasonParts.push("covers the same area of the pitch");
    if (off.hasYellow) reasonParts.push("currently on a yellow card");
    if (reasonParts.length === 0) reasonParts.push("next in line for game time");
    if (remainingMatchSeconds > 0 && onFairShareGapMinutes > 3) {
      reasonParts.push(`${Math.round(remainingMatchSeconds / 60)} min left to even things up`);
    }

    suggestions.push({
      playerOffId: off.entry.playerId,
      playerOnId: bestOn.entry.playerId,
      reason: reasonParts.join(", "),
      score,
    });
    usedOnIds.add(bestOn.entry.playerId);
  }

  return suggestions.sort((a, b) => b.score - a.score);
}

/**
 * True when at least one bench player is meaningfully behind their fair
 * share of this match's playing time and there's a sane (position-eligible)
 * replacement for them. Used to proactively nudge the manager at natural
 * breaks (e.g. the end of a period) rather than only when they remember to
 * tap "Recommend a substitution".
 */
export interface MatchPlan {
  /** Each outfield player's target minutes for this match, for equal game time. */
  fairShareMinutes: number;
  totalMatchMinutes: number;
  /** Suggested match-clock minutes at which to make a change, spread evenly
   * across the outfield bench so each sub gets a clear "you're on around
   * minute X" slot and nobody sits out the whole warm-up-to-cold cycle. */
  subWindows: number[];
  /** Starters with nobody on the bench who plays their position or even the
   * same broad area of the pitch - realistically they're playing long
   * minutes this match whether or not the plan above says otherwise. */
  noCoverPlayerIds: string[];
}

/**
 * Whether any bench player is a sane like-for-like (or same-area) cover for
 * a given position - a stricter bar than canFillPosition, which only rules
 * out outright nonsensical GK/outfield swaps. This is for flagging "there's
 * genuinely nobody else for this shirt", not for picking a substitute.
 */
function hasReasonableCover(benchPlayers: Player[], neededPosition: PlayingPosition | undefined): boolean {
  if (!neededPosition) return true; // nothing recorded to check cover against
  if (neededPosition === "GK") return benchPlayers.some((p) => p.primaryPositions.includes("GK"));
  return benchPlayers.some((p) => positionFitScore(p.primaryPositions, neededPosition) >= 0.6);
}

/**
 * A pre-match game plan: the fair-share minute target, suggested moments to
 * make changes so the bench rotates through evenly, and which starters have
 * no real cover and should be expected to play long minutes. Meant for the
 * kickoff screen - a plan the manager can glance at before the whistle,
 * rather than only reacting to recommendations once the clock is running.
 */
export function buildMatchPlan({ match, players }: { match: Match; players: Player[] }): MatchPlan | null {
  const starters = match.lineup.filter((e) => e.isStarter);
  if (starters.length === 0) return null;

  const totalMatchMinutes = match.minutesPerPeriod * totalPeriods(match);
  const fairShareMinutes = Math.round(fairShareSecondsPerOutfieldPlayer(match, players) / 60);

  const playerById = new Map(players.map((p) => [p.id, p]));
  const benchIds = match.squadPlayerIds.filter((id) => !starters.some((e) => e.playerId === id));
  const benchPlayers = benchIds.map((id) => playerById.get(id)).filter((p): p is Player => !!p);
  const outfieldBenchCount = benchPlayers.filter((p) => !isDedicatedGoalkeeper(p.primaryPositions)).length;

  const subWindows: number[] = [];
  for (let i = 1; i <= outfieldBenchCount; i += 1) {
    subWindows.push(Math.round((totalMatchMinutes * i) / (outfieldBenchCount + 1)));
  }

  const noCoverPlayerIds = starters
    .filter((entry) => !hasReasonableCover(benchPlayers, entry.currentPosition))
    .map((entry) => entry.playerId);

  return { fairShareMinutes, totalMatchMinutes, subWindows, noCoverPlayerIds };
}

export function hasSignificantEquityGap(input: RecommendInput): boolean {
  const suggestions = recommendSubstitutions(input);
  if (suggestions.length === 0) return false;
  const fairShareSeconds = fairShareSecondsPerOutfieldPlayer(input.match, input.players);
  const entryByPlayerId = new Map(input.match.lineup.map((e) => [e.playerId, e]));
  return suggestions.some((s) => {
    const onEntry = entryByPlayerId.get(s.playerOnId);
    if (!onEntry) return false;
    const gapMinutes = (fairShareSeconds - getPlayerLiveSeconds(onEntry, input.match)) / 60;
    return gapMinutes > 5;
  });
}
