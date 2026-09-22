import { useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, ScrollView, Switch, Alert } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTeamStore } from "@/store/teamStore";
import { useMatchStore } from "@/store/matchStore";
import { colors, spacing, radius } from "@/constants/theme";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export default function Matches() {
  const team = useTeamStore((s) => s.team);
  const matches = useMatchStore((s) => s.matches.filter((m) => m.teamId === team?.id));
  const createMatch = useMatchStore((s) => s.createMatch);

  const [modalVisible, setModalVisible] = useState(false);
  const [opposition, setOpposition] = useState("");
  const [location, setLocation] = useState("");
  const [isHome, setIsHome] = useState(true);
  const [kickOffDate, setKickOffDate] = useState(""); // yyyy-mm-dd
  const [kickOffTime, setKickOffTime] = useState(""); // HH:mm

  const sorted = [...matches].sort((a, b) => new Date(b.kickOff).getTime() - new Date(a.kickOff).getTime());

  function resetForm() {
    setOpposition(""); setLocation(""); setIsHome(true); setKickOffDate(""); setKickOffTime("");
  }

  function handleCreate() {
    if (!team) return;
    if (!opposition.trim()) {
      Alert.alert("Opposition team required", "Enter who you're playing before creating the match.");
      return;
    }
    if (!DATE_REGEX.test(kickOffDate)) {
      Alert.alert("Date required", "Enter the match date as YYYY-MM-DD, e.g. 2026-09-27.");
      return;
    }
    const kickOff = new Date(`${kickOffDate}T${kickOffTime || "10:00"}:00`);
    if (Number.isNaN(kickOff.getTime())) {
      Alert.alert("Invalid date or time", "Check the date (YYYY-MM-DD) and kick-off time (HH:MM) are valid.");
      return;
    }
    const match = createMatch({
      teamId: team.id,
      opposition: opposition.trim(),
      location: location.trim() || undefined,
      kickOff: kickOff.toISOString(),
      isHome,
      format: team.format,
      periodType: team.periodType,
      minutesPerPeriod: team.minutesPerPeriod,
      squadPlayerIds: [],
    });
    resetForm();
    setModalVisible(false);
    router.push(`/match/${match.id}/setup`);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Matches</Text>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.mutedText}>No matches yet - create your first fixture.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.matchCard}
            onPress={() =>
              router.push(item.status === "scheduled" ? `/match/${item.id}/setup`
                : item.status === "completed" ? `/match/${item.id}/summary`
                : `/match/${item.id}/live`)
            }
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.matchOpp}>{item.isHome ? "vs" : "@"} {item.opposition}</Text>
              <Text style={styles.mutedText}>
                {new Date(item.kickOff).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
                {item.location ? ` · ${item.location}` : ""}
              </Text>
            </View>
            <StatusBadge status={item.status} teamScore={item.teamScore} oppScore={item.oppositionScore} />
          </Pressable>
        )}
      />

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+ New match</Text>
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
            <Text style={styles.headerTitle}>New match</Text>

            <Text style={styles.label}>Opposition team</Text>
            <TextInput style={styles.input} value={opposition} onChangeText={setOpposition} placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Location</Text>
            <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="e.g. Oakfield Rec Ground" placeholderTextColor={colors.textMuted} />

            <View style={styles.switchRow}>
              <Text style={styles.label}>Home fixture</Text>
              <Switch value={isHome} onValueChange={setIsHome} />
            </View>

            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={kickOffDate} onChangeText={setKickOffDate} placeholder="2026-09-27" placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Kick-off time (24hr HH:MM)</Text>
            <TextInput style={styles.input} value={kickOffTime} onChangeText={setKickOffTime} placeholder="10:00" placeholderTextColor={colors.textMuted} />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={() => { resetForm(); setModalVisible(false); }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={handleCreate}>
                <Text style={styles.saveButtonText}>Create & set up squad</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function StatusBadge({ status, teamScore, oppScore }: { status: string; teamScore: number; oppScore: number }) {
  if (status === "completed") {
    return <Text style={styles.scoreText}>{teamScore} - {oppScore}</Text>;
  }
  const label = status === "live" ? "LIVE" : status === "paused" ? "PAUSED" : "UPCOMING";
  return (
    <View style={[styles.badge, status === "live" && styles.badgeLive]}>
      <Text style={[styles.badgeText, status === "live" && styles.badgeTextLive]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: 0 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: colors.text },
  mutedText: { color: colors.textMuted, fontSize: 13 },
  matchCard: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1,
    borderColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  matchOpp: { fontSize: 16, fontWeight: "700", color: colors.text },
  scoreText: { fontSize: 18, fontWeight: "800", color: colors.pitch },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.border },
  badgeLive: { backgroundColor: colors.danger },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  badgeTextLive: { color: colors.textOnDark },
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
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md },
  modalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl },
  cancelButton: { flex: 1, padding: spacing.md, borderRadius: radius.md, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  cancelButtonText: { color: colors.textMuted, fontWeight: "600" },
  saveButton: { flex: 1, padding: spacing.md, borderRadius: radius.md, alignItems: "center", backgroundColor: colors.pitch },
  saveButtonText: { color: colors.textOnDark, fontWeight: "700" },
});
