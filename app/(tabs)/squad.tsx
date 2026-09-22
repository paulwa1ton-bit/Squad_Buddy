import { useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTeamStore } from "@/store/teamStore";
import { useMatchStore } from "@/store/matchStore";
import { Player, PlayingPosition } from "@/types/models";
import { getPresetsForFormat } from "@/data/formationPresets";
import { colors, spacing, radius } from "@/constants/theme";

const ALL_POSITIONS: PlayingPosition[] = [
  "GK", "LB", "CB", "RB", "LWB", "RWB", "SW",
  "CDM", "CM", "LM", "RM", "CAM",
  "LW", "RW", "ST", "CF",
];

export default function Squad() {
  const [tab, setTab] = useState<"players" | "formations" | "stats">("players");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Squad</Text>
        <View style={styles.segmentRow}>
          <Pressable style={[styles.segment, tab === "players" && styles.segmentActive]} onPress={() => setTab("players")}>
            <Text style={[styles.segmentText, tab === "players" && styles.segmentTextActive]}>Players</Text>
          </Pressable>
          <Pressable style={[styles.segment, tab === "formations" && styles.segmentActive]} onPress={() => setTab("formations")}>
            <Text style={[styles.segmentText, tab === "formations" && styles.segmentTextActive]}>Formations</Text>
          </Pressable>
          <Pressable style={[styles.segment, tab === "stats" && styles.segmentActive]} onPress={() => setTab("stats")}>
            <Text style={[styles.segmentText, tab === "stats" && styles.segmentTextActive]}>Stats</Text>
          </Pressable>
        </View>
      </View>
      {tab === "players" ? <PlayersPanel /> : tab === "formations" ? <FormationsPanel /> : <AnalyticsPanel />}
    </SafeAreaView>
  );
}

function PlayersPanel() {
  const team = useTeamStore((s) => s.team);
  const players = useTeamStore((s) => s.players.filter((p) => !p.archived));
  const addPlayer = useTeamStore((s) => s.addPlayer);
  const getSeasonTotals = useMatchStore((s) => s.getSeasonTotals);

  const [modalVisible, setModalVisible] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [shirtNumber, setShirtNumber] = useState("");
  const [positions, setPositions] = useState<PlayingPosition[]>([]);

  function togglePosition(pos: PlayingPosition) {
    setPositions((s) => (s.includes(pos) ? s.filter((p) => p !== pos) : [...s, pos]));
  }

  function resetForm() {
    setFirstName(""); setLastName(""); setShirtNumber(""); setPositions([]);
  }

  function handleAdd() {
    if (!firstName.trim() || !lastName.trim()) return;
    addPlayer({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      shirtNumber: shirtNumber ? Number(shirtNumber) : undefined,
      primaryPositions: positions,
    });
    resetForm();
    setModalVisible(false);
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={players}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.mutedText}>No players yet - tap "Add player" to build your squad.</Text>
        }
        renderItem={({ item }) => {
          const totals = getSeasonTotals(team?.id ?? "", item.id);
          return (
            <Pressable style={styles.playerCard} onPress={() => router.push(`/player/${item.id}`)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.playerName}>
                  {item.shirtNumber ? `#${item.shirtNumber} ` : ""}{item.firstName} {item.lastName}
                </Text>
                <Text style={styles.mutedText}>
                  {item.primaryPositions.length > 0 ? item.primaryPositions.join(" / ") : "No position set"}
                </Text>
              </View>
              <View style={styles.playerStats}>
                <Text style={styles.playerStatText}><Text style={styles.playerStatValue}>{totals.appearances}</Text> apps</Text>
                <Text style={styles.playerStatText}><Text style={styles.playerStatValue}>{totals.goals}</Text> goals</Text>
                <Text style={styles.playerStatText}><Text style={styles.playerStatValue}>{totals.assists}</Text> assists</Text>
              </View>
            </Pressable>
          );
        }}
      />

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+ Add player</Text>
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
            <Text style={styles.headerTitle}>Add player</Text>

            <Text style={styles.label}>First name</Text>
            <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Last name</Text>
            <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Shirt number (optional)</Text>
            <TextInput style={styles.input} value={shirtNumber} onChangeText={setShirtNumber} keyboardType="number-pad" placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Playing positions (select all that apply)</Text>
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
              <Pressable style={styles.cancelButton} onPress={() => { resetForm(); setModalVisible(false); }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={handleAdd}>
                <Text style={styles.saveButtonText}>Save player</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function FormationsPanel() {
  const team = useTeamStore((s) => s.team);
  const formations = useTeamStore((s) => s.formations);
  const adoptFormationPreset = useTeamStore((s) => s.adoptFormationPreset);

  const presets = useMemo(() => (team ? getPresetsForFormat(team.format) : []), [team]);
  const myFormations = formations.filter((f) => f.teamId === team?.id);

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
      <Text style={styles.sectionTitle}>Your formations</Text>
      {myFormations.length === 0 && (
        <Text style={styles.mutedText}>Adopt a preset below or build your own.</Text>
      )}
      {myFormations.map((f) => (
        <Pressable
          key={f.id}
          style={styles.formationCard}
          onPress={() => router.push({ pathname: "/formation-builder", params: { formationId: f.id } })}
        >
          <Text style={styles.playerName}>{f.name}</Text>
          <Text style={styles.mutedText}>{f.format} · Tap to edit</Text>
        </Pressable>
      ))}

      <Pressable
        style={styles.customButton}
        onPress={() => router.push({ pathname: "/formation-builder", params: { format: team?.format ?? "7v7" } })}
      >
        <Text style={styles.customButtonText}>+ Build a custom formation</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>FA-standard {team?.format} presets</Text>
      {presets.map((p) => (
        <Pressable key={p.id} style={styles.formationCard} onPress={() => adoptFormationPreset(p.id)}>
          <Text style={styles.playerName}>{p.name}</Text>
          <Text style={styles.mutedText}>Tap to add this to your team's formations</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

interface AnalyticsRow {
  playerId: string;
  name: string;
  appearances: number;
  avgMinutes: number | null;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPerGoal: number | null;
}

const STAT_COLUMNS: { key: "appearances" | "avgMinutes" | "goals" | "assists" | "yellowCards" | "redCards" | "minutesPerGoal"; label: string }[] = [
  { key: "appearances", label: "GP" },
  { key: "avgMinutes", label: "Avg Min" },
  { key: "goals", label: "Goals" },
  { key: "assists", label: "Assists" },
  { key: "yellowCards", label: "YC" },
  { key: "redCards", label: "RC" },
  { key: "minutesPerGoal", label: "Min/Goal" },
];

function AnalyticsPanel() {
  const team = useTeamStore((s) => s.team);
  const players = useTeamStore((s) => s.players.filter((p) => !p.archived));
  const getSeasonTotals = useMatchStore((s) => s.getSeasonTotals);

  const headerScrollRef = useRef<ScrollView>(null);
  const nameColScrollRef = useRef<ScrollView>(null);

  const rows = useMemo<AnalyticsRow[]>(() => {
    if (!team) return [];
    return players
      .map((p) => {
        const totals = getSeasonTotals(team.id, p.id);
        return {
          playerId: p.id,
          name: `${p.firstName} ${p.lastName}`,
          appearances: totals.appearances,
          goals: totals.goals,
          assists: totals.assists,
          yellowCards: totals.yellowCards,
          redCards: totals.redCards,
          avgMinutes: totals.appearances > 0 ? Math.round(totals.minutesPlayed / totals.appearances) : null,
          minutesPerGoal: totals.goals > 0 ? Math.round(totals.minutesPlayed / totals.goals) : null,
        };
      })
      .sort((a, b) => b.goals - a.goals || b.appearances - a.appearances || a.name.localeCompare(b.name));
  }, [players, team, getSeasonTotals]);

  if (rows.length === 0) {
    return (
      <View style={{ padding: spacing.lg }}>
        <Text style={styles.mutedText}>No players yet - add players to see squad analytics.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: spacing.lg }}>
      <Text style={styles.sectionTitle}>Season analytics</Text>
      <Text style={styles.mutedText}>Based on completed matches only. Tap a player to view their profile.</Text>

      <View style={styles.tableWrap}>
        {/* Header row: the "Player" corner is truly fixed; the stat titles scroll
            horizontally in lockstep with the body below (driven, not touchable). */}
        <View style={{ flexDirection: "row" }}>
          <View style={[styles.statsRow, styles.statsHeaderRow, styles.statsNameCell]}>
            <Text style={styles.statsHeaderText}>Player</Text>
          </View>
          <ScrollView
            ref={headerScrollRef}
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
          >
            <View style={[styles.statsRow, styles.statsHeaderRow]}>
              {STAT_COLUMNS.map((col) => (
                <Text key={col.key} style={[styles.statsCell, styles.statsHeaderText]}>{col.label}</Text>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Body: the name column is fixed and scrolls vertically only (driven);
            the stat grid scrolls both ways and drives the header/name column. */}
        <View style={{ flex: 1, flexDirection: "row" }}>
          <ScrollView ref={nameColScrollRef} style={{ width: 140 }} scrollEnabled={false} showsVerticalScrollIndicator={false}>
            {rows.map((r, i) => (
              <Pressable
                key={r.playerId}
                style={[styles.statsRow, styles.statsNameCell, i % 2 === 1 && styles.statsRowAlt]}
                onPress={() => router.push(`/player/${r.playerId}`)}
              >
                <Text style={styles.statsNameText} numberOfLines={1}>{r.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView
            horizontal
            style={{ flex: 1 }}
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            onScroll={(e) => headerScrollRef.current?.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false })}
            scrollEventThrottle={16}
          >
            <ScrollView
              style={{ width: STAT_COLUMNS.length * 76 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              onScroll={(e) => nameColScrollRef.current?.scrollTo({ y: e.nativeEvent.contentOffset.y, animated: false })}
              scrollEventThrottle={16}
            >
              {rows.map((r, i) => (
                <Pressable
                  key={r.playerId}
                  style={[styles.statsRow, i % 2 === 1 && styles.statsRowAlt]}
                  onPress={() => router.push(`/player/${r.playerId}`)}
                >
                  {STAT_COLUMNS.map((col) => (
                    <Text key={col.key} style={styles.statsCell}>{r[col.key] ?? "-"}</Text>
                  ))}
                </Pressable>
              ))}
            </ScrollView>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  headerTitle: { fontSize: 24, fontWeight: "800", color: colors.text, marginBottom: spacing.sm },
  segmentRow: { flexDirection: "row", gap: spacing.sm },
  segment: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  segmentActive: { backgroundColor: colors.pitch, borderColor: colors.pitch },
  segmentText: { color: colors.text, fontWeight: "600" },
  segmentTextActive: { color: colors.textOnDark },
  mutedText: { color: colors.textMuted, fontSize: 13 },
  playerCard: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1,
    borderColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  playerName: { fontSize: 16, fontWeight: "700", color: colors.text },
  playerStats: { alignItems: "flex-end", gap: 3, minWidth: 64 },
  playerStatText: { fontSize: 12, color: colors.textMuted, textAlign: "right" },
  playerStatValue: { fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  fab: {
    position: "absolute", bottom: spacing.lg, left: spacing.lg, right: spacing.lg,
    backgroundColor: colors.pitch, borderRadius: radius.md, padding: spacing.md, alignItems: "center",
  },
  fabText: { color: colors.textOnDark, fontWeight: "700", fontSize: 16 },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.card, borderRadius: radius.sm, padding: spacing.md, fontSize: 16,
    borderWidth: 1, borderColor: colors.border, color: colors.text,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.pitch, borderColor: colors.pitch },
  chipText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: colors.textOnDark },
  modalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl },
  cancelButton: { flex: 1, padding: spacing.md, borderRadius: radius.md, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  cancelButtonText: { color: colors.textMuted, fontWeight: "600" },
  saveButton: { flex: 1, padding: spacing.md, borderRadius: radius.md, alignItems: "center", backgroundColor: colors.pitch },
  saveButtonText: { color: colors.textOnDark, fontWeight: "700" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  formationCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  customButton: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderStyle: "dashed", borderColor: colors.pitch, alignItems: "center", marginBottom: spacing.lg },
  customButtonText: { color: colors.pitch, fontWeight: "700" },
  statsRow: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  statsHeaderRow: { borderBottomWidth: 2, borderBottomColor: colors.pitch },
  statsRowAlt: { backgroundColor: colors.card },
  statsCell: { width: 76, color: colors.text, fontSize: 13, textAlign: "center" },
  statsNameCell: { width: 140, paddingHorizontal: spacing.sm },
  statsNameText: { color: colors.text, fontSize: 13, fontWeight: "600", textAlign: "left" },
  statsHeaderText: { fontWeight: "800", color: colors.textMuted, fontSize: 12 },
  tableWrap: {
    flex: 1, marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.card,
  },
});
