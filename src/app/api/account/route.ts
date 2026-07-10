import { hasDatabase, query } from "@/db/db";
import { ensureAppUser } from "@/server/app-user";
import { resolveAuth } from "@/server/auth";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  if (!hasDatabase()) {
    return jsonError("DB_CONNECT is not configured.", 503);
  }

  const auth = resolveAuth(request);

  if (!auth) {
    return jsonError("Authentication required.", 401);
  }

  const user = await ensureAppUser(auth.authSubject, auth.displayName);

  await query("delete from app_user where id = $1", [user.id]);

  return Response.json({ ok: true });
}
