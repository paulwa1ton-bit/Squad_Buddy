import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";
import { findTeamsByManager, MAX_TEAMS_PER_MANAGER } from "@/lib/firestore/teamsApi";
import { connectToTeam } from "@/lib/teamSync";
import { Team } from "@/types/models";
import { colors, spacing, radius } from "@/constants/theme";

/**
 * Shown when a manager logs in with more than one team, or opens "Switch
 * team" from Settings. Selecting a team makes it the active team on this
 * device (its squad, formations and matches load); it doesn't delete or
 * affect the other team, which stays untouched in Firestore.
 */
export default function TeamSelect() {
  const managerUserId = useAuthStore((s) => s.managerUserId);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const setRemoteTeam = useTeamStore((s) => s.setRemoteTeam);
  const activeTeam = useTeamStore((s) => s.team);

  const [teams, setTeams] = useState<Team[] | null>(null);

  useEffect(() => {
    if (!managerUserId) return;
    findTeamsByManager(managerUserId).then(setTeams).catch(() => setTeams([]));
  }, [managerUserId]);

  function selectTeam(team: Team) {
    setRemoteTeam(team);
    connectToTeam(team.id);
    completeOnboarding();
    router.replace("/(tabs)/home");
  }

  if (!teams) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.pitch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{teams.length === 0 ? "Set up your team" : "Your teams"}</Text>
      <Text style={styles.subtitle}>
        {teams.length === 0
          ? "You don't have a team yet - let's create one."
          : "Pick which team to work on. You can switch back any time from Settings."}
      </Text>

      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        {teams.map((team) => (
          <Pressable
            key={team.id}
            style={[styles.card, activeTeam?.id === team.id && styles.cardActive]}
            onPress={() => selectTeam(team)}
          >
            <Text style={styles.cardTitle}>{team.name}</Text>
            <Text style={styles.cardMeta}>{team.league} · {team.ageGroup} · {team.format}</Text>
            {activeTeam?.id === team.id && <Text style={styles.cardActiveLabel}>Currently active</Text>}
          </Pressable>
        ))}

        {teams.length < MAX_TEAMS_PER_MANAGER && (
          <Pressable style={styles.addButton} onPress={() => router.push("/(onboarding)/team-setup")}>
            <Text style={styles.addButtonText}>{teams.length === 0 ? "+ Create a team" : "+ Add another team"}</Text>
          </Pressable>
        )}
        {teams.length >= MAX_TEAMS_PER_MANAGER && (
          <Text style={styles.limitNote}>
            You've reached the limit of {MAX_TEAMS_PER_MANAGER} teams per manager account.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: "800", color: colors.text, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  subtitle: { fontSize: 14, color: colors.textMuted, paddingHorizontal: spacing.lg, marginTop: spacing.xs },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardActive: { borderColor: colors.pitch, backgroundColor: "#EAF3EC" },
  cardTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  cardMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  cardActiveLabel: { fontSize: 12, color: colors.pitch, fontWeight: "700", marginTop: spacing.xs },
  addButton: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderStyle: "dashed", borderColor: colors.pitch, alignItems: "center" },
  addButtonText: { color: colors.pitch, fontWeight: "700" },
  limitNote: { textAlign: "center", color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
});
