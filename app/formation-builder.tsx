import { useRef, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput, PanResponder, LayoutChangeEvent, Modal, ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { v4 as uuidv4 } from "uuid";
import { useTeamStore } from "@/store/teamStore";
import { FormationSlot, MatchFormat, PlayingPosition } from "@/types/models";
import { colors, spacing, radius } from "@/constants/theme";

const ALL_POSITIONS: PlayingPosition[] = [
  "GK", "LB", "CB", "RB", "LWB", "RWB", "SW",
  "CDM", "CM", "LM", "RM", "CAM",
  "LW", "RW", "ST", "CF",
];

const FORMAT_SIZE: Record<MatchFormat, number> = { "5v5": 5, "7v7": 7, "9v9": 9, "11v11": 11 };
const MARKER_SIZE = 44;

export default function FormationBuilder() {
  const params = useLocalSearchParams<{ format?: string }>();
  const format = (params.format as MatchFormat) ?? "7v7";
  const createCustomFormation = useTeamStore((s) => s.createCustomFormation);

  const [name, setName] = useState("");
  const [slots, setSlots] = useState<FormationSlot[]>([]);
  const [pitchSize, setPitchSize] = useState({ width: 0, height: 0 });
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  const targetSize = FORMAT_SIZE[format];

  function handlePitchLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setPitchSize({ width, height });
  }

  function addSlot() {
    if (slots.length >= targetSize) return;
    const usedGK = slots.some((s) => s.position === "GK");
    setSlots((s) => [
      ...s,
      {
        id: uuidv4(),
        position: usedGK ? "CM" : "GK",
        x: 0.5,
        y: usedGK ? 0.5 : 0.08,
        label: usedGK ? "CM" : "GK",
      },
    ]);
  }

  function removeSlot(id: string) {
    setSlots((s) => s.filter((slot) => slot.id !== id));
    setEditingSlotId(null);
  }

  function updateSlotPosition(id: string, position: PlayingPosition) {
    setSlots((s) => s.map((slot) => (slot.id === id ? { ...slot, position, label: position } : slot)));
  }

  function moveSlot(id: string, x: number, y: number) {
    setSlots((s) =>
      s.map((slot) =>
        slot.id === id
          ? { ...slot, x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) }
          : slot,
      ),
    );
  }

  const canSave = name.trim().length > 0 && slots.length > 0;

  function handleSave() {
    if (!canSave) return;
    createCustomFormation(name.trim(), format, slots);
    router.back();
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.title}>Custom formation ({format})</Text>
        <Text style={styles.subtitle}>
          Tap "Add position" to place a marker, drag it into place, then tap it to choose the role.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Formation name, e.g. 3-1-2 Diamond"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        <View style={styles.pitchWrap} onLayout={handlePitchLayout}>
          <View style={styles.pitchHalfLine} />
          <View style={styles.pitchGoalTop} />
          <View style={styles.pitchGoalBottom} />
          {slots.map((slot) => (
            <SlotMarker
              key={slot.id}
              slot={slot}
              pitchSize={pitchSize}
              onMove={(x, y) => moveSlot(slot.id, x, y)}
              onTap={() => setEditingSlotId(slot.id)}
            />
          ))}
        </View>

        <Text style={styles.countText}>{slots.length} / {targetSize} positions placed</Text>

        <Pressable
          style={[styles.addButton, slots.length >= targetSize && styles.addButtonDisabled]}
          disabled={slots.length >= targetSize}
          onPress={addSlot}
        >
          <Text style={styles.addButtonText}>+ Add position</Text>
        </Pressable>

        <Pressable style={[styles.saveButton, !canSave && styles.saveButtonDisabled]} disabled={!canSave} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save formation</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={!!editingSlotId} transparent animationType="fade" onRequestClose={() => setEditingSlotId(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setEditingSlotId(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.title}>Choose role</Text>
            <View style={styles.chipWrap}>
              {ALL_POSITIONS.map((pos) => (
                <Pressable
                  key={pos}
                  style={styles.chip}
                  onPress={() => { if (editingSlotId) updateSlotPosition(editingSlotId, pos); setEditingSlotId(null); }}
                >
                  <Text style={styles.chipText}>{pos}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.removeButton} onPress={() => editingSlotId && removeSlot(editingSlotId)}>
              <Text style={styles.removeButtonText}>Remove this position</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function SlotMarker({
  slot, pitchSize, onMove, onTap,
}: {
  slot: FormationSlot;
  pitchSize: { width: number; height: number };
  onMove: (x: number, y: number) => void;
  onTap: () => void;
}) {
  const dragging = useRef(false);
  // A gesture's dx/dy from PanResponder are cumulative from touch-down, so the
  // responder must be created ONCE per gesture (not on every move) - otherwise
  // a fresh instance's internal gestureState never gets initialized by
  // onPanResponderGrant and dx/dy come back as raw screen coordinates instead
  // of deltas, making the marker jump wildly after the first move event. Refs
  // let the single long-lived responder always read the latest slot/pitch
  // values without needing to be recreated.
  const anchor = useRef({ x: slot.x, y: slot.y });
  const slotRef = useRef(slot);
  slotRef.current = slot;
  const pitchSizeRef = useRef(pitchSize);
  pitchSizeRef.current = pitchSize;
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragging.current = false;
        anchor.current = { x: slotRef.current.x, y: slotRef.current.y };
      },
      onPanResponderMove: (_evt, gesture) => {
        if (Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3) dragging.current = true;
        const { width, height } = pitchSizeRef.current;
        if (!width || !height) return;
        const newX = anchor.current.x + gesture.dx / width;
        const newY = anchor.current.y + gesture.dy / height;
        onMoveRef.current(newX, newY);
      },
      onPanResponderRelease: () => {
        if (!dragging.current) onTapRef.current();
      },
    }),
  ).current;

  if (!pitchSize.width || !pitchSize.height) return null;

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.marker,
        {
          left: slot.x * pitchSize.width - MARKER_SIZE / 2,
          top: slot.y * pitchSize.height - MARKER_SIZE / 2,
        },
      ]}
    >
      <Text style={styles.markerText}>{slot.label ?? slot.position}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 20, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.card, borderRadius: radius.sm, padding: spacing.md, fontSize: 16,
    borderWidth: 1, borderColor: colors.border, color: colors.text, marginBottom: spacing.md,
  },
  pitchWrap: {
    width: "100%", aspectRatio: 0.68, backgroundColor: colors.pitchLight, borderRadius: radius.md,
    overflow: "hidden", borderWidth: 2, borderColor: colors.textOnDark,
  },
  pitchHalfLine: {
    position: "absolute", top: "50%", left: 0, right: 0, height: 2, backgroundColor: "rgba(255,255,255,0.4)",
  },
  pitchGoalTop: {
    position: "absolute", top: 0, left: "35%", right: "35%", height: 24, borderWidth: 2, borderTopWidth: 0,
    borderColor: "rgba(255,255,255,0.4)",
  },
  pitchGoalBottom: {
    position: "absolute", bottom: 0, left: "35%", right: "35%", height: 24, borderWidth: 2, borderBottomWidth: 0,
    borderColor: "rgba(255,255,255,0.4)",
  },
  marker: {
    position: "absolute", width: MARKER_SIZE, height: MARKER_SIZE, borderRadius: MARKER_SIZE / 2,
    backgroundColor: colors.accent, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: colors.textOnDark,
  },
  markerText: { fontWeight: "800", fontSize: 12, color: colors.pitch },
  countText: { textAlign: "center", color: colors.textMuted, marginTop: spacing.sm },
  addButton: {
    marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, alignItems: "center",
    borderWidth: 1, borderStyle: "dashed", borderColor: colors.pitch,
  },
  addButtonDisabled: { opacity: 0.4 },
  addButtonText: { color: colors.pitch, fontWeight: "700" },
  saveButton: { marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, alignItems: "center", backgroundColor: colors.pitch },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: colors.textOnDark, fontWeight: "700", fontSize: 16 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: spacing.lg },
  modalCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.md },
  chip: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  chipText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  removeButton: { marginTop: spacing.lg, alignItems: "center" },
  removeButtonText: { color: colors.danger, fontWeight: "600" },
});
