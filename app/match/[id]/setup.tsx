import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTeamStore } from "@/store/teamStore";
import { useMatchStore } from "@/store/matchStore";
import { useParentStore } from "@/store/parentStore";
import { watchInvitesForMatch } from "@/lib/parentSync";
import { PitchView } from "@/components/PitchView";
import { Player, PlayingPosition, RsvpStatus } from "@/types/models";
import { colors, spacing, radius } from "@/constants/theme";

const RSVP_LABEL: Record<RsvpStatus, string> = {
  pending: "⏳ Awaiting reply",
  accepted: "✅ Accepted",
  declined: "❌ Declined",
};

export default function MatchSetup() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const match = useMatchStore((s) => s.matches.find((m) => m.id === id));
  const updateMatchSquad = useMatchStore((s) => s.updateMatchSquad);
  const updateMatchFormation = useMatchStore((s) => s.updateMatchFormation);
  const setLineup = useMatchStore((s) => s.setLineup);
  const markParentsNotified = useMatchStore((s) => s.markParentsNotified);

  const team = useTeamStore((s) => s.team);
  const players = useTeamStore((s) => s.players.filter((p) => !p.archived));
  const formations = useTeamStore((s) => s.formations.filter((f) => f.teamId === team?.id));

  const sendMatchInvites = useParentStore((s) => s.sendMatchInvites);
  const invitesForMatch = useParentStore((s) => (match ? s.invitesForMatch(match.id) : []));

  useEffect(() => {
    if (!match) return undefined;
    return watchInvitesForMatch(match.id);
  }, [match?.id]);

  const [step, setStep] = useState<"squad" | "formation" | "lineup">("squad");
  const [selectedSquad, setSelectedSquad] = useState<Set<string>>(new Set(match?.squadPlayerIds));
  const [formationId, setFormationId] = useState<string | undefined>(match?.formationId);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [notified, setNotified] = useState(false);

  const selectedFormation = formations.find((f) => f.id === formationId);
  const squadPlayers = useMemo(
    () => players.filter((p) => selectedSquad.has(p.id)),
    [players, selectedSquad],
  );

  if (!match || !team) {
    return (
      <View style={styles.container}>
        <Text style={styles.mutedText}>Match not found.</Text>
      </View>
    );
  }
  // Narrowing above doesn't carry into the function declarations below (they
  // could in principle be called from anywhere), so bind a definitely-typed
  // alias here instead of asserting `match!` everywhere.
  const currentMatch = match;

  function toggleSquadPlayer(playerId: string) {
    setSelectedSquad((s) => {
      const next = new Set(s);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  function assignPlayerToSlot(playerId: string) {
    if (!activeSlotId) return;
    setAssignments((a) => {
      const next = { ...a };
      // A player can only occupy one slot at a time.
      for (const slotId of Object.keys(next)) {
        if (next[slotId] === playerId) delete next[slotId];
      }
      next[activeSlotId] = playerId;
      return next;
    });
    setActiveSlotId(null);
  }

  function playerForSlot(slotId: string): Player | undefined {
    const playerId = assignments[slotId];
    return players.find((p) => p.id === playerId);
  }

  function handleNotifyParents() {
    const parentsByPlayerId: Record<string, string> = {};
    for (const p of squadPlayers) {
      if (p.parentId) parentsByPlayerId[p.id] = p.parentId;
    }
    const withParents = Object.keys(parentsByPlayerId).length;
    if (withParents === 0) {
      Alert.alert("No linked parents", "None of the selected players have a linked parent account yet.");
      return;
    }
    sendMatchInvites({
      matchId: currentMatch.id,
      playerIds: Object.keys(parentsByPlayerId),
      parentsByPlayerId,
      opposition: currentMatch.opposition,
      kickOff: currentMatch.kickOff,
      location: currentMatch.location,
      minutesPerPeriod: currentMatch.minutesPerPeriod,
    });
    markParentsNotified(currentMatch.id, Object.values(parentsByPlayerId));
    setNotified(true);
    Alert.alert("Parents notified", `Sent ${withParents} match invite${withParents === 1 ? "" : "s"}.`);
  }

  function handleContinueToMatchDay() {
    updateMatchSquad(currentMatch.id, Array.from(selectedSquad));
    if (formationId) updateMatchFormation(currentMatch.id, formationId);
    const starters = Object.entries(assignments)
      .map(([slotId, playerId]) => {
        const slot = selectedFormation?.slots.find((s) => s.id === slotId);
        return slot ? { playerId, position: slot.position, slotId } : null;
      })
      .filter((x): x is { playerId: string; position: PlayingPosition; slotId: string } => !!x);
    setLineup(currentMatch.id, starters);
    router.replace(`/match/${currentMatch.id}/live`);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
      <View style={styles.matchInfoCard}>
        <Text style={styles.matchInfoOpp}>{match.isHome ? "vs" : "@"} {match.opposition}</Text>
        <Text style={styles.matchInfoMeta}>
          {new Date(match.kickOff).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </Text>
        <Text style={styles.matchInfoMeta}>
          {match.format} · {match.minutesPerPeriod} min {match.periodType} {match.location ? `· ${match.location}` : ""}
        </Text>
      </View>

      <View style={styles.stepTabs}>
        {(["squad", "formation", "lineup"] as const).map((s, i) => (
          <Pressable key={s} style={[styles.stepTab, step === s && styles.stepTabActive]} onPress={() => setStep(s)}>
            <Text style={[styles.stepTabText, step === s && styles.stepTabTextActive]}>
              {i + 1}. {s === "squad" ? "Squad" : s === "formation" ? "Formation" : "Lineup"}
            </Text>
          </Pressable>
        ))}
      </View>

      {step === "squad" && (
        <View>
          <Text style={styles.sectionTitle}>Select the squad ({selectedSquad.size} selected)</Text>
          {players.length === 0 && (
            <View>
              <Text style={styles.mutedText}>No players yet - add players to your squad before picking a matchday squad.</Text>
              <Pressable style={styles.notifyButton} onPress={() => router.push("/(tabs)/squad")}>
                <Text style={styles.notifyButtonText}>Go to Squad tab</Text>
              </Pressable>
            </View>
          )}
          {players.map((p) => {
            const selected = selectedSquad.has(p.id);
            const invite = invitesForMatch.find((i) => i.playerId === p.id);
            return (
              <Pressable key={p.id} style={[styles.playerRow, selected && styles.playerRowSelected]} onPress={() => toggleSquadPlayer(p.id)}>
                <View>
                  <Text style={styles.playerName}>{p.firstName} {p.lastName}</Text>
                  {invite && <Text style={styles.mutedText}>{RSVP_LABEL[invite.status]}</Text>}
                </View>
                <Text style={styles.mutedText}>{selected ? "✓ In squad" : "Tap to add"}</Text>
              </Pressable>
            );
          })}

          <Pressable style={styles.notifyButton} onPress={handleNotifyParents}>
            <Text style={styles.notifyButtonText}>{notified ? "Re-notify parents" : "🔔 Notify parents of squad selection"}</Text>
          </Pressable>
        </View>
      )}

      {step === "formation" && (
        <View>
          <Text style={styles.sectionTitle}>Choose a formation ({team.format})</Text>
          {formations.length === 0 && (
            <Text style={styles.mutedText}>No formations yet - add one from the Squad tab first.</Text>
          )}
          {formations.map((f) => (
            <Pressable key={f.id} style={[styles.playerRow, formationId === f.id && styles.playerRowSelected]} onPress={() => setFormationId(f.id)}>
              <Text style={styles.playerName}>{f.name}</Text>
              <Text style={styles.mutedText}>{formationId === f.id ? "✓ Selected" : "Tap to select"}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {step === "lineup" && selectedFormation && (
        <View>
          <Text style={styles.sectionTitle}>Arrange your starting {selectedFormation.slots.length}</Text>
          <Text style={styles.mutedText}>Tap a position, then pick a player from your squad.</Text>
          <View style={{ marginTop: spacing.md }}>
            <PitchView
              formation={selectedFormation}
              playerBySlotId={Object.fromEntries(selectedFormation.slots.map((s) => [s.id, playerForSlot(s.id)]))}
              onSlotPress={(slotId) => setActiveSlotId(slotId)}
              highlightSlotId={activeSlotId ?? undefined}
            />
          </View>
        </View>
      )}
      {step === "lineup" && !selectedFormation && (
        <Text style={styles.mutedText}>Choose a formation first.</Text>
      )}

      <Pressable style={styles.continueButton} onPress={handleContinueToMatchDay}>
        <Text style={styles.continueButtonText}>Continue to Match Day</Text>
      </Pressable>

      <Modal visible={!!activeSlotId} transparent animationType="fade" onRequestClose={() => setActiveSlotId(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setActiveSlotId(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Pick a player</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {squadPlayers
                .filter((p) => !Object.values(assignments).includes(p.id) || assignments[activeSlotId ?? ""] === p.id)
                .map((p) => (
                  <Pressable key={p.id} style={styles.playerRow} onPress={() => assignPlayerToSlot(p.id)}>
                    <Text style={styles.playerName}>{p.firstName} {p.lastName}</Text>
                    <Text style={styles.mutedText}>{p.primaryPositions.join(", ")}</Text>
                  </Pressable>
                ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mutedText: { color: colors.textMuted, fontSize: 13 },
  matchInfoCard: { backgroundColor: colors.pitch, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  matchInfoOpp: { fontSize: 20, fontWeight: "800", color: colors.textOnDark },
  matchInfoMeta: { color: colors.textOnDark, opacity: 0.85, marginTop: 2 },
  stepTabs: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.md },
  stepTab: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  stepTabActive: { backgroundColor: colors.pitch, borderColor: colors.pitch },
  stepTabText: { fontSize: 12, fontWeight: "600", color: colors.text },
  stepTabTextActive: { color: colors.textOnDark },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  playerRow: {
    backgroundColor: colors.card, borderRadius: radius.sm, padding: spacing.md, borderWidth: 1,
    borderColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: spacing.xs,
  },
  playerRowSelected: { borderColor: colors.pitch, backgroundColor: "#EAF3EC" },
  playerName: { fontSize: 15, fontWeight: "600", color: colors.text },
  notifyButton: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: "center" },
  notifyButtonText: { fontWeight: "700", color: colors.pitch },
  continueButton: { marginTop: spacing.xl, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.pitch, alignItems: "center" },
  continueButtonText: { color: colors.textOnDark, fontWeight: "700", fontSize: 16 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: spacing.lg },
  modalCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg },
});
