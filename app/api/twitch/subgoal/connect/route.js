import { createState } from "@/lib/auth";
import {
  subgoalClientId,
  subgoalPublicUrl,
  twitchSubgoalConfigProblems,
} from "@/lib/twitch-subgoal";

export async function GET(request) {
  const problems = twitchSubgoalConfigProblems();
  if (problems.length) {
    return Response.json(
      { error: `Twitch sub-goal setup is incomplete: ${problems.join("; ")}` },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { nonce, cookie } = createState(request, "twitch_subgoal_state");
  const redirectUri = subgoalPublicUrl("/api/twitch/subgoal/callback", request.url);
  const params = new URLSearchParams({
    client_id: subgoalClientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "channel:read:subscriptions user:read:chat",
    state: nonce,
    force_verify: "true",
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://id.twitch.tv/oauth2/authorize?${params}`,
      "Set-Cookie": cookie,
      "Cache-Control": "no-store",
    },
  });
}
