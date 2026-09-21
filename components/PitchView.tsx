import { View, Text, Pressable, StyleSheet } from "react-native";
import { Formation, Player } from "@/types/models";
import { colors, radius } from "@/constants/theme";

interface Props {
  formation: Formation;
  playerBySlotId: Record<string, Player | undefined>;
  onSlotPress?: (slotId: string) => void;
  highlightSlotId?: string;
}

const MARKER_SIZE = 52;

export function PitchView({ formation, playerBySlotId, onSlotPress, highlightSlotId }: Props) {
  return (
    <View style={styles.pitchWrap}>
      <View style={styles.pitchHalfLine} />
      <View style={styles.pitchGoalTop} />
      <View style={styles.pitchGoalBottom} />
      {formation.slots.map((slot) => {
        const player = playerBySlotId[slot.id];
        const highlighted = highlightSlotId === slot.id;
        return (
          <Pressable
            key={slot.id}
            style={[
              styles.marker,
              {
                left: `${slot.x * 100}%`,
                top: `${slot.y * 100}%`,
                marginLeft: -MARKER_SIZE / 2,
                marginTop: -MARKER_SIZE / 2,
              },
              highlighted && styles.markerHighlighted,
              !player && styles.markerEmpty,
            ]}
            onPress={() => onSlotPress?.(slot.id)}
          >
            <Text style={styles.markerRole}>{slot.label ?? slot.position}</Text>
            {player && (
              <Text style={styles.markerName} numberOfLines={1}>
                {player.shirtNumber ? `${player.shirtNumber} ` : ""}{player.firstName}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pitchWrap: {
    width: "100%", aspectRatio: 0.68, backgroundColor: colors.pitchLight, borderRadius: radius.md,
    overflow: "hidden", borderWidth: 2, borderColor: "rgba(255,255,255,0.6)",
  },
  pitchHalfLine: { position: "absolute", top: "50%", left: 0, right: 0, height: 2, backgroundColor: "rgba(255,255,255,0.4)" },
  pitchGoalTop: { position: "absolute", top: 0, left: "35%", right: "35%", height: 24, borderWidth: 2, borderTopWidth: 0, borderColor: "rgba(255,255,255,0.4)" },
  pitchGoalBottom: { position: "absolute", bottom: 0, left: "35%", right: "35%", height: 24, borderWidth: 2, borderBottomWidth: 0, borderColor: "rgba(255,255,255,0.4)" },
  marker: {
    position: "absolute", width: MARKER_SIZE, height: MARKER_SIZE, borderRadius: MARKER_SIZE / 2,
    backgroundColor: colors.accent, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fff", paddingHorizontal: 2,
  },
  markerEmpty: { backgroundColor: "rgba(255,255,255,0.35)" },
  markerHighlighted: { borderColor: colors.danger, borderWidth: 3 },
  markerRole: { fontSize: 9, fontWeight: "700", color: colors.pitch },
  markerName: { fontSize: 9, fontWeight: "600", color: colors.pitch },
});
