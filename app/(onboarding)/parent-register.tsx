import { useState } from "react";
import { Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import { useParentStore } from "@/store/parentStore";
import { registerForPushNotificationsAsync } from "@/lib/notifications";
import { signInWithEmail, signUpWithEmail } from "@/lib/auth";
import { fetchParent } from "@/lib/firestore/parentsApi";
import { connectAsParent } from "@/lib/parentSync";
import { colors, spacing, radius } from "@/constants/theme";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+()\-\s]{7,20}$/;

export default function ParentRegister() {
  const registerParent = useParentStore((s) => s.registerParent);
  const setRemoteParent = useParentStore((s) => s.setRemoteParent);
  const setPushToken = useParentStore((s) => s.setPushToken);
  const signInAsParent = useAuthStore((s) => s.signInAsParent);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const nameValid = mode === "login" || name.trim().length > 1;
  const phoneValid = mode === "login" || PHONE_REGEX.test(phone.trim());
  const emailValid = EMAIL_REGEX.test(email.trim());
  const passwordValid = password.length >= 6;
  const canSubmit = nameValid && phoneValid && emailValid && passwordValid && !submitting;

  async function afterAuthSuccess(uid: string) {
    const token = await registerForPushNotificationsAsync().catch(() => undefined);

    if (mode === "signup") {
      registerParent({ id: uid, name: name.trim(), phone: phone.trim(), email: email.trim().toLowerCase() });
      if (token) setPushToken(uid, token);
    } else {
      const existing = await fetchParent(uid);
      if (!existing) {
        Alert.alert(
          "Profile not found",
          "We couldn't find your parent profile. Please register again.",
        );
        return;
      }
      setRemoteParent(existing);
      if (token) setPushToken(uid, token);
    }

    signInAsParent(uid);
    completeOnboarding();
    connectAsParent(uid);
    router.replace("/(onboarding)/link-child");
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const uid = mode === "signup"
        ? await signUpWithEmail(email.trim(), password)
        : await signInWithEmail(email.trim(), password);
      await afterAuthSuccess(uid);
    } catch (err) {
      Alert.alert(mode === "signup" ? "Couldn't register" : "Couldn't log in", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{mode === "signup" ? "Parent registration" : "Parent log in"}</Text>
        <Text style={styles.subtitle}>
          {mode === "signup"
            ? "Register to receive match invites and see your child's game time and stats."
            : "Log in to see match invites and your child's stats."}
        </Text>

        {mode === "signup" && (
          <>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sam Taylor"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Telephone number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. 07123 456789"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
            {phone.length > 0 && !phoneValid && (
              <Text style={styles.errorText}>Enter a valid telephone number.</Text>
            )}
          </>
        )}

        <Text style={styles.label}>Email address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="e.g. sam@example.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {email.length > 0 && !emailValid && (
          <Text style={styles.errorText}>Enter a valid email address.</Text>
        )}

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
          placeholderTextColor={colors.textMuted}
          secureTextEntry
        />

        <Pressable
          style={[styles.continueButton, !canSubmit && styles.continueButtonDisabled]}
          disabled={!canSubmit}
          onPress={handleSubmit}
        >
          {submitting ? <ActivityIndicator color={colors.textOnDark} /> : (
            <Text style={styles.continueButtonText}>{mode === "signup" ? "Register" : "Log in"}</Text>
          )}
        </Pressable>

        <Pressable style={styles.switchModeLink} onPress={() => setMode(mode === "signup" ? "login" : "signup")}>
          <Text style={styles.switchModeText}>
            {mode === "signup" ? "Already registered? Log in" : "New here? Register"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg },
  title: { fontSize: 26, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.card, borderRadius: radius.sm, padding: spacing.md,
    fontSize: 16, borderWidth: 1, borderColor: colors.border, color: colors.text,
  },
  errorText: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },
  continueButton: {
    backgroundColor: colors.pitch, borderRadius: radius.md, padding: spacing.md,
    alignItems: "center", marginTop: spacing.xl,
  },
  continueButtonDisabled: { opacity: 0.5 },
  continueButtonText: { color: colors.textOnDark, fontSize: 16, fontWeight: "700" },
  switchModeLink: { marginTop: spacing.lg, alignItems: "center" },
  switchModeText: { color: colors.pitch, fontWeight: "600" },
});
