import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";

export default function Index() {
  const { accountType, hasCompletedOnboarding } = useAuthStore();
  const team = useTeamStore((s) => s.team);

  if (!accountType) return <Redirect href="/(onboarding)/role-select" />;
  if (accountType === "manager" && (!team || !hasCompletedOnboarding)) {
    // team-select looks up this manager's teams itself (handles both "no
    // team yet" and "reinstalled app, team only exists in the cloud so far")
    // rather than assuming zero teams the way team-setup would.
    return <Redirect href="/(onboarding)/team-select" />;
  }
  return <Redirect href="/(tabs)/home" />;
}
