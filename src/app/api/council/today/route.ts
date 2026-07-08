import { hasDatabase } from "@/db/db";
import { withUserTransaction } from "@/db/user-transaction";
import { getCouncilPrompt } from "@/lib/council";
import { getLocalIsoDate } from "@/lib/dates";
import { ensureAppUser } from "@/server/app-user";
import { resolveAuth } from "@/server/auth";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const fallback = getCouncilPrompt("morning", "missed_prayer");

  if (!hasDatabase()) {
    return Response.json({ mode: "demo", prompt: fallback });
  }

  const auth = resolveAuth(request);

  if (!auth) {
    return jsonError("Authentication required.", 401);
  }

  const user = await ensureAppUser(auth.authSubject, auth.displayName);
  const localDate = getLocalIsoDate(user.timezone);

  const prompt = await withUserTransaction(user.id, async (client) => {
    const existing = await client.query<{
      saint_profile_id: string | null;
      saint_name: string | null;
      session_type: "morning";
      message: string;
      action_item: string | null;
      virtue_focus: string | null;
      sacrifice: string | null;
      generated_by: "curated_template";
    }>(
      `
        select
          cm.saint_profile_id,
          sp.name as saint_name,
          cm.session_type::text as session_type,
          cm.message,
          cm.action_item,
          cm.virtue_focus,
          cm.sacrifice,
          cm.generated_by
        from council_message cm
        left join saint_profile sp on sp.id = cm.saint_profile_id
        where cm.user_id = $1
          and cm.local_date = $2
          and cm.session_type = 'morning'
        limit 1
      `,
      [user.id, localDate],
    );

    if (existing.rows[0]) {
      const row = existing.rows[0];
      return {
        saintId: row.saint_profile_id ?? fallback.saintId,
        saintName: row.saint_name ?? fallback.saintName,
        sessionType: row.session_type,
        message: row.message,
        actionItem: row.action_item ?? fallback.actionItem,
        virtueFocus: row.virtue_focus ?? fallback.virtueFocus,
        sacrifice: row.sacrifice ?? fallback.sacrifice,
        generatedBy: row.generated_by,
      };
    }

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
        on conflict (user_id, local_date, session_type) do nothing
      `,
      [
        user.id,
        localDate,
        fallback.saintId,
        fallback.sessionType,
        fallback.message,
        fallback.actionItem,
        fallback.virtueFocus,
        fallback.sacrifice,
      ],
    );

    return fallback;
  });

  return Response.json({ mode: "database", localDate, prompt });
}
