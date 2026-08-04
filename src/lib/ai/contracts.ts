import type { UIMessage } from "ai";
import {
  DEVOTIONAL_OFFICE_HOUR_KEYS,
  type DevotionalOfficeHourKey,
} from "@/lib/office-devotional-texts";
import { SCRIPTURE_BOOKS } from "@/lib/scripture";

export const FATHER_CONTEXT_KINDS = [
  "general",
  "office",
  "mass",
  "scripture",
  "rosary",
  "prayer",
  "formation",
] as const;

export type FatherContextKind = (typeof FATHER_CONTEXT_KINDS)[number];

export type FatherContextLocator =
  | { kind: "general" }
  | {
      kind: "office";
      hourType: DevotionalOfficeHourKey;
      localDate: string;
    }
  | {
      kind: "mass";
      localDate: string;
      mode: "daytime" | "anticipated";
      sectionId: string;
      readingOptionId: string | null;
      readingTranslation: "us-lectionary" | "douay-rheims";
    }
  | {
      kind: "scripture";
      bookId: string;
      chapter: number;
      verseStart: number | null;
      verseEnd: number | null;
    }
  | {
      kind: "rosary";
      localDate: string;
      mysterySetId: string;
      mysteryId: string | null;
      stepId: string;
    }
  | { kind: "prayer"; itemId: string }
  | {
      kind: "formation";
      activeTab: "today" | "rule" | "week";
      localDate: string;
    };

export type FatherContextSnapshot = {
  kind: FatherContextKind;
  key: string;
  title: string;
  body: string;
  starterPrompts: string[];
};

export type FatherThread = {
  id: string;
  contextKind: FatherContextKind;
  contextKey: string;
  contextTitle: string;
  contextSnapshot: FatherContextSnapshot;
  messages: UIMessage[];
  createdAt: string;
  updatedAt: string;
};

export type FatherThreadSummary = Omit<
  FatherThread,
  "contextSnapshot" | "messages"
> & {
  preview: string;
};

export type GeneratedOfficePetition = {
  id: string;
  text: string;
};

export type GeneratedOfficeHourDevotional = {
  hourType: DevotionalOfficeHourKey;
  intentions: {
    title: string;
    response: string;
    petitions: GeneratedOfficePetition[];
  };
  conclude: {
    title: string;
    prompt: string;
    endingSuggestion: string;
  };
  scriptureReferences: string[];
};

export type DailyOfficeDevotionalPayload = {
  localDate: string;
  model: string;
  promptVersion: string;
  generatedAt: string;
  hours: Record<DevotionalOfficeHourKey, GeneratedOfficeHourDevotional>;
};

export type DailyOfficeDevotionalResponse =
  | { mode: "ai"; devotional: DailyOfficeDevotionalPayload }
  | { mode: "fallback"; reason: string };

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const scriptureBookIds = new Set(SCRIPTURE_BOOKS.map((book) => book.id));

export function isFatherContextLocator(
  value: unknown,
): value is FatherContextLocator {
  if (!isRecord(value) || !FATHER_CONTEXT_KINDS.includes(value.kind as FatherContextKind)) {
    return false;
  }

  if (value.kind === "general") {
    return true;
  }

  if (value.kind === "office") {
    return (
      typeof value.localDate === "string" &&
      isoDatePattern.test(value.localDate) &&
      DEVOTIONAL_OFFICE_HOUR_KEYS.includes(
        value.hourType as DevotionalOfficeHourKey,
      )
    );
  }

  if (value.kind === "mass") {
    return (
      typeof value.localDate === "string" &&
      isoDatePattern.test(value.localDate) &&
      (value.mode === "daytime" || value.mode === "anticipated") &&
      isBoundedString(value.sectionId, 64) &&
      (value.readingOptionId === null ||
        isBoundedString(value.readingOptionId, 80)) &&
      (value.readingTranslation === "us-lectionary" ||
        value.readingTranslation === "douay-rheims")
    );
  }

  if (value.kind === "scripture") {
    return (
      typeof value.bookId === "string" &&
      scriptureBookIds.has(value.bookId) &&
      Number.isInteger(value.chapter) &&
      Number(value.chapter) > 0 &&
      isNullablePositiveInteger(value.verseStart) &&
      isNullablePositiveInteger(value.verseEnd)
    );
  }

  if (value.kind === "rosary") {
    return (
      typeof value.localDate === "string" &&
      isoDatePattern.test(value.localDate) &&
      isBoundedString(value.mysterySetId, 32) &&
      (value.mysteryId === null || isBoundedString(value.mysteryId, 80)) &&
      isBoundedString(value.stepId, 100)
    );
  }

  if (value.kind === "prayer") {
    return isBoundedString(value.itemId, 160);
  }

  return (
    value.kind === "formation" &&
    typeof value.localDate === "string" &&
    isoDatePattern.test(value.localDate) &&
    (value.activeTab === "today" ||
      value.activeTab === "rule" ||
      value.activeTab === "week")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBoundedString(value: unknown, maxLength: number) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength
  );
}

function isNullablePositiveInteger(value: unknown) {
  return value === null || (Number.isInteger(value) && Number(value) > 0);
}
