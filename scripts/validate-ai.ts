import { readFile } from "node:fs/promises";
import path from "node:path";
import { isFatherContextLocator } from "../src/lib/ai/contracts";
import {
  DEVOTIONAL_OFFICE_HOUR_KEYS,
  getOfficeDevotionalTexts,
} from "../src/lib/office-devotional-texts";

async function main() {
  validateContextContracts();
  validateCuratedFallbacks();
  await validatePersistenceAndSecretBoundaries();

  console.log(
    "Validated Father Koverman context contracts, seven-Hour curated fallbacks, user-scoped chat persistence, deletion controls, and server-only OpenAI configuration.",
  );
}

function validateContextContracts() {
  assert(isFatherContextLocator({ kind: "general" }), "general context is valid");
  assert(
    isFatherContextLocator({
      kind: "office",
      hourType: "morning_prayer",
      localDate: "2026-08-04",
    }),
    "canonical Hour context is valid",
  );
  assert(
    isFatherContextLocator({
      kind: "scripture",
      bookId: "john",
      chapter: 3,
      verseStart: 16,
      verseEnd: 18,
    }),
    "local Scripture context is valid",
  );
  assert(
    !isFatherContextLocator({
      kind: "office",
      hourType: "brunch_prayer",
      localDate: "2026-08-04",
    }),
    "unknown Hours must be rejected",
  );
  assert(
    !isFatherContextLocator({
      kind: "scripture",
      bookId: "not-a-book",
      chapter: 1,
      verseStart: null,
      verseEnd: null,
    }),
    "unknown Scripture books must be rejected",
  );
}

function validateCuratedFallbacks() {
  assert(
    DEVOTIONAL_OFFICE_HOUR_KEYS.length === 7,
    "AI generation and curated fallback must cover seven Hours",
  );

  for (const hourType of DEVOTIONAL_OFFICE_HOUR_KEYS) {
    const devotional = getOfficeDevotionalTexts(hourType);
    assert(
      devotional.intercessions.petitions.length === 4,
      `${hourType} fallback must contain four intentions`,
    );
    assert(
      devotional.intercessions.provenance.officialStatus ===
        "not_official_icel",
      `${hourType} fallback must retain the ICEL boundary`,
    );
    assert(
      devotional.concludingPrayer.provenance.officialStatus ===
        "not_official_icel",
      `${hourType} conclusion must retain the ICEL boundary`,
    );
  }
}

async function validatePersistenceAndSecretBoundaries() {
  const root = process.cwd();
  const migration = await readFile(
    path.join(root, "migrations", "005_ai_features.sql"),
    "utf8",
  );
  const envExample = await readFile(path.join(root, ".env.example"), "utf8");
  const openaiServer = await readFile(
    path.join(root, "src", "server", "ai", "openai.ts"),
    "utf8",
  );
  const fatherRoute = await readFile(
    path.join(root, "src", "app", "api", "father", "chat", "route.ts"),
    "utf8",
  );

  assert(
    migration.includes("father_koverman_thread_user_isolation"),
    "Father Koverman threads require a user-isolation RLS policy",
  );
  assert(
    migration.includes("on delete cascade"),
    "account deletion must cascade through saved AI data",
  );
  assert(
    envExample.includes("OPENAI_API_KEY=") &&
      !envExample.includes("NEXT_PUBLIC_OPENAI"),
    "OpenAI credentials must remain server-only",
  );
  assert(
    openaiServer.includes('store: false'),
    "OpenAI response storage must be disabled",
  );
  assert(
    fatherRoute.includes('allowedDomains: ["vatican.va"]'),
    "Catechism lookup must remain restricted to Vatican domains",
  );
  assert(
    fatherRoute.includes("cannot administer sacraments"),
    "the AI priest persona must retain its sacramental boundary",
  );
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

void main();
