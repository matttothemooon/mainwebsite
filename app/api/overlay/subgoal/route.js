import {
  fetchSevenTvPaint,
  normalizeSubgoalChannel,
  validSubgoalStateForChannel,
} from "@/lib/twitch-subgoal";
import { normalizeSubgoalState } from "@/lib/subgoal-chat";

export async function GET(request) {
  try {
    const requestedChannel = new URL(request.url).searchParams.get("channel");
    const normalizedChannel = normalizeSubgoalChannel(requestedChannel);
    if (!normalizedChannel) {
      return Response.json(
        { connected: false, error: "Add a valid Twitch channel to this overlay URL." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const state = await validSubgoalStateForChannel(normalizedChannel);
    if (!state) {
      return Response.json(
        { connected: false, channel: normalizedChannel },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const paint = state.paintId ? await fetchSevenTvPaint(state.paintId) : null;
    return Response.json(
      {
        connected: true,
        channel: state.login,
        ...normalizeSubgoalState(state),
        paint,
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Sub-goal overlay update failed:", error.message);
    return Response.json(
      { connected: false, error: "Unable to read the sub-goal for this channel." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
