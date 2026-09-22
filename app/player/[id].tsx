import { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTeamStore } from "@/store/teamStore";
import { useMatchStore } from "@/store/matchStore";
import { PlayingPosition } from "@/types/models";
import { colors, spacing, radius } from "@/constants/theme";

const ALL_POSITIONS: PlayingPosition[] = [
  "GK", "LB", "CB", "RB", "LWB", "RWB", "SW",
  "CDM", "CM", "LM", "RM", "CAM",
  "LW", "RW", "ST", "CF",
];

export default function PlayerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const team = useTeamStore((s) => s.team);
  const player = useTeamStore((s) => s.players.find((p) => p.id === id));
  const updatePlayer = useTeamStore((s) => s.updatePlayer);
  const archivePlayer = useTeamStore((s) => s.archivePlayer);
  const getSeasonTotals = useMatchStore((s) => s.getSeasonTotals);
  const matches = useMatchStore((s) => s.matches.filter((m) => m.teamId === team?.id && m.status === "completed"));

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(player?.firstName ?? "");
  const [lastName, setLastName] = useState(player?.lastName ?? "");
  const [shirtNumber, setShirtNumber] = useState(player?.shirtNumber?.toString() ?? "");
  const [positions, setPositions] = useState<PlayingPosition[]>(player?.primaryPositions ?? []);

  const totals = useMemo(
    () => (team && player ? getSeasonTotals(team.id, player.id) : null),
    [team, player, getSeasonTotals],
  );

  if (!player || !team) {
    return (
      <View style={styles.container}>
        <Text style={styles.mutedText}>Player not found.</Text>
      </View>
    );
  }

  function togglePosition(pos: PlayingPosition) {
    setPositions((s) => (s.includes(pos) ? s.filter((p) => p !== pos) : [...s, pos]));
  }

  function saveEdits() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Name required", "First and last name can't be empty.");
      return;
    }
    updatePlayer(player!.id, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      shirtNumber: shirtNumber ? Number(shirtNumber) : undefined,
      primaryPositions: positions,
    });
    setEditing(false);
  }

  function cancelEdits() {
    setFirstName(player!.firstName);
    setLastName(player!.lastName);
    setShirtNumber(player!.shirtNumber?.toString() ?? "");
    setPositions(player!.primaryPositions);
    setEditing(false);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.name}>{player.firstName} {player.lastName}</Text>
      <Text style={styles.mutedText}>{team.name} · {team.ageGroup}</Text>

      {!editing ? (
        <>
          <Text style={styles.sectionTitle}>Positions</Text>
          <Text style={styles.bodyText}>
            {player.primaryPositions.length > 0 ? player.primaryPositions.join(", ") : "No positions set"}
          </Text>
          <Pressable style={styles.editButton} onPress={() => setEditing(true)}>
            <Text style={styles.editButtonText}>Edit player details</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.editPanel}>
          <Text style={styles.label}>First name</Text>
          <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />
          <Text style={styles.label}>Last name</Text>
          <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />
          <Text style={styles.label}>Shirt number</Text>
          <TextInput style={styles.input} value={shirtNumber} onChangeText={setShirtNumber} keyboardType="number-pad" />
          <Text style={styles.label}>Positions</Text>
          <View style={styles.chipWrap}>
            {ALL_POSITIONS.map((pos) => {
              const active = positions.includes(pos);
              return (
                <Pressable key={pos} style={[styles.chip, active && styles.chipActive]} onPress={() => togglePosition(pos)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{pos}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.modalActions}>
            <Pressable style={styles.cancelButton} onPress={cancelEdits}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={saveEdits}>
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Season stats</Text>
      {totals && (
        <View style={styles.statsGrid}>
          <Stat label="Appearances" value={totals.appearances} />
          <Stat label="Minutes" value={totals.minutesPlayed} />
          <Stat label="Goals" value={totals.goals} />
          <Stat label="Assists" value={totals.assists} />
          <Stat label="Yellow cards" value={totals.yellowCards} />
          <Stat label="Red cards" value={totals.redCards} />
        </View>
      )}

      <Text style={styles.sectionTitle}>Match history</Text>
      {matches.filter((m) => m.lineup.some((e) => e.playerId === player.id && e.secondsPlayed > 0)).map((m) => {
        const entry = m.lineup.find((e) => e.playerId === player.id)!;
        const goals = m.events.filter((e) => e.type === "goal" && e.playerId === player.id).length;
        const assists = m.events.filter((e) => e.type === "assist" && e.playerId === player.id).length;
        return (
          <View key={m.id} style={styles.matchRow}>
            <Text style={styles.bodyText}>vs {m.opposition}</Text>
            <Text style={styles.mutedText}>
              {Math.round(entry.secondsPlayed / 60)} min · {goals}⚽ {assists}🅰️
            </Text>
          </View>
        );
      })}

      <Pressable
        style={styles.archiveButton}
        onPress={() => { archivePlayer(player.id); router.back(); }}
      >
        <Text style={styles.archiveButtonText}>Remove from squad</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.mutedText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  name: { fontSize: 26, fontWeight: "800", color: colors.text },
  mutedText: { color: colors.textMuted, fontSize: 13 },
  bodyText: { color: colors.text, fontSize: 15, marginTop: spacing.xs },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  editButton: { marginTop: spacing.sm },
  editButtonText: { color: colors.pitch, fontWeight: "600" },
  editPanel: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: spacing.sm, marginBottom: spacing.xs },
  input: { backgroundColor: colors.background, borderRadius: radius.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, color: colors.text },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.pitch, borderColor: colors.pitch },
  chipText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: colors.textOnDark },
  modalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  cancelButton: { flex: 1, padding: spacing.sm, borderRadius: radius.md, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  cancelButtonText: { color: colors.textMuted, fontWeight: "600" },
  saveButton: { flex: 1, padding: spacing.sm, borderRadius: radius.md, alignItems: "center", backgroundColor: colors.pitch },
  saveButtonText: { color: colors.textOnDark, fontWeight: "700" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  statBox: { width: "30%", backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 20, fontWeight: "800", color: colors.pitch },
  matchRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  archiveButton: { marginTop: spacing.xl, alignItems: "center", padding: spacing.md },
  archiveButtonText: { color: colors.danger, fontWeight: "600" },
});
