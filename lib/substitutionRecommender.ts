import {
  Match, Player, PlayerMatchEntry, PlayingPosition, SeasonStatsTotals, SubstitutionSuggestion,
} from "@/types/models";

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
 * Recommends substitutions balancing (1) position appropriateness of the
 * incoming player and (2) equitable playing time across the squad. Not a
 * strict optimizer - surfaces a ranked shortlist for the manager to accept,
 * tweak, or ignore.
 */
export function recommendSubstitutions({
  match,
  players,
  seasonTotalsByPlayerId,
  maxSuggestions = 3,
}: RecommendInput): SubstitutionSuggestion[] {
  const entryByPlayerId = new Map(match.lineup.map((e) => [e.playerId, e]));
  const playerById = new Map(players.map((p) => [p.id, p]));

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
    }))
    .filter((c) => !!c.player)
    .sort((a, b) => a.totalMinutes - b.totalMinutes);

  const suggestions: SubstitutionSuggestion[] = [];
  const usedOnIds = new Set<string>();

  for (const off of candidatesOff) {
    if (suggestions.length >= maxSuggestions) break;
    const bestOn = candidatesOn.find((c) => !usedOnIds.has(c.entry.playerId));
    if (!bestOn || !bestOn.player) continue;

    const fit = positionFitScore(bestOn.player.primaryPositions, off.entry.currentPosition);
    const minutesGap = off.totalMinutes - bestOn.totalMinutes;
    // Weight equitable-time gap more heavily than position fit, but still
    // reward a good positional match so the suggestion is tactically sane.
    const score = minutesGap * 0.7 + fit * 30 + (off.hasYellow ? 10 : 0);

    const reasonParts: string[] = [];
    if (minutesGap > 5) {
      reasonParts.push(
        `${Math.round(minutesGap)} fewer minutes played so far`,
      );
    }
    if (fit >= 1) reasonParts.push("direct position match");
    else if (fit >= 0.6) reasonParts.push("covers the same area of the pitch");
    if (off.hasYellow) reasonParts.push("currently on a yellow card");
    if (reasonParts.length === 0) reasonParts.push("next in line for game time");

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
