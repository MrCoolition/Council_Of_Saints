import "server-only";

import { createHash } from "node:crypto";
import { Output, generateText } from "ai";
import { z } from "zod";
import { hasDatabase, query } from "@/db/db";
import type {
  DailyOfficeDevotionalPayload,
  GeneratedOfficeHourDevotional,
} from "@/lib/ai/contracts";
import type { TodayPayload } from "@/lib/demo-data";
import {
  DEVOTIONAL_OFFICE_HOUR_KEYS,
  type DevotionalOfficeHourKey,
} from "@/lib/office-devotional-texts";
import { loadScriptureAnchor } from "@/server/scripture-passages";
import {
  getOpenAI,
  getOpenAIResponsesOptions,
  hasOpenAI,
  OPENAI_MODEL,
} from "@/server/ai/openai";

const PROMPT_VERSION = "office-devotional-v1";
const MAX_HOUR_CONTEXT = 4_500;

const generatedDevotionalSchema = z.object({
  hours: z
    .array(
      z.object({
        hourType: z.enum(DEVOTIONAL_OFFICE_HOUR_KEYS),
        intentions: z.object({
          title: z.string().min(3).max(80),
          response: z.string().min(3).max(100),
          petitions: z.array(z.string().min(12).max(360)).length(4),
        }),
        conclude: z.object({
          title: z.string().min(3).max(90),
          prompt: z.string().min(20).max(600),
          endingSuggestion: z.string().min(12).max(320),
        }),
        scriptureReferences: z.array(z.string().min(2).max(120)).max(8),
      }),
    )
    .length(DEVOTIONAL_OFFICE_HOUR_KEYS.length),
});

type DevotionalRow = {
  id: string;
  payload: DailyOfficeDevotionalPayload | null;
};

export async function getOrGenerateDailyOfficeDevotional(
  today: TodayPayload,
): Promise<DailyOfficeDevotionalPayload | null> {
  if (!hasDatabase() || !hasOpenAI()) {
    return null;
  }

  const generationContext = await buildGenerationContext(today);
  const fingerprint = createHash("sha256")
    .update(generationContext)
    .digest("hex");
  const keyValues = [
    today.localDate,
    today.profile.country,
    today.profile.diocese ?? "",
    fingerprint,
    PROMPT_VERSION,
    OPENAI_MODEL,
  ];
  const existing = await findCached(keyValues);

  if (existing?.payload) {
    return existing.payload;
  }

  const claim = await query<DevotionalRow>(
    `
      insert into ai_office_devotional (
        local_date,
        country,
        diocese_key,
        liturgical_fingerprint,
        prompt_version,
        model
      )
      values ($1, $2, $3, $4, $5, $6)
      on conflict do nothing
      returning id, payload
    `,
    keyValues,
  );

  if (!claim.rows[0]) {
    return (await findCached(keyValues))?.payload ?? null;
  }

  try {
    const devotional = await generateDailyOfficeDevotional(
      today,
      generationContext,
    );

    await query(
      `
        update ai_office_devotional
        set payload = $2::jsonb, completed_at = now()
        where id = $1
      `,
      [claim.rows[0].id, JSON.stringify(devotional)],
    );

    return devotional;
  } catch (error) {
    await query("delete from ai_office_devotional where id = $1", [
      claim.rows[0].id,
    ]).catch(() => undefined);
    console.error("Daily Office devotional generation failed.", error);
    return null;
  }
}

async function findCached(keyValues: unknown[]) {
  const result = await query<DevotionalRow>(
    `
      select id, payload
      from ai_office_devotional
      where local_date = $1
        and country = $2
        and diocese_key = $3
        and liturgical_fingerprint = $4
        and prompt_version = $5
        and model = $6
      limit 1
    `,
    keyValues,
  );

  return result.rows[0] ?? null;
}

async function generateDailyOfficeDevotional(
  today: TodayPayload,
  generationContext: string,
) {
  const openai = getOpenAI();
  const result = await generateText({
    model: openai.responses(OPENAI_MODEL),
    output: Output.object({ schema: generatedDevotionalSchema }),
    maxOutputTokens: 4_000,
    providerOptions: {
      openai: getOpenAIResponsesOptions(),
    },
    instructions: [
      "You write original Catholic devotional material for Sanctum Council.",
      "Be reverent, concrete, scripturally attentive, hopeful, and theologically orthodox.",
      "Never imitate, reconstruct, or claim to quote an ICEL collect, official Liturgy of the Hours intercession, or other copyrighted liturgical translation.",
      "Write personal devotional alternatives, not official liturgical texts.",
      "Create a deliberate spiritual arc across the seven Hours so themes deepen through the day without repeating phrases, images, petitions, or conclusions.",
      "Use only the supplied liturgical metadata and Scripture. Do not infer personal habits, private needs, or facts about the user.",
      "Each Hour needs exactly four distinct petitions. Keep every response easy to pray aloud.",
      "The concluding prompt should invite a concrete act of recollection, surrender, repentance, gratitude, or charity rather than supplying an official collect.",
    ].join(" "),
    prompt: [
      `Compose the complete seven-Hour devotional set for ${today.localDate}.`,
      "Return every required Hour exactly once, in the supplied order.",
      "Make the day feel unified but never formulaic.",
      "Use Scripture references only from the supplied context.",
      "",
      generationContext,
    ].join("\n"),
  });

  const output = result.output;

  if (!output) {
    throw new Error("OpenAI returned no structured devotional output.");
  }

  const byHour = new Map(output.hours.map((hour) => [hour.hourType, hour]));

  if (byHour.size !== DEVOTIONAL_OFFICE_HOUR_KEYS.length) {
    throw new Error("OpenAI returned duplicate or missing canonical Hours.");
  }

  const hours = Object.fromEntries(
    DEVOTIONAL_OFFICE_HOUR_KEYS.map((hourType) => {
      const generated = byHour.get(hourType);

      if (!generated) {
        throw new Error(`OpenAI omitted ${hourType}.`);
      }

      const normalized: GeneratedOfficeHourDevotional = {
        hourType,
        intentions: {
          title: generated.intentions.title.trim(),
          response: generated.intentions.response.trim(),
          petitions: generated.intentions.petitions.map((text, index) => ({
            id: `${hourType}-${index + 1}`,
            text: text.trim(),
          })),
        },
        conclude: {
          title: generated.conclude.title.trim(),
          prompt: generated.conclude.prompt.trim(),
          endingSuggestion: generated.conclude.endingSuggestion.trim(),
        },
        scriptureReferences: generated.scriptureReferences.map((value) =>
          value.trim(),
        ),
      };

      return [hourType, normalized];
    }),
  ) as Record<DevotionalOfficeHourKey, GeneratedOfficeHourDevotional>;

  return {
    localDate: today.localDate,
    model: OPENAI_MODEL,
    promptVersion: PROMPT_VERSION,
    generatedAt: new Date().toISOString(),
    hours,
  } satisfies DailyOfficeDevotionalPayload;
}

async function buildGenerationContext(today: TodayPayload) {
  const hours = await Promise.all(
    today.officeGuides.map(async (guide) => {
      const anchors = await Promise.all(
        guide.scriptureAnchors.map(loadScriptureAnchor),
      );
      const scripture = anchors
        .map((anchor) => {
          const text = anchor.segments
            .flatMap((segment) =>
              segment.verses.map((verse) => verse.text.trim()),
            )
            .filter(Boolean)
            .join(" ");
          return `${anchor.title} — ${anchor.citation}: ${text}`;
        })
        .join("\n");

      return [
        `HOUR ${guide.hourType}`,
        `${guide.hourLabel ?? guide.traditionalName} (${guide.traditionalName}); ${guide.cycleLabel}.`,
        scripture.slice(0, MAX_HOUR_CONTEXT),
      ].join("\n");
    }),
  );

  return [
    `LITURGICAL DAY: ${today.liturgicalDay.title}`,
    `SEASON: ${today.liturgicalDay.season}`,
    `RANK: ${today.liturgicalDay.rank}`,
    `COLOR: ${today.liturgicalDay.color}`,
    `PSALTER WEEK: ${today.liturgicalDay.psalterWeek}`,
    ...hours,
  ].join("\n\n");
}
