import * as Device from "expo-device";
import { Platform } from "react-native";

// expo-notifications throws at import time when running in plain Expo Go on
// Android (SDK 53+ removed remote push support there - it requires an EAS
// development/production build instead). A static `import` would crash the
// whole module graph in that environment, so this is loaded lazily via
// `require` inside a try/catch: the throw happens exactly where we can catch
// it, and every function below degrades to a no-op instead of crashing the
// app when Notifications is unavailable.
let Notifications: typeof import("expo-notifications") | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require("expo-notifications");
  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (err) {
  console.warn(
    "expo-notifications is unavailable in this runtime (likely Expo Go on Android, SDK 53+). " +
      "Match invite push notifications will be disabled until this runs in a development build.",
    err,
  );
}

/**
 * Requests permission and returns an Expo push token for this device.
 * Requires a physical device and, from SDK 53+, an EAS development/production
 * build (Expo Go can no longer generate remote push tokens on Android).
 */
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (!Notifications) return undefined;
  if (!Device.isDevice) {
    console.warn("Push notifications require a physical device.");
    return undefined;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.warn("Push notification permission was not granted.");
    return undefined;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("match-invites", {
      name: "Match invites & squad news",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync();
  return tokenResponse.data;
}

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Sends a push notification via Expo's push service.
 *
 * NOTE: for a production deployment, move this call server-side (e.g. a
 * Firebase Cloud Function triggered when a manager sends match invites) so
 * that the sending device doesn't need network access to every parent's
 * token and so tokens are never exposed client-to-client. Kept client-side
 * here to keep the MVP fully functional without a backend.
 */
export async function sendPushNotification(expoPushToken: string, payload: PushPayload): Promise<void> {
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: "default",
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
      }),
    });
  } catch (err) {
    console.warn("Failed to send push notification", err);
  }
}
