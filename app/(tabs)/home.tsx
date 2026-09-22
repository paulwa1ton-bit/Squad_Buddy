import { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Image, Pressable, ImageBackground } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";
import { useMatchStore } from "@/store/matchStore";
import { useParentStore } from "@/store/parentStore";
import { colors, spacing, radius } from "@/constants/theme";

export default function Home() {
  const accountType = useAuthStore((s) => s.accountType);
  return accountType === "parent" ? <ParentHome /> : <ManagerHome />;
}

function ManagerHome() {
  const team = useTeamStore((s) => s.team);
  const players = useTeamStore((s) => s.players);
  const matches = useMatchStore((s) => s.matches);

  const nextMatch = useMemo(
    () =>
      matches
        .filter((m) => m.teamId === team?.id && m.status !== "completed")
        .sort((a, b) => new Date(a.kickOff).getTime() - new Date(b.kickOff).getTime())[0],
    [matches, team],
  );

  if (!team) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView>
        {team.homePhotoUri ? (
          <ImageBackground source={{ uri: team.homePhotoUri }} style={styles.hero}>
            <View style={styles.heroOverlay}>
              {team.logoUri && <Image source={{ uri: team.logoUri }} style={styles.logo} />}
              <Text style={styles.teamName}>{team.name}</Text>
              <Text style={styles.teamMeta}>{team.league} · {team.ageGroup} · {team.format}</Text>
            </View>
          </ImageBackground>
        ) : (
          <View style={styles.hero}>
            <TeamHeroBackground />
            <View style={styles.heroOverlay}>
              {team.logoUri && <Image source={{ uri: team.logoUri }} style={styles.logo} />}
              <Text style={styles.teamName}>{team.name}</Text>
              <Text style={styles.teamMeta}>{team.league} · {team.ageGroup} · {team.format}</Text>
            </View>
          </View>
        )}

        <View style={styles.body}>
          {nextMatch ? (
            <Pressable
              style={styles.matchCard}
              onPress={() =>
                router.push(
                  nextMatch.status === "live"
                    ? `/match/${nextMatch.id}/live`
                    : `/match/${nextMatch.id}/setup`,
                )
              }
            >
              <Text style={styles.matchCardLabel}>
                {nextMatch.status === "live" ? "LIVE NOW" : "Next match"}
              </Text>
              <Text style={styles.matchCardOpp}>vs {nextMatch.opposition}</Text>
              <Text style={styles.matchCardMeta}>
                {new Date(nextMatch.kickOff).toLocaleString(undefined, {
                  weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                })}
                {nextMatch.location ? ` · ${nextMatch.location}` : ""}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No upcoming matches yet.</Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.actionsGrid}>
            <ActionButton icon="⚽" label="New match" onPress={() => router.push("/(tabs)/matches")} />
            <ActionButton icon="👕" label="Add player" onPress={() => router.push("/(tabs)/squad")} />
            <ActionButton icon="🧩" label="Formations" onPress={() => router.push("/(tabs)/squad")} />
            <ActionButton icon="📖" label="FA guidelines" onPress={() => router.push("/(tabs)/guidelines")} />
          </View>

          <Text style={styles.sectionTitle}>Squad ({players.filter((p) => !p.archived).length})</Text>
          <Text style={styles.mutedText}>
            Manage players, positions and season stats from the Squad tab.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ParentHome() {
  const parentId = useAuthStore((s) => s.parentId);
  const parents = useParentStore((s) => s.parents);
  const players = useTeamStore((s) => s.players);
  const matches = useMatchStore((s) => s.matches);
  const invites = useParentStore((s) => s.invitesForParent(parentId ?? ""));
  const respondToInvite = useParentStore((s) => s.respondToInvite);
  const getSeasonTotals = useMatchStore((s) => s.getSeasonTotals);

  const parent = parents.find((p) => p.id === parentId);
  const children = players.filter((p) => parent?.childPlayerIds.includes(p.id));

  const pendingInvites = invites
    .filter((i) => i.status === "pending")
    .map((invite) => ({
      invite,
      match: matches.find((m) => m.id === invite.matchId),
      player: players.find((p) => p.id === invite.playerId),
    }))
    .filter((x) => !!x.match);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.parentGreeting}>Hi {parent?.name?.split(" ")[0] ?? "there"} 👋</Text>

        {pendingInvites.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Match invites awaiting your response</Text>
            {pendingInvites.map(({ invite, match, player }) => (
              <View key={invite.id} style={styles.inviteCard}>
                <Text style={styles.inviteTitle}>
                  {player?.firstName} vs {match!.opposition}
                </Text>
                <Text style={styles.matchCardMeta}>
                  {new Date(match!.kickOff).toLocaleString(undefined, {
                    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                  {match!.location ? ` · ${match!.location}` : ""} · {match!.minutesPerPeriod * 2} min
                </Text>
                <View style={styles.inviteActions}>
                  <Pressable
                    style={[styles.rsvpButton, styles.rsvpDecline]}
                    onPress={() => respondToInvite(invite.id, "declined")}
                  >
                    <Text style={styles.rsvpDeclineText}>Decline</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.rsvpButton, styles.rsvpAccept]}
                    onPress={() => respondToInvite(invite.id, "accepted")}
                  >
                    <Text style={styles.rsvpAcceptText}>Accept</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Your children</Text>
        {children.length === 0 && (
          <Pressable style={styles.emptyCard} onPress={() => router.push("/(onboarding)/link-child")}>
            <Text style={styles.emptyCardText}>No children linked yet - tap to link one.</Text>
          </Pressable>
        )}
        {children.map((child) => {
          const totals = getSeasonTotals(child.teamId, child.id);
          return (
            <View key={child.id} style={styles.childCard}>
              <Text style={styles.matchCardOpp}>{child.firstName} {child.lastName}</Text>
              <Text style={styles.mutedText}>{child.primaryPositions.join(" / ") || "No position set"}</Text>
              <View style={styles.statsRow}>
                <Stat label="Apps" value={totals.appearances} />
                <Stat label="Mins" value={totals.minutesPlayed} />
                <Stat label="Goals" value={totals.goals} />
                <Stat label="Assists" value={totals.assists} />
                <Stat label="🟨" value={totals.yellowCards} />
                <Stat label="🟥" value={totals.redCards} />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Default hero background for a team that hasn't uploaded its own home
 * photo - a designed graphic (gradient, faint pitch markings, a stats
 * glyph) rather than the old flat green fill, since a manager who never
 * gets around to setting a photo shouldn't be stuck with a blank banner.
 */
function TeamHeroBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={["#020A07", "#0B3D2E", "#123D2C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Faint pitch markings, echoing the live-match pitch view */}
      <View style={heroStyles.centreCircle} />
      <View style={heroStyles.halfLine} />
      {/* Small rising-bars glyph standing in for "stats" */}
      <View style={heroStyles.barsWrap}>
        <View style={[heroStyles.bar, { height: 14 }]} />
        <View style={[heroStyles.bar, { height: 22 }]} />
        <View style={[heroStyles.bar, { height: 30 }]} />
        <View style={[heroStyles.bar, { height: 40 }]} />
      </View>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  centreCircle: {
    position: "absolute", right: -40, top: -40, width: 160, height: 160, borderRadius: 80,
    borderWidth: 2, borderColor: "rgba(190,255,240,0.18)",
  },
  halfLine: {
    position: "absolute", right: 40, top: 0, bottom: 0, width: 2, backgroundColor: "rgba(190,255,240,0.14)",
  },
  barsWrap: {
    position: "absolute", left: spacing.lg, bottom: spacing.lg + 44, flexDirection: "row",
    alignItems: "flex-end", gap: 5, opacity: 0.5,
  },
  bar: { width: 8, borderRadius: 2, backgroundColor: colors.accent },
});

function ActionButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.actionButton} onPress={onPress}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { height: 200, backgroundColor: colors.pitch },
  heroOverlay: {
    flex: 1, backgroundColor: "rgba(11,61,46,0.55)", justifyContent: "flex-end", padding: spacing.lg,
  },
  logo: { width: 48, height: 48, borderRadius: radius.sm, marginBottom: spacing.sm },
  teamName: { fontSize: 26, fontWeight: "800", color: colors.textOnDark },
  teamMeta: { fontSize: 13, color: colors.textOnDark, opacity: 0.85 },
  body: { padding: spacing.lg },
  matchCard: { backgroundColor: colors.pitch, borderRadius: radius.lg, padding: spacing.lg },
  matchCardLabel: { color: colors.accent, fontWeight: "700", fontSize: 12, letterSpacing: 1 },
  matchCardOpp: { color: colors.textOnDark, fontSize: 20, fontWeight: "800", marginTop: spacing.xs },
  matchCardMeta: { color: colors.textOnDark, opacity: 0.85, marginTop: spacing.xs, fontSize: 13 },
  emptyCard: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1,
    borderColor: colors.border, alignItems: "center",
  },
  emptyCardText: { color: colors.textMuted },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  mutedText: { color: colors.textMuted, fontSize: 13 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  actionButton: {
    width: "47%", backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, alignItems: "center", gap: spacing.xs,
  },
  actionIcon: { fontSize: 26 },
  actionLabel: { fontSize: 13, fontWeight: "600", color: colors.text },
  parentGreeting: { fontSize: 24, fontWeight: "800", color: colors.text },
  inviteCard: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1,
    borderColor: colors.warning, marginBottom: spacing.sm,
  },
  inviteTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  inviteActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  rsvpButton: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: "center" },
  rsvpDecline: { backgroundColor: "#FBEAEA" },
  rsvpDeclineText: { color: colors.danger, fontWeight: "700" },
  rsvpAccept: { backgroundColor: colors.success },
  rsvpAcceptText: { color: colors.textOnDark, fontWeight: "700" },
  childCard: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1,
    borderColor: colors.border, marginBottom: spacing.sm,
  },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  statBox: { alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "800", color: colors.pitch },
  statLabel: { fontSize: 11, color: colors.textMuted },
});
