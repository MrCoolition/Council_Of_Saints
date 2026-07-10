import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ScriptureAnchor } from "@/lib/office-psalter";
import {
  getChapterVerses,
  getScriptureBook,
  isScriptureBookData,
  type ScriptureBookData,
  type ScripturePassage,
  type ScriptureVerse,
} from "@/lib/scripture";

export type LoadedScriptureSegment = {
  passage: ScripturePassage;
  reference: string;
  verses: ScriptureVerse[];
};

export type LoadedScriptureAnchor = ScriptureAnchor & {
  segments: LoadedScriptureSegment[];
};

const bookCache = new Map<string, Promise<ScriptureBookData>>();

export async function loadScriptureAnchor(
  anchor: ScriptureAnchor,
): Promise<LoadedScriptureAnchor> {
  const segments = await Promise.all(anchor.passages.map(loadScripturePassage));
  const verses = segments.flatMap((segment) => segment.verses);
  const firstVerse =
    verses.find((verse) => !looksLikePsalmSuperscription(verse.text)) ??
    verses.at(0);

  return {
    ...anchor,
    text: anchor.text ?? firstVerse?.text ?? null,
    segments,
  };
}

function looksLikePsalmSuperscription(text: string) {
  return /^(unto the end|a psalm|the understanding|a prayer|a canticle|the inscription|for the end|when nathan)\b/i.test(
    text.trim(),
  );
}

export async function loadScripturePassage(
  scripturePassage: ScripturePassage,
): Promise<LoadedScriptureSegment> {
  const book = getScriptureBook(scripturePassage.bookId);

  if (!book) {
    throw new Error(`Unknown local Scripture book: ${scripturePassage.bookId}`);
  }

  const data = await loadBook(book.fileName);
  const chapterVerses = getChapterVerses(data, scripturePassage.chapter);
  const start = scripturePassage.verseStart;
  const end = scripturePassage.verseEnd;
  const verses = chapterVerses.filter((verse) => {
    if (start === null) {
      return true;
    }

    return verse.number >= start && (end === null || verse.number <= end);
  });

  if (verses.length === 0) {
    throw new Error(
      `No verses found for ${book.name} ${scripturePassage.chapter}.`,
    );
  }

  return {
    passage: scripturePassage,
    reference: formatLoadedReference(book.name, scripturePassage),
    verses,
  };
}

async function loadBook(fileName: string) {
  const cached = bookCache.get(fileName);

  if (cached) {
    return cached;
  }

  const loadPromise = readFile(
    path.join(process.cwd(), "public", "data", "douay-rheims", fileName),
    "utf8",
  ).then((rawValue) => {
    const value: unknown = JSON.parse(rawValue);

    if (!isScriptureBookData(value)) {
      throw new Error(`Invalid local Scripture data: ${fileName}`);
    }

    return value;
  });

  bookCache.set(fileName, loadPromise);
  return loadPromise;
}

function formatLoadedReference(bookName: string, value: ScripturePassage) {
  const verseRange =
    value.verseStart === null
      ? ""
      : value.verseEnd !== null && value.verseEnd !== value.verseStart
        ? `:${value.verseStart}–${value.verseEnd}`
        : `:${value.verseStart}`;

  return `${bookName} ${value.chapter}${verseRange}`;
}
