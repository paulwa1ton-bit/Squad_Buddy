import { useMemo, useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Image, Switch, Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { AGE_GROUPS, FA_AGE_GROUP_GUIDELINES } from "@/data/faGuidelines";
import { AgeGroup, PeriodType } from "@/types/models";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";
import { connectToTeam } from "@/lib/teamSync";
import { findTeamsByManager, MAX_TEAMS_PER_MANAGER } from "@/lib/firestore/teamsApi";
import { colors, spacing, radius } from "@/constants/theme";

export default function TeamSetup() {
  const managerUserId = useAuthStore((s) => s.managerUserId);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const createTeam = useTeamStore((s) => s.createTeam);

  const [name, setName] = useState("");
  const [league, setLeague] = useState("");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("U9");
  const [overridePeriod, setOverridePeriod] = useState(false);
  const [periodType, setPeriodType] = useState<PeriodType>("quarters");
  const [minutesPerPeriod, setMinutesPerPeriod] = useState("12");
  const [logoUri, setLogoUri] = useState<string | undefined>();
  const [homePhotoUri, setHomePhotoUri] = useState<string | undefined>();

  const guideline = useMemo(() => FA_AGE_GROUP_GUIDELINES[ageGroup], [ageGroup]);

  function selectAgeGroup(next: AgeGroup) {
    setAgeGroup(next);
    const g = FA_AGE_GROUP_GUIDELINES[next];
    setPeriodType(g.defaultPeriodType);
    setMinutesPerPeriod(String(g.minutesPerPeriod));
  }

  async function pickImage(kind: "logo" | "home") {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      if (kind === "logo") setLogoUri(result.assets[0].uri);
      else setHomePhotoUri(result.assets[0].uri);
    }
  }

  async function handleContinue() {
    if (!name.trim() || !league.trim() || !managerUserId) return;

    const existingTeams = await findTeamsByManager(managerUserId).catch(() => []);
    if (existingTeams.length >= MAX_TEAMS_PER_MANAGER) {
      Alert.alert(
        "Team limit reached",
        `You can run up to ${MAX_TEAMS_PER_MANAGER} teams per manager account.`,
      );
      router.replace("/(onboarding)/team-select");
      return;
    }

    const team = createTeam({
      name: name.trim(),
      league: league.trim(),
      ageGroup,
      logoUri,
      homePhotoUri,
      managerUserId,
      periodTypeOverride: overridePeriod ? periodType : undefined,
      minutesPerPeriodOverride: overridePeriod ? Number(minutesPerPeriod) || guideline.minutesPerPeriod : undefined,
    });
    connectToTeam(team.id);
    completeOnboarding();
    router.replace("/(tabs)/home");
  }

  const canContinue = name.trim().length > 0 && league.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Set up your team</Text>
        <Text style={styles.subtitle}>
          This only takes a minute - we'll pre-fill match rules from the FA's grassroots guidelines.
        </Text>

        <Text style={styles.label}>Team name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Oakfield Colts"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>League</Text>
        <TextInput
          style={styles.input}
          value={league}
          onChangeText={setLeague}
          placeholder="e.g. Riverside Junior League"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Age group</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={ageGroup} onValueChange={(v) => selectAgeGroup(v)}>
            {AGE_GROUPS.map((ag) => (
              <Picker.Item key={ag} label={ag} value={ag} />
            ))}
          </Picker>
        </View>

        <View style={styles.guidelineBox}>
          <Text style={styles.guidelineTitle}>
            FA guideline for {ageGroup}: {guideline.format}, {guideline.minutesPerPeriod} min{" "}
            {guideline.defaultPeriodType}, up to {guideline.maxSquadSize} in the squad.
          </Text>
          {guideline.periodTypeIsLeagueChoice && (
            <Text style={styles.guidelineNote}>
              Your league can choose halves or quarters at this age - adjust below if needed.
            </Text>
          )}
        </View>

        <View style={styles.overrideRow}>
          <Text style={styles.label}>Customise match duration</Text>
          <Switch value={overridePeriod} onValueChange={setOverridePeriod} />
        </View>

        {overridePeriod && (
          <View style={styles.overridePanel}>
            <Text style={styles.label}>Played in</Text>
            <View style={styles.segmentRow}>
              {(["halves", "quarters"] as PeriodType[]).map((pt) => (
                <Pressable
                  key={pt}
                  style={[styles.segment, periodType === pt && styles.segmentActive]}
                  onPress={() => setPeriodType(pt)}
                >
                  <Text style={[styles.segmentText, periodType === pt && styles.segmentTextActive]}>
                    {pt === "halves" ? "Halves" : "Quarters"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Minutes per {periodType === "halves" ? "half" : "quarter"}</Text>
            <TextInput
              style={styles.input}
              value={minutesPerPeriod}
              onChangeText={setMinutesPerPeriod}
              keyboardType="number-pad"
            />
          </View>
        )}

        <Text style={styles.label}>Team badge / logo (optional)</Text>
        <Pressable style={styles.photoPicker} onPress={() => pickImage("logo")}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.photoPreview} />
          ) : (
            <Text style={styles.photoPickerText}>Choose logo</Text>
          )}
        </Pressable>

        <Text style={styles.label}>Home screen photo (optional)</Text>
        <Pressable style={styles.photoPicker} onPress={() => pickImage("home")}>
          {homePhotoUri ? (
            <Image source={{ uri: homePhotoUri }} style={styles.photoPreview} />
          ) : (
            <Text style={styles.photoPickerText}>Choose team photo</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
          disabled={!canContinue}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Create team</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  title: { fontSize: 26, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.card, borderRadius: radius.sm, padding: spacing.md,
    fontSize: 16, borderWidth: 1, borderColor: colors.border, color: colors.text,
  },
  pickerWrap: {
    backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
  },
  guidelineBox: {
    backgroundColor: "#EAF3EC", borderRadius: radius.sm, padding: spacing.md, marginTop: spacing.md,
  },
  guidelineTitle: { fontSize: 13, color: colors.pitch, fontWeight: "600" },
  guidelineNote: { fontSize: 12, color: colors.pitch, marginTop: spacing.xs, opacity: 0.8 },
  overrideRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.lg,
  },
  overridePanel: {
    backgroundColor: colors.card, borderRadius: radius.sm, padding: spacing.md, marginTop: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  segmentRow: { flexDirection: "row", gap: spacing.sm },
  segment: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1,
    borderColor: colors.border, alignItems: "center",
  },
  segmentActive: { backgroundColor: colors.pitch, borderColor: colors.pitch },
  segmentText: { color: colors.text, fontWeight: "600" },
  segmentTextActive: { color: colors.textOnDark },
  photoPicker: {
    height: 120, backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 1,
    borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  photoPickerText: { color: colors.textMuted },
  photoPreview: { width: "100%", height: "100%" },
  continueButton: {
    backgroundColor: colors.pitch, borderRadius: radius.md, padding: spacing.md,
    alignItems: "center", marginTop: spacing.xl,
  },
  continueButtonDisabled: { opacity: 0.5 },
  continueButtonText: { color: colors.textOnDark, fontSize: 16, fontWeight: "700" },
});
