import { hasDatabase } from "@/db/db";
import {
  isPrayerItemType,
  type PrayerItemType,
} from "@/lib/domain";
import { ensureAppUser } from "@/server/app-user";
import { resolveAuth } from "@/server/auth";
import { jsonError, readJson } from "@/server/http";
import { withUserTransaction } from "@/db/user-transaction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson(request);

  if (!body || typeof body !== "object") {
    return jsonError("Invalid JSON body.");
  }

  const enabledItems = Reflect.get(body, "enabledItems");
  const difficultyLevel = Reflect.get(body, "difficultyLevel");

  if (
    !Array.isArray(enabledItems) ||
    enabledItems.length === 0 ||
    !enabledItems.every(isPrayerItemType)
  ) {
    return jsonError("Invalid prayer rule.");
  }

  if (
    typeof difficultyLevel !== "number" ||
    difficultyLevel < 1 ||
    difficultyLevel > 3
  ) {
    return jsonError("Invalid difficulty level.");
  }

  const normalizedItems = Array.from(
    new Set(enabledItems),
  ) as PrayerItemType[];

  if (!hasDatabase()) {
    return Response.json({
      ok: true,
      mode: "device",
      enabledItems: normalizedItems,
      difficultyLevel,
    });
  }

  const auth = resolveAuth(request);
  const user = await ensureAppUser(auth.authSubject, auth.displayName);

  await withUserTransaction(user.id, async (client) => {
    await client.query(
      `
        insert into prayer_rule (
          user_id,
          enabled_items,
          difficulty_level
        )
        values ($1, $2::prayer_item_type[], $3)
      `,
      [user.id, normalizedItems, difficultyLevel],
    );
  });

  return Response.json({
    ok: true,
    mode: "account",
    enabledItems: normalizedItems,
    difficultyLevel,
  });
}
