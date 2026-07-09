import { hasDatabase } from "@/db/db";
import { withUserTransaction } from "@/db/user-transaction";
import { getLocalIsoDate } from "@/lib/dates";
import {
  isHabitStatus,
  isPrayerItemType,
  type HabitStatus,
  type PrayerItemType,
} from "@/lib/domain";
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

  const itemType = Reflect.get(body, "itemType");
  const status = Reflect.get(body, "status");
  const localDate = Reflect.get(body, "localDate");
  const note = Reflect.get(body, "note");

  if (!isPrayerItemType(itemType)) {
    return jsonError("Invalid prayer item type.");
  }

  if (!isHabitStatus(status)) {
    return jsonError("Invalid habit status.");
  }

  if (typeof localDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    return jsonError("Invalid local date.");
  }

  if (note !== undefined && typeof note !== "string") {
    return jsonError("Invalid note.");
  }

  if (!hasDatabase()) {
    return Response.json({
      ok: true,
      mode: "device",
      localDate,
      itemType,
      status,
    });
  }

  const auth = resolveAuth(request);

  if (!auth) {
    return jsonError("Authentication required.", 401);
  }

  const user = await ensureAppUser(auth.authSubject, auth.displayName);
  const completionTime = status === "done" ? new Date() : null;

  await withUserTransaction(user.id, async (client) => {
    await client.query(
      `
        insert into habit_log (
          user_id,
          local_date,
          item_type,
          status,
          completed_at,
          note
        )
        values ($1, $2, $3, $4, $5, $6)
        on conflict (user_id, local_date, item_type) do update set
          status = excluded.status,
          completed_at = excluded.completed_at,
          note = excluded.note
      `,
      [
        user.id,
        localDate,
        itemType satisfies PrayerItemType,
        status satisfies HabitStatus,
        completionTime,
        typeof note === "string" ? note.slice(0, 500) : null,
      ],
    );
  });

  return Response.json({
    ok: true,
    mode: "account",
    localDate: localDate || getLocalIsoDate(user.timezone),
    itemType,
    status,
  });
}
