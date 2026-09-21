import * as Haptics from "expo-haptics";
import { Platform, Vibration } from "react-native";

/**
 * Fires when it's time to make a substitution: a strong haptic buzz plus a
 * distinct repeating vibration pattern so the manager notices even with the
 * phone in a pocket or bag on the touchline.
 */
export function triggerSubstitutionAlert(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  // A short-short-long pattern, distinct from a plain incoming-notification buzz.
  const pattern = Platform.OS === "ios" ? [0, 300, 150, 300, 150, 500] : [0, 300, 150, 300, 150, 500];
  Vibration.vibrate(pattern);
}

export function triggerGoalCelebration(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function triggerLightTap(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
