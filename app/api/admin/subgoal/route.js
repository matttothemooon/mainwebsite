import { requireAuth } from "@/lib/auth";
import { readSubgoalState, twitchSubgoalConfigProblems } from "@/lib/twitch-subgoal";

export async function GET(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  const problems = twitchSubgoalConfigProblems();
  if (problems.length) {
    return Response.json(
      { connected: false, error: problems.join("; ") },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const state = await readSubgoalState();
    return Response.json(
      { connected: Boolean(state), channel: state?.login || "" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Admin sub-goal status read failed:", error.message);
    return Response.json(
      { error: "Failed to read Twitch sub-goal connection" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
