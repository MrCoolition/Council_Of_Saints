import "server-only";

import type { UIMessage } from "ai";
import { withUserTransaction } from "@/db/user-transaction";
import type {
  FatherContextKind,
  FatherContextSnapshot,
  FatherThread,
  FatherThreadSummary,
} from "@/lib/ai/contracts";

const MAX_STORED_MESSAGES = 500;

type FatherThreadRow = {
  id: string;
  context_kind: FatherContextKind;
  context_key: string;
  context_title: string;
  context_snapshot: FatherContextSnapshot;
  messages: UIMessage[];
  created_at: string | Date;
  updated_at: string | Date;
};

export async function createOrResumeFatherThread(
  userId: string,
  snapshot: FatherContextSnapshot,
  forceNew: boolean,
) {
  return withUserTransaction(userId, async (client) => {
    if (!forceNew) {
      const existing = await client.query<FatherThreadRow>(
        `
          select *
          from father_koverman_thread
          where user_id = $1 and context_key = $2
          order by updated_at desc
          limit 1
        `,
        [userId, snapshot.key],
      );

      if (existing.rows[0]) {
        return mapThread(existing.rows[0]);
      }
    }

    const inserted = await client.query<FatherThreadRow>(
      `
        insert into father_koverman_thread (
          user_id,
          context_kind,
          context_key,
          context_title,
          context_snapshot
        )
        values ($1, $2, $3, $4, $5::jsonb)
        returning *
      `,
      [
        userId,
        snapshot.kind,
        snapshot.key,
        snapshot.title,
        JSON.stringify(snapshot),
      ],
    );

    return mapThread(inserted.rows[0]);
  });
}

export async function listFatherThreads(userId: string) {
  return withUserTransaction(userId, async (client) => {
    const result = await client.query<FatherThreadRow>(
      `
        select *
        from father_koverman_thread
        where user_id = $1
        order by updated_at desc
        limit 100
      `,
      [userId],
    );

    return result.rows.map((row): FatherThreadSummary => {
      const thread = mapThread(row);
      return {
        id: thread.id,
        contextKind: thread.contextKind,
        contextKey: thread.contextKey,
        contextTitle: thread.contextTitle,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        preview: getThreadPreview(thread.messages),
      };
    });
  });
}

export async function getFatherThread(userId: string, threadId: string) {
  return withUserTransaction(userId, async (client) => {
    const result = await client.query<FatherThreadRow>(
      `
        select *
        from father_koverman_thread
        where id = $1 and user_id = $2
        limit 1
      `,
      [threadId, userId],
    );

    return result.rows[0] ? mapThread(result.rows[0]) : null;
  });
}

export async function saveFatherThreadMessages(
  userId: string,
  threadId: string,
  messages: UIMessage[],
) {
  const sanitized = sanitizeFatherMessages(messages).slice(-MAX_STORED_MESSAGES);

  await withUserTransaction(userId, async (client) => {
    await client.query(
      `
        update father_koverman_thread
        set messages = $3::jsonb, updated_at = now()
        where id = $1 and user_id = $2
      `,
      [threadId, userId, JSON.stringify(sanitized)],
    );
  });
}

export async function deleteFatherThread(userId: string, threadId: string) {
  return withUserTransaction(userId, async (client) => {
    const result = await client.query(
      `delete from father_koverman_thread where id = $1 and user_id = $2`,
      [threadId, userId],
    );
    return (result.rowCount ?? 0) > 0;
  });
}

export async function deleteAllFatherThreads(userId: string) {
  return withUserTransaction(userId, async (client) => {
    const result = await client.query(
      `delete from father_koverman_thread where user_id = $1`,
      [userId],
    );
    return result.rowCount ?? 0;
  });
}

export async function reserveFatherChatRequest(userId: string) {
  return withUserTransaction(userId, async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [userId]);
    await client.query(
      `
        delete from ai_usage_event
        where user_id = $1 and created_at < now() - interval '48 hours'
      `,
      [userId],
    );
    const count = await client.query<{ count: string }>(
      `
        select count(*)::text as count
        from ai_usage_event
        where user_id = $1
          and feature = 'father_koverman_chat'
          and created_at >= now() - interval '1 hour'
      `,
      [userId],
    );

    if (Number(count.rows[0]?.count ?? 0) >= 30) {
      return false;
    }

    await client.query(
      `insert into ai_usage_event (user_id, feature) values ($1, 'father_koverman_chat')`,
      [userId],
    );
    return true;
  });
}

export function sanitizeFatherMessages(messages: UIMessage[]) {
  return messages
    .filter(
      (message) => message.role === "user" || message.role === "assistant",
    )
    .map((message): UIMessage => {
      const parts: UIMessage["parts"] = [];

      message.parts.forEach((part) => {
        if (part.type === "text") {
          parts.push({
            type: "text",
            text: part.text.slice(0, 20_000),
          });
          return;
        }

        if (part.type === "source-url" && isVaticanUrl(part.url)) {
          parts.push({
            type: "source-url",
            sourceId: part.sourceId.slice(0, 300),
            url: part.url,
            title: part.title?.slice(0, 200),
          });
        }
      });

      return {
        id: message.id.slice(0, 128),
        role: message.role,
        parts,
      };
    })
    .filter((message) => message.parts.length > 0);
}

function mapThread(row: FatherThreadRow): FatherThread {
  return {
    id: row.id,
    contextKind: row.context_kind,
    contextKey: row.context_key,
    contextTitle: row.context_title,
    contextSnapshot: row.context_snapshot,
    messages: sanitizeFatherMessages(
      Array.isArray(row.messages) ? row.messages : [],
    ),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function getThreadPreview(messages: UIMessage[]) {
  const lastText = [...messages]
    .reverse()
    .flatMap((message) => message.parts)
    .find((part) => part.type === "text");

  if (!lastText || lastText.type !== "text") {
    return "No messages yet";
  }

  const normalized = lastText.text.replace(/\s+/g, " ").trim();
  return normalized.length > 120
    ? `${normalized.slice(0, 117)}…`
    : normalized;
}

function isVaticanUrl(value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "vatican.va" || host.endsWith(".vatican.va");
  } catch {
    return false;
  }
}
