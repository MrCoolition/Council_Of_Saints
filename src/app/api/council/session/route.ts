import { hasDatabase } from "@/db/db";
import { withUserTransaction } from "@/db/user-transaction";
import { getCouncilPrompt } from "@/lib/council";
import { getLocalIsoDate } from "@/lib/dates";
import { isCouncilSessionType, isUserSignal } from "@/lib/domain";
import { ensureAppUser } from "@/server/app-user";
import { resolveAuth } from "@/server/auth";
import { jsonError, readJson } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson(request);

  if (!body || typeof body !== "object") {
    return jsonError("Invalid JSON body.");
  }

  const sessionType = Reflect.get(body, "sessionType");
  const signal = Reflect.get(body, "signal") ?? "missed_prayer";
  const localDate = Reflect.get(body, "localDate");

  if (!isCouncilSessionType(sessionType)) {
    return jsonError("Invalid council session type.");
  }

  if (!isUserSignal(signal)) {
    return jsonError("Invalid user signal.");
  }

  const prompt = getCouncilPrompt(sessionType, signal);

  if (!hasDatabase()) {
    return Response.json({ mode: "demo", prompt });
  }

  const auth = resolveAuth(request);

  if (!auth) {
    return jsonError("Authentication required.", 401);
  }

  const user = await ensureAppUser(auth.authSubject, auth.displayName);
  const resolvedLocalDate =
    typeof localDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(localDate)
      ? localDate
      : getLocalIsoDate(user.timezone);

  await withUserTransaction(user.id, async (client) => {
    await client.query(
      `
        insert into council_message (
          user_id,
          local_date,
          saint_profile_id,
          session_type,
          message,
          action_item,
          virtue_focus,
          sacrifice,
          generated_by
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, 'curated_template')
        on conflict (user_id, local_date, session_type) do update set
          saint_profile_id = excluded.saint_profile_id,
          message = excluded.message,
          action_item = excluded.action_item,
          virtue_focus = excluded.virtue_focus,
          sacrifice = excluded.sacrifice
      `,
      [
        user.id,
        resolvedLocalDate,
        prompt.saintId,
        prompt.sessionType,
        prompt.message,
        prompt.actionItem,
        prompt.virtueFocus,
        prompt.sacrifice,
      ],
    );
  });

  return Response.json({
    mode: "database",
    localDate: resolvedLocalDate,
    prompt,
  });
}
