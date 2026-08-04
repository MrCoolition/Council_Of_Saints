import { hasDatabase } from "@/db/db";
import { ensureAppUser } from "@/server/app-user";
import {
  deleteFatherThread,
  getFatherThread,
} from "@/server/ai/father-store";
import { resolveAuth } from "@/server/auth";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const resolved = await resolveRequest(request, context);

  if (resolved instanceof Response) {
    return resolved;
  }

  const thread = await getFatherThread(resolved.userId, resolved.threadId);

  if (!thread) {
    return jsonError("Conversation not found.", 404);
  }

  return Response.json({ thread }, { headers: { "cache-control": "no-store" } });
}

export async function DELETE(request: Request, context: RouteContext) {
  const resolved = await resolveRequest(request, context);

  if (resolved instanceof Response) {
    return resolved;
  }

  const deleted = await deleteFatherThread(resolved.userId, resolved.threadId);
  return deleted
    ? Response.json({ deleted: true })
    : jsonError("Conversation not found.", 404);
}

async function resolveRequest(request: Request, context: RouteContext) {
  if (!hasDatabase()) {
    return jsonError("Account chat history requires a database connection.", 503);
  }

  const { threadId } = await context.params;

  if (!/^[0-9a-f-]{36}$/i.test(threadId)) {
    return jsonError("Invalid conversation identifier.");
  }

  const auth = resolveAuth(request);
  const user = await ensureAppUser(auth.authSubject, auth.displayName);
  return { threadId, userId: user.id };
}
