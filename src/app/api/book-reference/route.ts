import { hasDatabase } from "@/db/db";
import { withUserTransaction } from "@/db/user-transaction";
import { isPrayerItemType } from "@/lib/domain";
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

  const localDate = Reflect.get(body, "localDate");
  const hourType = Reflect.get(body, "hourType");
  const sectionType = Reflect.get(body, "sectionType");
  const stepOrder = Reflect.get(body, "stepOrder");
  const pageStart = Reflect.get(body, "pageStart");
  const pageEnd = Reflect.get(body, "pageEnd");

  if (typeof localDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    return jsonError("Invalid local date.");
  }

  if (!isPrayerItemType(hourType)) {
    return jsonError("Invalid prayer item type.");
  }

  if (
    typeof sectionType !== "string" ||
    !/^[a-z0-9_-]{1,60}$/i.test(sectionType)
  ) {
    return jsonError("Invalid section type.");
  }

  if (!Number.isInteger(stepOrder) || stepOrder < 1 || stepOrder > 20) {
    return jsonError("Invalid step order.");
  }

  if (!Number.isInteger(pageStart) || pageStart < 1 || pageStart > 5000) {
    return jsonError("Invalid page start.");
  }

  if (
    pageEnd !== null &&
    pageEnd !== undefined &&
    (!Number.isInteger(pageEnd) || pageEnd < pageStart || pageEnd > 5000)
  ) {
    return jsonError("Invalid page end.");
  }

  const normalizedPageEnd =
    typeof pageEnd === "number" && pageEnd >= pageStart ? pageEnd : null;

  if (!hasDatabase()) {
    return Response.json({
      ok: true,
      mode: "device",
      localDate,
      hourType,
      sectionType,
      stepOrder,
      pageStart,
      pageEnd: normalizedPageEnd,
    });
  }

  const auth = resolveAuth(request);
  const user = await ensureAppUser(auth.authSubject, auth.displayName);

  await withUserTransaction(user.id, async (client) => {
    await client.query(
      `
        insert into user_book_reference (
          user_id,
          local_date,
          hour_type,
          section_type,
          step_order,
          page_start,
          page_end
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (user_id, local_date, hour_type, section_type, step_order)
        do update set
          page_start = excluded.page_start,
          page_end = excluded.page_end,
          updated_at = now()
      `,
      [
        user.id,
        localDate,
        hourType,
        sectionType,
        stepOrder,
        pageStart,
        normalizedPageEnd,
      ],
    );
  });

  return Response.json({
    ok: true,
    mode: "account",
    localDate,
    hourType,
    sectionType,
    stepOrder,
    pageStart,
    pageEnd: normalizedPageEnd,
  });
}
