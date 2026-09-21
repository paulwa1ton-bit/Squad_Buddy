import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTeamStore } from "@/store/teamStore";
import { useMatchStore } from "@/store/matchStore";
import {
  currentPeriodMinute, formatClock, getPlayerLiveSeconds, getTotalMatchSeconds, isFinalPeriod, totalPeriods,
} from "@/lib/matchClock";
import { recommendSubstitutions } from "@/lib/substitutionRecommender";
import { triggerGoalCelebration, triggerSubstitutionAlert } from "@/lib/haptics";
import { colors, spacing, radius } from "@/constants/theme";
import { Player, SubstitutionSuggestion } from "@/types/models";

export default function MatchLive() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const match = useMatchStore((s) => s.matches.find((m) => m.id === id));
  const team = useTeamStore((s) => s.team);
  const players = useTeamStore((s) => s.players);
  const getSeasonTotals = useMatchStore((s) => s.getSeasonTotals);

  const startMatch = useMatchStore((s) => s.startMatch);
  const endCurrentPeriod = useMatchStore((s) => s.endCurrentPeriod);
  const startNextPeriod = useMatchStore((s) => s.startNextPeriod);
  const completeMatch = useMatchStore((s) => s.completeMatch);
  const recordEvent = useMatchStore((s) => s.recordEvent);
  const adjustOppositionScore = useMatchStore((s) => s.adjustOppositionScore);
  const makeSubstitution = useMatchStore((s) => s.makeSubstitution);

  const [, setTick] = useState(0);
  const [actionPlayerId, setActionPlayerId] = useState<string | null>(null);
  const [assistPickerFor, setAssistPickerFor] = useState<string | null>(null); // goal scorer id
  const [subOffId, setSubOffId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SubstitutionSuggestion[] | null>(null);

  useEffect(() => {
    if (match?.status !== "live") return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [match?.status]);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  if (!match || !team) {
    return (
      <View style={styles.container}>
        <Text style={styles.mutedText}>Match not found.</Text>
      </View>
    );
  }

  const onFieldEntries = match.lineup.filter((e) => !!e.onFieldSince);
  const benchEntries = match.squadPlayerIds
    .map((playerId) => match.lineup.find((e) => e.playerId === playerId))
    .filter((e): e is typeof match.lineup[number] => !!e && !e.onFieldSince);

  if (match.status === "scheduled") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.kickoffWrap}>
          <Text style={styles.kickoffOpp}>{match.isHome ? "vs" : "@"} {match.opposition}</Text>
          <Text style={styles.mutedText}>
            {match.format} · {match.minutesPerPeriod} min {match.periodType}
          </Text>
          <Text style={styles.mutedText}>{match.lineup.filter((e) => e.isStarter).length} starters ready</Text>
          <Pressable style={styles.kickoffButton} onPress={() => startMatch(match.id)}>
            <Text style={styles.kickoffButtonText}>▶ KICK OFF</Text>
          </Pressable>
          <Pressable onPress={() => router.push(`/match/${match.id}/setup`)}>
            <Text style={styles.linkText}>Edit squad / lineup</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  function handleEndPeriod() {
    const finalPeriod = isFinalPeriod(match!);
    endCurrentPeriod(match!.id);
    if (finalPeriod) {
      router.replace(`/match/${match!.id}/summary`);
    }
  }

  function handleShowRecommendation() {
    const seasonTotalsByPlayerId: Record<string, ReturnType<typeof getSeasonTotals>> = {};
    for (const playerId of match!.squadPlayerIds) {
      seasonTotalsByPlayerId[playerId] = getSeasonTotals(team!.id, playerId, match!.id);
    }
    const result = recommendSubstitutions({ match: match!, players, seasonTotalsByPlayerId });
    if (result.length === 0) {
      Alert.alert("No suggestion available", "Not enough bench players or on-field players to suggest a change.");
      return;
    }
    triggerSubstitutionAlert();
    setSuggestions(result);
  }

  function handleLogGoal(playerId: string) {
    recordEvent(match!.id, "goal", playerId);
    triggerGoalCelebration();
    setActionPlayerId(null);
    setAssistPickerFor(playerId);
  }

  function handleLogAssist(scorerPlayerId: string, assistPlayerId: string | null) {
    if (assistPlayerId) recordEvent(match!.id, "assist", assistPlayerId, scorerPlayerId);
    setAssistPickerFor(null);
  }

  function confirmSubstitution(playerOffId: string, playerOnId: string) {
    makeSubstitution(match!.id, playerOffId, playerOnId);
    setSubOffId(null);
    setSuggestions(null);
  }

  const periodLabel = match.periodType === "quarters" ? `Q${match.currentPeriod}` : `H${match.currentPeriod}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.scoreHeader}>
        <Text style={styles.scoreTeam}>{team.name}</Text>
        <Text style={styles.scoreValue}>{match.teamScore} - {match.oppositionScore}</Text>
        <Text style={styles.scoreTeam}>{match.opposition}</Text>
      </View>

      <View style={styles.clockRow}>
        <Text style={styles.periodLabel}>{periodLabel} / {totalPeriods(match)}</Text>
        <Text style={styles.clock}>{formatClock(getTotalMatchSeconds(match))}</Text>
        <Text style={styles.periodLabel}>min {currentPeriodMinute(match)}</Text>
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          style={styles.oppScoreButton}
          onPress={() => adjustOppositionScore(match.id, 1)}
          onLongPress={() => adjustOppositionScore(match.id, -1)}
        >
          <Text style={styles.oppScoreButtonText}>+ Opposition goal</Text>
        </Pressable>
        {match.status === "live" ? (
          <Pressable style={styles.endPeriodButton} onPress={handleEndPeriod}>
            <Text style={styles.endPeriodButtonText}>
              {isFinalPeriod(match) ? "End match" : `End ${match.periodType === "quarters" ? "quarter" : "half"}`}
            </Text>
          </Pressable>
        ) : (
          <Pressable style={styles.endPeriodButton} onPress={() => startNextPeriod(match.id)}>
            <Text style={styles.endPeriodButtonText}>Start next {match.periodType === "quarters" ? "quarter" : "half"}</Text>
          </Pressable>
        )}
      </View>

      <Pressable style={styles.recommendButton} onPress={handleShowRecommendation}>
        <Text style={styles.recommendButtonText}>🔁 Recommend a substitution</Text>
      </Pressable>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
        <Text style={styles.sectionTitle}>On the pitch</Text>
        {onFieldEntries.map((entry) => {
          const player = playerById.get(entry.playerId);
          if (!player) return null;
          return (
            <Pressable key={entry.playerId} style={styles.playerRow} onPress={() => setActionPlayerId(entry.playerId)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.playerName}>{player.firstName} {player.lastName}</Text>
                <Text style={styles.mutedText}>{entry.currentPosition}</Text>
              </View>
              <Text style={styles.playerMinutes}>{formatClock(getPlayerLiveSeconds(entry, match))}</Text>
            </Pressable>
          );
        })}

        <Text style={styles.sectionTitle}>Bench</Text>
        {benchEntries.map((entry) => {
          const player = playerById.get(entry.playerId);
          if (!player) return null;
          return (
            <Pressable key={entry.playerId} style={styles.playerRowBench} onPress={() => setSubOffId(null)}>
              <Text style={styles.playerName}>{player.firstName} {player.lastName}</Text>
              <Text style={styles.mutedText}>{formatClock(getPlayerLiveSeconds(entry, match))} played</Text>
            </Pressable>
          );
        })}

        <Text style={styles.sectionTitle}>Match events</Text>
        {[...match.events].reverse().map((ev) => {
          const p = ev.playerId ? playerById.get(ev.playerId) : undefined;
          const related = ev.relatedPlayerId ? playerById.get(ev.relatedPlayerId) : undefined;
          return (
            <View key={ev.id} style={styles.eventRow}>
              <Text style={styles.mutedText}>{ev.minute}'</Text>
              <Text style={styles.eventText}>{describeEvent(ev.type, p, related)}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Player action sheet: goal / card / substitute */}
      <Modal visible={!!actionPlayerId} transparent animationType="fade" onRequestClose={() => setActionPlayerId(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setActionPlayerId(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>
              {playerById.get(actionPlayerId ?? "")?.firstName} {playerById.get(actionPlayerId ?? "")?.lastName}
            </Text>
            <ActionRow label="⚽ Goal" onPress={() => actionPlayerId && handleLogGoal(actionPlayerId)} />
            <ActionRow label="🟨 Yellow card" onPress={() => { if (actionPlayerId) recordEvent(match.id, "yellow_card", actionPlayerId); setActionPlayerId(null); }} />
            <ActionRow label="🟥 Red card" onPress={() => { if (actionPlayerId) recordEvent(match.id, "red_card", actionPlayerId); setActionPlayerId(null); }} />
            <ActionRow
              label="🔁 Substitute off"
              onPress={() => { setSubOffId(actionPlayerId); setActionPlayerId(null); }}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Assist picker after a goal */}
      <Modal visible={!!assistPickerFor} transparent animationType="fade" onRequestClose={() => setAssistPickerFor(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => handleLogAssist(assistPickerFor!, null)}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Who assisted?</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {onFieldEntries
                .filter((e) => e.playerId !== assistPickerFor)
                .map((e) => {
                  const p = playerById.get(e.playerId);
                  if (!p) return null;
                  return (
                    <Pressable key={e.playerId} style={styles.playerRow} onPress={() => handleLogAssist(assistPickerFor!, e.playerId)}>
                      <Text style={styles.playerName}>{p.firstName} {p.lastName}</Text>
                    </Pressable>
                  );
                })}
            </ScrollView>
            <Pressable onPress={() => handleLogAssist(assistPickerFor!, null)}>
              <Text style={styles.linkText}>No assist</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Manual substitution: pick who comes on */}
      <Modal visible={!!subOffId} transparent animationType="fade" onRequestClose={() => setSubOffId(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSubOffId(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Who's coming on?</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {benchEntries.map((e) => {
                const p = playerById.get(e.playerId);
                if (!p) return null;
                return (
                  <Pressable key={e.playerId} style={styles.playerRow} onPress={() => confirmSubstitution(subOffId!, e.playerId)}>
                    <Text style={styles.playerName}>{p.firstName} {p.lastName}</Text>
                    <Text style={styles.mutedText}>{p.primaryPositions.join(", ")}</Text>
                  </Pressable>
                );
              })}
              {benchEntries.length === 0 && <Text style={styles.mutedText}>No one left on the bench.</Text>}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Recommended substitutions */}
      <Modal visible={!!suggestions} transparent animationType="fade" onRequestClose={() => setSuggestions(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSuggestions(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Time to make a change</Text>
            {suggestions?.map((sug) => {
              const off = playerById.get(sug.playerOffId);
              const on = playerById.get(sug.playerOnId);
              return (
                <View key={`${sug.playerOffId}-${sug.playerOnId}`} style={styles.suggestionCard}>
                  <Text style={styles.suggestionText}>
                    {off?.firstName} ➜ off, {on?.firstName} ➜ on
                  </Text>
                  <Text style={styles.mutedText}>{sug.reason}</Text>
                  <View style={styles.suggestionActions}>
                    <Pressable style={styles.manualButton} onPress={() => { setSubOffId(sug.playerOffId); setSuggestions(null); }}>
                      <Text style={styles.manualButtonText}>Choose manually</Text>
                    </Pressable>
                    <Pressable style={styles.autoButton} onPress={() => confirmSubstitution(sug.playerOffId, sug.playerOnId)}>
                      <Text style={styles.autoButtonText}>Auto change</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
            <Pressable onPress={() => setSuggestions(null)}>
              <Text style={styles.linkText}>Dismiss</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function describeEvent(type: string, player?: Player, related?: Player): string {
  switch (type) {
    case "goal": return `⚽ Goal - ${player?.firstName ?? "?"}`;
    case "assist": return `🅰️ Assist - ${player?.firstName ?? "?"} (for ${related?.firstName ?? "?"})`;
    case "yellow_card": return `🟨 Yellow card - ${player?.firstName ?? "?"}`;
    case "red_card": return `🟥 Red card - ${player?.firstName ?? "?"}`;
    case "substitution": return `🔁 ${player?.firstName ?? "?"} on for ${related?.firstName ?? "?"}`;
    case "own_goal": return `⚠️ Own goal - ${player?.firstName ?? "?"}`;
    default: return type;
  }
}

function ActionRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.actionRow} onPress={onPress}>
      <Text style={styles.actionRowText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pitch },
  mutedText: { color: colors.textMuted, fontSize: 13 },
  kickoffWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.sm },
  kickoffOpp: { fontSize: 26, fontWeight: "800", color: colors.textOnDark },
  kickoffButton: { marginTop: spacing.xl, backgroundColor: colors.accent, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill },
  kickoffButtonText: { fontSize: 18, fontWeight: "800", color: colors.pitch },
  linkText: { color: colors.textOnDark, textDecorationLine: "underline", marginTop: spacing.md, textAlign: "center" },
  scoreHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  scoreTeam: { color: colors.textOnDark, fontWeight: "700", flex: 1 },
  scoreValue: { color: colors.accent, fontSize: 28, fontWeight: "800" },
  clockRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  periodLabel: { color: colors.textOnDark, opacity: 0.8, fontSize: 12 },
  clock: { color: colors.textOnDark, fontSize: 40, fontWeight: "800", fontVariant: ["tabular-nums"] },
  controlsRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  oppScoreButton: { flex: 1, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.textOnDark, alignItems: "center" },
  oppScoreButtonText: { color: colors.textOnDark, fontWeight: "600", fontSize: 13 },
  endPeriodButton: { flex: 1, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.danger, alignItems: "center" },
  endPeriodButtonText: { color: colors.textOnDark, fontWeight: "700", fontSize: 13 },
  recommendButton: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: "center" },
  recommendButtonText: { color: colors.pitch, fontWeight: "800" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.textOnDark, marginTop: spacing.lg, marginBottom: spacing.sm },
  playerRow: {
    backgroundColor: "rgba(255,255,255,0.08)", borderRadius: radius.sm, padding: spacing.md,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs,
  },
  playerRowBench: {
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: radius.sm, padding: spacing.md,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs,
  },
  playerName: { fontSize: 15, fontWeight: "700", color: colors.textOnDark },
  playerMinutes: { color: colors.accent, fontWeight: "700", fontVariant: ["tabular-nums"] },
  eventRow: { flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.xs },
  eventText: { color: colors.textOnDark, fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.lg },
  modalCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg },
  actionRow: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  actionRowText: { fontSize: 16, fontWeight: "600", color: colors.text },
  suggestionCard: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  suggestionText: { fontSize: 15, fontWeight: "700", color: colors.text },
  suggestionActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  manualButton: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  manualButtonText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  autoButton: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.pitch, alignItems: "center" },
  autoButtonText: { color: colors.textOnDark, fontWeight: "700", fontSize: 13 },
});
