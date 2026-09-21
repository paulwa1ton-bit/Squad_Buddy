import { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTeamStore } from "@/store/teamStore";
import { useMatchStore } from "@/store/matchStore";
import { formatClock } from "@/lib/matchClock";
import { colors, spacing, radius } from "@/constants/theme";

export default function MatchSummary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const match = useMatchStore((s) => s.matches.find((m) => m.id === id));
  const completeMatch = useMatchStore((s) => s.completeMatch);
  const players = useTeamStore((s) => s.players);

  useEffect(() => {
    if (match && match.status !== "completed") {
      completeMatch(match.id);
    }
  }, [match?.id, match?.status, completeMatch]);

  if (!match) {
    return (
      <View style={styles.container}>
        <Text style={styles.mutedText}>Match not found.</Text>
      </View>
    );
  }

  const rows = match.squadPlayerIds
    .map((playerId) => {
      const player = players.find((p) => p.id === playerId);
      const entry = match.lineup.find((e) => e.playerId === playerId);
      if (!player || !entry) return null;
      const goals = match.events.filter((e) => e.type === "goal" && e.playerId === playerId).length;
      const assists = match.events.filter((e) => e.type === "assist" && e.playerId === playerId).length;
      const yellows = match.events.filter((e) => e.type === "yellow_card" && e.playerId === playerId).length;
      const reds = match.events.filter((e) => e.type === "red_card" && e.playerId === playerId).length;
      return { player, entry, goals, assists, yellows, reds };
    })
    .filter((r): r is NonNullable<typeof r> => !!r)
    .sort((a, b) => b.entry.secondsPlayed - a.entry.secondsPlayed);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
      <Text style={styles.resultLine}>Full time</Text>
      <Text style={styles.scoreLine}>{match.teamScore} - {match.oppositionScore}</Text>
      <Text style={styles.mutedText}>vs {match.opposition}</Text>

      <Text style={styles.sectionTitle}>Playing time & stats</Text>
      {rows.map(({ player, entry, goals, assists, yellows, reds }) => (
        <View key={player.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.playerName}>{player.firstName} {player.lastName}</Text>
            <Text style={styles.mutedText}>{formatClock(entry.secondsPlayed)} played</Text>
          </View>
          <Text style={styles.statText}>
            {goals > 0 ? `⚽${goals} ` : ""}{assists > 0 ? `🅰️${assists} ` : ""}
            {yellows > 0 ? `🟨${yellows} ` : ""}{reds > 0 ? `🟥${reds}` : ""}
          </Text>
        </View>
      ))}

      <Pressable style={styles.doneButton} onPress={() => router.replace("/(tabs)/matches")}>
        <Text style={styles.doneButtonText}>Done</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mutedText: { color: colors.textMuted, fontSize: 13 },
  resultLine: { textAlign: "center", color: colors.textMuted, marginTop: spacing.md },
  scoreLine: { textAlign: "center", fontSize: 44, fontWeight: "800", color: colors.pitch },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: colors.card, borderRadius: radius.sm, padding: spacing.md, borderWidth: 1,
    borderColor: colors.border, marginBottom: spacing.xs,
  },
  playerName: { fontSize: 15, fontWeight: "700", color: colors.text },
  statText: { fontSize: 14 },
  doneButton: { marginTop: spacing.xl, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.pitch, alignItems: "center" },
  doneButtonText: { color: colors.textOnDark, fontWeight: "700", fontSize: 16 },
});
