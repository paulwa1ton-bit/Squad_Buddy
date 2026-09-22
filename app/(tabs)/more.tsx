import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";
import { useParentStore } from "@/store/parentStore";
import { colors, spacing, radius } from "@/constants/theme";

export default function More() {
  const accountType = useAuthStore((s) => s.accountType);
  return accountType === "parent" ? <ParentMore /> : <ManagerMore />;
}

function ManagerMore() {
  const team = useTeamStore((s) => s.team);
  const players = useTeamStore((s) => s.players.filter((p) => !p.archived));
  const parents = useParentStore((s) => s.parents);
  const linkChildToParent = useParentStore((s) => s.linkChildToParent);
  const signOut = useAuthStore((s) => s.signOut);
  const updatePlayer = useTeamStore((s) => s.updatePlayer);

  const linkedPlayers = players.filter((p) => p.parentId);
  const unlinkedPlayers = players.filter((p) => !p.parentId);

  function handleSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out of this device?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.headerTitle}>Settings</Text>

        <Text style={styles.sectionTitle}>Team</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>{team?.name}</Text>
          <Text style={styles.mutedText}>{team?.league} · {team?.ageGroup} · {team?.format}</Text>
        </View>
        <Pressable style={styles.switchTeamButton} onPress={() => router.push("/edit-team")}>
          <Text style={styles.switchTeamButtonText}>Edit team details / photos</Text>
        </Pressable>
        <Pressable style={styles.switchTeamButton} onPress={() => router.push("/(onboarding)/team-select")}>
          <Text style={styles.switchTeamButtonText}>Switch or add a team (up to 2)</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Team join code</Text>
        <Text style={styles.mutedText}>
          Share this with parents when they register or tap "Find your team" so their phone connects to this
          team's live squad, formations and match invites.
        </Text>
        <TextInput style={styles.codeInput} value={team?.id} editable={false} selectTextOnFocus />

        <Text style={styles.sectionTitle}>Registered parents ({parents.length})</Text>
        {parents.length === 0 && <Text style={styles.mutedText}>No parents have registered yet.</Text>}
        {parents.map((parent) => (
          <View key={parent.id} style={styles.card}>
            <Text style={styles.bodyText}>{parent.name}</Text>
            <Text style={styles.mutedText}>{parent.email} · {parent.phone}</Text>
            <Text style={styles.mutedText}>
              {parent.childPlayerIds.length > 0
                ? `Linked to: ${parent.childPlayerIds.map((id) => players.find((p) => p.id === id)?.firstName).filter(Boolean).join(", ")}`
                : "No child linked yet"}
            </Text>
          </View>
        ))}

        {unlinkedPlayers.length > 0 && parents.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Link a player to a parent</Text>
            {unlinkedPlayers.map((player) => (
              <View key={player.id} style={styles.card}>
                <Text style={styles.bodyText}>{player.firstName} {player.lastName}</Text>
                <View style={styles.chipWrap}>
                  {parents.map((parent) => (
                    <Pressable
                      key={parent.id}
                      style={styles.chip}
                      onPress={() => {
                        updatePlayer(player.id, { parentId: parent.id });
                        linkChildToParent(parent.id, player.id);
                      }}
                    >
                      <Text style={styles.chipText}>{parent.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ParentMore() {
  const parentId = useAuthStore((s) => s.parentId);
  const parents = useParentStore((s) => s.parents);
  const players = useTeamStore((s) => s.players);
  const signOut = useAuthStore((s) => s.signOut);

  const parent = parents.find((p) => p.id === parentId);
  const children = players.filter((p) => parent?.childPlayerIds.includes(p.id));

  function handleSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out of this device?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.headerTitle}>Your account</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>{parent?.name}</Text>
          <Text style={styles.mutedText}>{parent?.email}</Text>
          <Text style={styles.mutedText}>{parent?.phone}</Text>
          <Text style={styles.mutedText}>
            Notifications: {parent?.pushToken ? "enabled" : "not enabled on this device"}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Linked children</Text>
        {children.length === 0 && <Text style={styles.mutedText}>No children linked yet.</Text>}
        {children.map((c) => (
          <View key={c.id} style={styles.card}>
            <Text style={styles.bodyText}>{c.firstName} {c.lastName}</Text>
          </View>
        ))}
        <Pressable onPress={() => router.push("/(onboarding)/link-child")}>
          <Text style={styles.linkText}>+ Link another child</Text>
        </Pressable>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { fontSize: 24, fontWeight: "800", color: colors.text, marginBottom: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  mutedText: { color: colors.textMuted, fontSize: 13 },
  bodyText: { color: colors.text, fontSize: 15, fontWeight: "600" },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, gap: 2 },
  switchTeamButton: { padding: spacing.sm, alignItems: "center", borderRadius: radius.sm, borderWidth: 1, borderColor: colors.pitch, marginBottom: spacing.sm },
  switchTeamButtonText: { color: colors.pitch, fontWeight: "700", fontSize: 13 },
  codeInput: { backgroundColor: colors.card, borderRadius: radius.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border, color: colors.textMuted, fontSize: 12 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs },
  chip: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.pitch },
  chipText: { color: colors.pitch, fontSize: 12, fontWeight: "600" },
  linkText: { color: colors.pitch, fontWeight: "600", marginTop: spacing.xs },
  signOutButton: { marginTop: spacing.xl, padding: spacing.md, borderRadius: radius.md, alignItems: "center", borderWidth: 1, borderColor: colors.danger },
  signOutText: { color: colors.danger, fontWeight: "700" },
});
