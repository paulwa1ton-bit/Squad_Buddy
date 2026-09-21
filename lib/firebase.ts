import { initializeApp, getApps, FirebaseOptions } from "firebase/app";
import { initializeAuth, getAuth, Auth } from "firebase/auth";
// @ts-ignore - getReactNativePersistence exists at runtime in firebase/auth for RN, typings lag behind
import { getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Fill these in from your Firebase project's config (Project settings > General
// > Your apps > SDK setup and configuration), or supply them via app.json's
// "extra" block / EAS secrets and read them through Constants.expoConfig.extra.
// The app will still run without real values, but auth/Firestore/push calls
// will fail until this is configured.
const firebaseConfig: FirebaseOptions = {
  apiKey: Constants.expoConfig?.extra?.firebase?.apiKey ?? "REPLACE_ME",
  authDomain: Constants.expoConfig?.extra?.firebase?.authDomain ?? "REPLACE_ME.firebaseapp.com",
  projectId: Constants.expoConfig?.extra?.firebase?.projectId ?? "REPLACE_ME",
  storageBucket: Constants.expoConfig?.extra?.firebase?.storageBucket ?? "REPLACE_ME.appspot.com",
  messagingSenderId: Constants.expoConfig?.extra?.firebase?.messagingSenderId ?? "REPLACE_ME",
  appId: Constants.expoConfig?.extra?.firebase?.appId ?? "REPLACE_ME",
};

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

let authInstance: Auth;
try {
  authInstance = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // initializeAuth throws if already called (e.g. fast refresh) - fall back to getAuth
  authInstance = getAuth(firebaseApp);
}
export const auth = authInstance;

export const db = getFirestore(firebaseApp);

export const isFirebaseConfigured = firebaseConfig.apiKey !== "REPLACE_ME";
