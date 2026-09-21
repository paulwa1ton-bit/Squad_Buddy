import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

function describeAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/email-already-in-use":
      return "That email is already registered - try logging in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/network-request-failed":
      return "No network connection - check your internet and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<string> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user.uid;
  } catch (err) {
    throw new Error(describeAuthError(err));
  }
}

export async function signInWithEmail(email: string, password: string): Promise<string> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user.uid;
  } catch (err) {
    throw new Error(describeAuthError(err));
  }
}

export async function signOutFirebase(): Promise<void> {
  await firebaseSignOut(auth);
}

export function subscribeAuthState(onChange: (user: User | null) => void) {
  return onAuthStateChanged(auth, onChange);
}
