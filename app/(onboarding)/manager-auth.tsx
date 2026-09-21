import { useState } from "react";
import { Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { signInWithEmail, signUpWithEmail } from "@/lib/auth";
import { findTeamsByManager } from "@/lib/firestore/teamsApi";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";
import { connectToTeam } from "@/lib/teamSync";
import { colors, spacing, radius } from "@/constants/theme";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ManagerAuth() {
  const signInAsManager = useAuthStore((s) => s.signInAsManager);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const setRemoteTeam = useTeamStore((s) => s.setRemoteTeam);

  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const emailValid = EMAIL_REGEX.test(email.trim());
  const passwordValid = password.length >= 6;
  const canSubmit = emailValid && passwordValid && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const uid = mode === "signup"
        ? await signUpWithEmail(email.trim(), password)
        : await signInWithEmail(email.trim(), password);

      signInAsManager(uid);

      const existingTeams = await findTeamsByManager(uid).catch(() => []);
      if (existingTeams.length === 0) {
        router.replace("/(onboarding)/team-setup");
      } else if (existingTeams.length === 1) {
        setRemoteTeam(existingTeams[0]);
        connectToTeam(existingTeams[0].id);
        completeOnboarding();
        router.replace("/(tabs)/home");
      } else {
        router.replace("/(onboarding)/team-select");
      }
    } catch (err) {
      Alert.alert(mode === "signup" ? "Couldn't create account" : "Couldn't log in", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{mode === "signup" ? "Create your manager account" : "Manager log in"}</Text>
        <Text style={styles.subtitle}>
          {mode === "signup"
            ? "This keeps your team's data backed up and lets parents connect to it from their own phones."
            : "Log in to pick up your team where you left off."}
        </Text>

        <Text style={styles.label}>Email address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
          placeholderTextColor={colors.textMuted}
          secureTextEntry
        />

        <Pressable style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]} disabled={!canSubmit} onPress={handleSubmit}>
          {submitting ? <ActivityIndicator color={colors.textOnDark} /> : (
            <Text style={styles.submitButtonText}>{mode === "signup" ? "Create account" : "Log in"}</Text>
          )}
        </Pressable>

        <Pressable style={styles.switchModeLink} onPress={() => setMode(mode === "signup" ? "login" : "signup")}>
          <Text style={styles.switchModeText}>
            {mode === "signup" ? "Already have an account? Log in" : "New here? Create an account"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg },
  title: { fontSize: 24, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.card, borderRadius: radius.sm, padding: spacing.md, fontSize: 16,
    borderWidth: 1, borderColor: colors.border, color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.pitch, borderRadius: radius.md, padding: spacing.md,
    alignItems: "center", marginTop: spacing.xl,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: colors.textOnDark, fontSize: 16, fontWeight: "700" },
  switchModeLink: { marginTop: spacing.lg, alignItems: "center" },
  switchModeText: { color: colors.pitch, fontWeight: "600" },
});
