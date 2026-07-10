import { hasDatabase } from "@/db/db";
import { withUserTransaction } from "@/db/user-transaction";
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

  if (
    Reflect.has(body, "text") ||
    Reflect.has(body, "note") ||
    Reflect.has(body, "plaintext")
  ) {
    return jsonError("Only encrypted ciphertext may be sent to this endpoint.");
  }

  const ciphertext = Reflect.get(body, "ciphertext");
  const localDate = Reflect.get(body, "localDate");
  const encryptionVersion = Reflect.get(body, "encryptionVersion") ?? 1;

  if (typeof ciphertext !== "string" || ciphertext.length < 16) {
    return jsonError("Invalid ciphertext.");
  }

  if (typeof localDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    return jsonError("Invalid local date.");
  }

  if (!Number.isInteger(encryptionVersion) || encryptionVersion < 1) {
    return jsonError("Invalid encryption version.");
  }

  if (!hasDatabase()) {
    return jsonError("DB_CONNECT is not configured.", 503);
  }

  const auth = resolveAuth(request);

  if (!auth) {
    return jsonError("Authentication required.", 401);
  }

  const user = await ensureAppUser(auth.authSubject, auth.displayName);

  await withUserTransaction(user.id, async (client) => {
    await client.query(
      `
        insert into encrypted_examen_entry (
          user_id,
          local_date,
          ciphertext,
          encryption_version
        )
        values ($1, $2, $3, $4)
        on conflict (user_id, local_date) do update set
          ciphertext = excluded.ciphertext,
          encryption_version = excluded.encryption_version,
          updated_at = now()
      `,
      [user.id, localDate, ciphertext, encryptionVersion],
    );
  });

  return Response.json({ ok: true, localDate, encryptionVersion });
}
