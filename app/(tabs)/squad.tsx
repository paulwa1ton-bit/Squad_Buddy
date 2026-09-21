import { useMemo, useState } from "react";
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
  const [tab, setTab] = useState<"players" | "formations">("players");

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
        </View>
      </View>
      {tab === "players" ? <PlayersPanel /> : <FormationsPanel />}
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
                <Text style={styles.playerStatText}>{totals.appearances} apps</Text>
                <Text style={styles.playerStatText}>{totals.goals}⚽ {totals.assists}🅰️</Text>
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
        <View key={f.id} style={styles.formationCard}>
          <Text style={styles.playerName}>{f.name}</Text>
          <Text style={styles.mutedText}>{f.format} · {f.isPreset ? "Preset" : "Custom"}</Text>
        </View>
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
  playerStats: { alignItems: "flex-end", gap: 2 },
  playerStatText: { fontSize: 12, color: colors.textMuted },
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
});
