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
import { useTeamStore } from "@/store/teamStore";
import { colors, spacing, radius } from "@/constants/theme";

export default function EditTeam() {
  const team = useTeamStore((s) => s.team);
  const updateTeam = useTeamStore((s) => s.updateTeam);

  const [name, setName] = useState(team?.name ?? "");
  const [league, setLeague] = useState(team?.league ?? "");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(team?.ageGroup ?? "U9");
  const guidelineForAgeGroup = FA_AGE_GROUP_GUIDELINES[team?.ageGroup ?? "U9"];
  const [overridePeriod, setOverridePeriod] = useState(
    !!team && (team.periodType !== guidelineForAgeGroup.defaultPeriodType
      || team.minutesPerPeriod !== guidelineForAgeGroup.minutesPerPeriod),
  );
  const [periodType, setPeriodType] = useState<PeriodType>(team?.periodType ?? "quarters");
  const [minutesPerPeriod, setMinutesPerPeriod] = useState(String(team?.minutesPerPeriod ?? "12"));
  const [logoUri, setLogoUri] = useState<string | undefined>(team?.logoUri);
  const [homePhotoUri, setHomePhotoUri] = useState<string | undefined>(team?.homePhotoUri);

  const guideline = useMemo(() => FA_AGE_GROUP_GUIDELINES[ageGroup], [ageGroup]);

  function selectAgeGroup(next: AgeGroup) {
    setAgeGroup(next);
    if (!overridePeriod) {
      const g = FA_AGE_GROUP_GUIDELINES[next];
      setPeriodType(g.defaultPeriodType);
      setMinutesPerPeriod(String(g.minutesPerPeriod));
    }
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

  function handleSave() {
    if (!name.trim() || !league.trim()) {
      Alert.alert("Missing details", "Team name and league can't be empty.");
      return;
    }
    updateTeam({
      name: name.trim(),
      league: league.trim(),
      ageGroup,
      format: guideline.format,
      periodType: overridePeriod ? periodType : guideline.defaultPeriodType,
      minutesPerPeriod: overridePeriod ? Number(minutesPerPeriod) || guideline.minutesPerPeriod : guideline.minutesPerPeriod,
      logoUri,
      homePhotoUri,
    });
    router.back();
  }

  if (!team) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.subtitle}>No team found.</Text>
      </SafeAreaView>
    );
  }

  const canSave = name.trim().length > 0 && league.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Edit team details</Text>
        <Text style={styles.subtitle}>Changing the age group updates match rules for future matches only.</Text>

        <Text style={styles.label}>Team name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={colors.textMuted} />

        <Text style={styles.label}>League</Text>
        <TextInput style={styles.input} value={league} onChangeText={setLeague} placeholderTextColor={colors.textMuted} />

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

        <View style={styles.actionsRow}>
          <Pressable style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            disabled={!canSave}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save changes</Text>
          </Pressable>
        </View>
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
  actionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl },
  cancelButton: {
    flex: 1, padding: spacing.md, borderRadius: radius.md, alignItems: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  cancelButtonText: { color: colors.textMuted, fontWeight: "600" },
  saveButton: { flex: 1, backgroundColor: colors.pitch, borderRadius: radius.md, padding: spacing.md, alignItems: "center" },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: colors.textOnDark, fontSize: 16, fontWeight: "700" },
});
