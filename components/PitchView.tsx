import { useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Formation, Player } from "@/types/models";
import { colors, radius } from "@/constants/theme";

export interface SlotLayout {
  pageX: number;
  pageY: number;
  width: number;
  height: number;
}

interface Props {
  formation: Formation;
  playerBySlotId: Record<string, Player | undefined>;
  onSlotPress?: (slotId: string) => void;
  highlightSlotId?: string;
  /** Seconds played so far, keyed by player id - shown as live minutes on each marker. */
  secondsPlayedByPlayerId?: Record<string, number>;
  /** Border colour override keyed by player id, e.g. to pair a recommended sub with who they'd replace. */
  ringColorByPlayerId?: Record<string, string>;
  /** Reports each marker's on-screen bounding box, e.g. so a dragged bench player can be dropped onto one. */
  onSlotLayout?: (slotId: string, layout: SlotLayout) => void;
}

const MARKER_SIZE = 52;
const GLOW_COLOR = "#2DD4BF";
const LINE_COLOR = "rgba(190,255,240,0.45)";
// Alternating mown-grass stripes, evenly spread down the pitch.
const STRIPE_COUNT = 9;

export function PitchView({
  formation, playerBySlotId, onSlotPress, highlightSlotId, secondsPlayedByPlayerId, ringColorByPlayerId,
  onSlotLayout,
}: Props) {
  const slotRefs = useRef<Record<string, View | null>>({});

  function reportLayout(slotId: string) {
    const el = slotRefs.current[slotId];
    if (!el || !onSlotLayout) return;
    el.measure((_x, _y, width, height, pageX, pageY) => {
      onSlotLayout(slotId, { pageX, pageY, width, height });
    });
  }

  return (
    <View style={styles.pitchWrap}>
      <LinearGradient
        colors={["#020A07", "#0B3D2E", "#0F5C3F"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {Array.from({ length: STRIPE_COUNT }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stripe,
            { top: `${(i * 100) / STRIPE_COUNT}%`, height: `${100 / STRIPE_COUNT}%`, pointerEvents: "none" },
            i % 2 === 0 && styles.stripeAlt,
          ]}
        />
      ))}
      <View style={styles.pitchHalfLine} />
      <View style={[styles.centreCircle, { pointerEvents: "none" }]} />
      <View style={styles.pitchGoalTop} />
      <View style={styles.pitchGoalBottom} />
      {formation.slots.map((slot) => {
        const player = playerBySlotId[slot.id];
        const highlighted = highlightSlotId === slot.id;
        const ringColor = player ? ringColorByPlayerId?.[player.id] : undefined;
        const minutes = player ? secondsPlayedByPlayerId?.[player.id] : undefined;
        return (
          <Pressable
            key={slot.id}
            ref={(el) => { slotRefs.current[slot.id] = el as unknown as View; }}
            onLayout={() => reportLayout(slot.id)}
            style={[
              styles.marker,
              {
                left: `${slot.x * 100}%`,
                top: `${slot.y * 100}%`,
                marginLeft: -MARKER_SIZE / 2,
                marginTop: -MARKER_SIZE / 2,
              },
              !!player && styles.markerGlow,
              highlighted && styles.markerHighlighted,
              !player && styles.markerEmpty,
              ringColor ? { borderColor: ringColor, borderWidth: 4 } : null,
            ]}
            onPress={() => onSlotPress?.(slot.id)}
          >
            <Text style={styles.markerRole}>{slot.label ?? slot.position}</Text>
            {player && (
              <Text style={styles.markerName} numberOfLines={1}>
                {player.shirtNumber ? `${player.shirtNumber} ` : ""}{player.firstName}
              </Text>
            )}
            {minutes !== undefined && (
              <Text style={styles.markerMinutes}>{Math.floor(minutes / 60)}'</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pitchWrap: {
    width: "100%", aspectRatio: 0.68, borderRadius: radius.md,
    overflow: "hidden", borderWidth: 2, borderColor: "rgba(255,255,255,0.6)",
  },
  stripe: { position: "absolute", left: 0, right: 0 },
  stripeAlt: { backgroundColor: "rgba(255,255,255,0.035)" },
  pitchHalfLine: { position: "absolute", top: "50%", left: 0, right: 0, height: 2, backgroundColor: LINE_COLOR },
  centreCircle: {
    position: "absolute", top: "50%", left: "50%", width: 90, height: 90, borderRadius: 45,
    marginLeft: -45, marginTop: -45, borderWidth: 2, borderColor: LINE_COLOR,
  },
  pitchGoalTop: { position: "absolute", top: 0, left: "35%", right: "35%", height: 24, borderWidth: 2, borderTopWidth: 0, borderColor: LINE_COLOR },
  pitchGoalBottom: { position: "absolute", bottom: 0, left: "35%", right: "35%", height: 24, borderWidth: 2, borderBottomWidth: 0, borderColor: LINE_COLOR },
  marker: {
    position: "absolute", width: MARKER_SIZE, height: MARKER_SIZE, borderRadius: MARKER_SIZE / 2,
    backgroundColor: colors.accent, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fff", paddingHorizontal: 2,
  },
  markerGlow: {
    shadowColor: GLOW_COLOR, shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  markerEmpty: { backgroundColor: "rgba(255,255,255,0.3)" },
  markerHighlighted: { borderColor: colors.danger, borderWidth: 3 },
  markerRole: { fontSize: 9, fontWeight: "700", color: colors.pitch },
  markerName: { fontSize: 9, fontWeight: "600", color: colors.pitch },
  markerMinutes: { fontSize: 8, fontWeight: "700", color: colors.pitch, opacity: 0.75 },
});
