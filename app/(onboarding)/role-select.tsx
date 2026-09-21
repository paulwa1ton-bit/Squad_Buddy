import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radius } from "@/constants/theme";

export default function RoleSelect() {
  function chooseManager() {
    router.push("/(onboarding)/manager-auth");
  }

  function chooseParent() {
    router.push("/(onboarding)/parent-register");
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Squad Buddy</Text>
        <Text style={styles.subtitle}>
          The grassroots football companion for managers and parents.
        </Text>
      </View>

      <View style={styles.options}>
        <Pressable style={styles.card} onPress={chooseManager}>
          <Text style={styles.cardIcon}>📋</Text>
          <Text style={styles.cardTitle}>I'm a Manager or Coach</Text>
          <Text style={styles.cardBody}>
            Set up your team, track squad stats, run match day, and manage substitutions.
          </Text>
        </Pressable>

        <Pressable style={styles.card} onPress={chooseParent}>
          <Text style={styles.cardIcon}>👪</Text>
          <Text style={styles.cardTitle}>I'm a Parent</Text>
          <Text style={styles.cardBody}>
            Register to receive match invites and follow your child's game time and stats.
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pitch, padding: spacing.lg, justifyContent: "center" },
  hero: { marginBottom: spacing.xl, alignItems: "center" },
  title: { fontSize: 40, fontWeight: "800", color: colors.textOnDark },
  subtitle: {
    fontSize: 16, color: colors.textOnDark, opacity: 0.85, textAlign: "center",
    marginTop: spacing.sm, paddingHorizontal: spacing.md,
  },
  options: { gap: spacing.md },
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg,
  },
  cardIcon: { fontSize: 32, marginBottom: spacing.sm },
  cardTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  cardBody: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
});
