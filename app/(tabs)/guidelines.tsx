import { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, FlatList, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FA_GUIDELINE_DOCS } from "@/data/faGuidelines";
import { REFEREE_GUIDELINE_DOCS } from "@/data/refereeGuidelines";
import { GuidelineDoc } from "@/types/models";
import { colors, spacing, radius } from "@/constants/theme";

export default function Guidelines() {
  const [category, setCategory] = useState<"fa_guideline" | "referee_law">("fa_guideline");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const docs = category === "fa_guideline" ? FA_GUIDELINE_DOCS : REFEREE_GUIDELINE_DOCS;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.summary.toLowerCase().includes(q) ||
        d.body.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [docs, query]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Guidelines</Text>
        <View style={styles.segmentRow}>
          <Pressable
            style={[styles.segment, category === "fa_guideline" && styles.segmentActive]}
            onPress={() => setCategory("fa_guideline")}
          >
            <Text style={[styles.segmentText, category === "fa_guideline" && styles.segmentTextActive]}>FA Guidelines</Text>
          </Pressable>
          <Pressable
            style={[styles.segment, category === "referee_law" && styles.segmentActive]}
            onPress={() => setCategory("referee_law")}
          >
            <Text style={[styles.segmentText, category === "referee_law" && styles.segmentTextActive]}>Laws of the Game</Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search guidelines..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.mutedText}>No results for "{query}".</Text>}
        renderItem={({ item }) => (
          <GuidelineCard
            doc={item}
            expanded={expandedId === item.id}
            onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
          />
        )}
      />
    </SafeAreaView>
  );
}

function GuidelineCard({ doc, expanded, onToggle }: { doc: GuidelineDoc; expanded: boolean; onToggle: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onToggle}>
      <Text style={styles.cardTitle}>{doc.title}</Text>
      <Text style={styles.cardSummary}>{doc.summary}</Text>
      {expanded && (
        <View style={styles.cardBody}>
          <Text style={styles.cardBodyText}>{doc.body}</Text>
          <View style={styles.tagRow}>
            {doc.tags.map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </View>
          {doc.sourceUrl && (
            <Pressable onPress={() => Linking.openURL(doc.sourceUrl!)}>
              <Text style={styles.sourceLink}>View source ↗</Text>
            </Pressable>
          )}
          <Text style={styles.lastUpdated}>Verified {doc.lastUpdated}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
  headerTitle: { fontSize: 24, fontWeight: "800", color: colors.text },
  segmentRow: { flexDirection: "row", gap: spacing.sm },
  segment: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  segmentActive: { backgroundColor: colors.pitch, borderColor: colors.pitch },
  segmentText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  segmentTextActive: { color: colors.textOnDark },
  searchInput: {
    backgroundColor: colors.card, borderRadius: radius.sm, padding: spacing.md, fontSize: 15,
    borderWidth: 1, borderColor: colors.border, color: colors.text,
  },
  mutedText: { color: colors.textMuted, fontSize: 13 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  cardSummary: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  cardBody: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  cardBodyText: { fontSize: 13, color: colors.text, lineHeight: 19 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  tag: { backgroundColor: colors.background, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  tagText: { fontSize: 11, color: colors.textMuted },
  sourceLink: { color: colors.pitch, fontWeight: "600", marginTop: spacing.sm, fontSize: 13 },
  lastUpdated: { color: colors.textMuted, fontSize: 11, marginTop: spacing.xs },
});
