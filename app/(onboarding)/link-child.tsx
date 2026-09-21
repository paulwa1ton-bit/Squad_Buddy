import { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, TextInput, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";
import { useParentStore } from "@/store/parentStore";
import { fetchTeam } from "@/lib/firestore/teamsApi";
import { connectToTeam } from "@/lib/teamSync";
import { colors, spacing, radius } from "@/constants/theme";

export default function LinkChild() {
  const parentId = useAuthStore((s) => s.parentId);
  const players = useTeamStore((s) => s.players);
  const team = useTeamStore((s) => s.team);
  const setRemoteTeam = useTeamStore((s) => s.setRemoteTeam);
  const updatePlayer = useTeamStore((s) => s.updatePlayer);
  const linkChildToParent = useParentStore((s) => s.linkChildToParent);

  const [selected, setSelected] = useState<string[]>([]);
  const [teamCode, setTeamCode] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  const unclaimed = useMemo(() => players.filter((p) => !p.archived && !p.parentId), [players]);

  function toggle(playerId: string) {
    setSelected((s) => (s.includes(playerId) ? s.filter((id) => id !== playerId) : [...s, playerId]));
  }

  async function handleFindTeam() {
    const code = teamCode.trim();
    if (!code) return;
    setLookingUp(true);
    try {
      const found = await fetchTeam(code);
      if (!found) {
        Alert.alert("Team not found", "Double-check the team code with your manager and try again.");
        return;
      }
      setRemoteTeam(found);
      connectToTeam(found.id);
    } catch (err) {
      Alert.alert("Couldn't reach the server", "Check your connection and try again.");
    } finally {
      setLookingUp(false);
    }
  }

  function finish() {
    if (parentId) {
      for (const playerId of selected) {
        linkChildToParent(parentId, playerId);
        updatePlayer(playerId, { parentId });
      }
    }
    router.replace("/(tabs)/home");
  }

  if (!team) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Find your team</Text>
        <Text style={styles.subtitle}>
          Ask your manager for their team code (they can find it under Settings) so you can link your child.
        </Text>
        <View style={{ padding: spacing.lg }}>
          <TextInput
            style={styles.input}
            value={teamCode}
            onChangeText={setTeamCode}
            placeholder="Paste team code"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
          <Pressable style={styles.continueButtonFull} onPress={handleFindTeam} disabled={lookingUp}>
            {lookingUp ? <ActivityIndicator color={colors.textOnDark} /> : <Text style={styles.continueButtonText}>Find team</Text>}
          </Pressable>
          <Pressable onPress={() => router.replace("/(tabs)/home")}>
            <Text style={styles.skipLink}>Skip for now</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Link your child</Text>
      <Text style={styles.subtitle}>
        Select your child from {team.name}'s squad list. Ask your manager if you don't see them yet.
      </Text>

      <FlatList
        data={unclaimed}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        ListEmptyComponent={<Text style={styles.empty}>No unlinked players found yet.</Text>}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item.id);
          return (
            <Pressable
              style={[styles.playerRow, isSelected && styles.playerRowSelected]}
              onPress={() => toggle(item.id)}
            >
              <Text style={styles.playerName}>{item.firstName} {item.lastName}</Text>
              <Text style={styles.playerCheck}>{isSelected ? "✓ Selected" : "Tap to select"}</Text>
            </Pressable>
          );
        }}
      />

      <View style={styles.footer}>
        <Pressable style={styles.skipButton} onPress={() => router.replace("/(tabs)/home")}>
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </Pressable>
        <Pressable
          style={[styles.continueButton, selected.length === 0 && styles.continueButtonDisabled]}
          disabled={selected.length === 0}
          onPress={finish}
        >
          <Text style={styles.continueButtonText}>
            Link {selected.length > 0 ? `(${selected.length})` : ""}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: "800", color: colors.text, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  subtitle: { fontSize: 14, color: colors.textMuted, paddingHorizontal: spacing.lg, marginTop: spacing.xs },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: spacing.xl },
  input: {
    backgroundColor: colors.card, borderRadius: radius.sm, padding: spacing.md, fontSize: 16,
    borderWidth: 1, borderColor: colors.border, color: colors.text, marginBottom: spacing.md,
  },
  playerRow: {
    backgroundColor: colors.card, borderRadius: radius.sm, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  playerRowSelected: { borderColor: colors.pitch, backgroundColor: "#EAF3EC" },
  playerName: { fontSize: 16, fontWeight: "600", color: colors.text },
  playerCheck: { fontSize: 12, color: colors.textMuted },
  footer: {
    flexDirection: "row", gap: spacing.sm, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border,
  },
  skipButton: { flex: 1, padding: spacing.md, alignItems: "center", borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  skipButtonText: { color: colors.textMuted, fontWeight: "600" },
  continueButton: { flex: 1, padding: spacing.md, alignItems: "center", borderRadius: radius.md, backgroundColor: colors.pitch },
  continueButtonFull: { padding: spacing.md, alignItems: "center", borderRadius: radius.md, backgroundColor: colors.pitch, marginBottom: spacing.md },
  continueButtonDisabled: { opacity: 0.5 },
  continueButtonText: { color: colors.textOnDark, fontWeight: "700" },
  skipLink: { textAlign: "center", color: colors.textMuted, fontWeight: "600" },
});
