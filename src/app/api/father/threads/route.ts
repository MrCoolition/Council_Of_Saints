import { hasDatabase } from "@/db/db";
import { isFatherContextLocator } from "@/lib/ai/contracts";
import { ensureAppUser } from "@/server/app-user";
import { resolveFatherContext } from "@/server/ai/father-context";
import {
  createOrResumeFatherThread,
  deleteAllFatherThreads,
  listFatherThreads,
} from "@/server/ai/father-store";
import { resolveAuth } from "@/server/auth";
import { jsonError, readJson } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await resolveUser(request);

  if (user instanceof Response) {
    return user;
  }

  const threads = await listFatherThreads(user.id);
  return Response.json({ threads }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await resolveUser(request);

  if (user instanceof Response) {
    return user;
  }

  const body = await readJson(request);

  if (!body || typeof body !== "object") {
    return jsonError("Invalid JSON body.");
  }

  const locator = Reflect.get(body, "locator");
  const forceNew = Reflect.get(body, "forceNew") === true;

  if (!isFatherContextLocator(locator)) {
    return jsonError("Invalid Father Koverman context.");
  }

  try {
    const snapshot = await resolveFatherContext(locator, request);
    const thread = await createOrResumeFatherThread(
      user.id,
      snapshot,
      forceNew,
    );
    return Response.json({ thread });
  } catch (error) {
    console.error("Father Koverman context could not be prepared.", error);
    return jsonError("That prayer context could not be prepared.", 422);
  }
}

export async function DELETE(request: Request) {
  const user = await resolveUser(request);

  if (user instanceof Response) {
    return user;
  }

  const deleted = await deleteAllFatherThreads(user.id);
  return Response.json({ deleted });
}

async function resolveUser(request: Request) {
  if (!hasDatabase()) {
    return jsonError("Account chat history requires a database connection.", 503);
  }

  const auth = resolveAuth(request);
  return ensureAppUser(auth.authSubject, auth.displayName);
}
