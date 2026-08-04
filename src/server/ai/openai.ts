import "server-only";

import { createHash } from "node:crypto";
import {
  createOpenAI,
  type OpenAIResponsesProviderOptions,
} from "@ai-sdk/openai";

export const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5.4-nano";

export function hasOpenAI() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return createOpenAI({ apiKey });
}

export function getOpenAIResponsesOptions(
  safetySubject?: string,
): OpenAIResponsesProviderOptions {
  return {
    reasoningEffort: "low",
    reasoningSummary: null,
    safetyIdentifier: safetySubject
      ? createHash("sha256").update(safetySubject).digest("hex")
      : undefined,
    store: false,
    textVerbosity: "medium",
  };
}
