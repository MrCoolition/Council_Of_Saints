import {
  isIsoLectionaryDate,
  type UsccbLectionaryItem,
  type UsccbLectionarySection,
} from "./usccb-lectionary";

export type UsccbRelatedReadingPage = {
  title: string;
  url: string;
};

export type UsccbReadingPage = {
  item: UsccbLectionaryItem;
  lectionaryNumber: number | null;
  note: string | null;
  relatedReadingPages: UsccbRelatedReadingPage[];
};

export type UsccbLectionaryReadingSet = {
  id: string;
  sourceKind: "daily" | "proper";
  label: string;
  description: string;
  officialUrl: string;
  lectionaryNumber: number | null;
  firstReadingCitation: string | null;
  gospelCitations: string[];
  item: UsccbLectionaryItem;
};

type ParseUsccbReadingPageInput = {
  localDate: string;
  officialUrl: string;
};

const MARKDOWN_CONTENT_MARKER = "Markdown Content:";
const MAX_READING_LINES = 500;
const MAX_LINE_LENGTH = 700;

export function parseUsccbReadingPage(
  rawValue: string,
  input: ParseUsccbReadingPageInput,
): UsccbReadingPage | null {
  if (!isIsoLectionaryDate(input.localDate)) {
    return null;
  }

  const officialUrl = normalizeUsccbUrl(input.officialUrl, true);
  if (!officialUrl) {
    return null;
  }

  const normalized = rawValue.replaceAll("\r\n", "\n");
  const markerIndex = normalized.indexOf(MARKDOWN_CONTENT_MARKER);
  const markdown = (markerIndex >= 0
    ? normalized.slice(markerIndex + MARKDOWN_CONTENT_MARKER.length)
    : normalized
  ).trim();
  const readingsIndex = markdown.indexOf("# Daily Readings");
  const readingContent = readingsIndex >= 0
    ? markdown.slice(readingsIndex)
    : markdown;
  const titleMatch = /^##\s+(.+?)\s*$/mu.exec(readingContent);
  const firstSectionIndex = readingContent.search(/^###\s+/mu);

  if (!titleMatch || firstSectionIndex < 0) {
    return null;
  }

  const title = normalizePlainText(titleMatch[1]);
  const preface = readingContent.slice(
    (titleMatch.index ?? 0) + titleMatch[0].length,
    firstSectionIndex,
  );
  const lectionaryMatch = /^Lectionary:\s*(\d+)\s*$/mu.exec(preface);
  const lectionaryNumber = lectionaryMatch
    ? Number(lectionaryMatch[1])
    : null;
  const note = parseReadingPageNote(preface);
  const sections = parseReadingSections(readingContent, firstSectionIndex);

  if (!title || sections.length === 0) {
    return null;
  }

  const publishedAt = /^Published Time:\s*(.+?)\s*$/mu.exec(normalized)?.[1]
    ?.trim() ?? null;
  const copyright = normalizePlainText(
    /^Lectionary for Mass[^\n]+/mu.exec(readingContent)?.[0] ??
      "United States Conference of Catholic Bishops",
  );

  return {
    item: {
      localDate: input.localDate,
      title,
      link: officialUrl,
      publishedAt,
      sections,
      copyright,
    },
    lectionaryNumber,
    note,
    relatedReadingPages: parseRelatedReadingPages(readingContent, officialUrl),
  };
}

export function buildUsccbLectionaryReadingSets(
  dailyPage: UsccbReadingPage | null,
  properPages: readonly UsccbReadingPage[],
): UsccbLectionaryReadingSet[] {
  if (!dailyPage) {
    return [];
  }

  const dailySignature = getReadingSignature(dailyPage.item);
  const seenUrls = new Set<string>();
  const properSets = properPages.flatMap((page) => {
    if (
      page.item.link === dailyPage.item.link ||
      seenUrls.has(page.item.link) ||
      getReadingSignature(page.item) === dailySignature
    ) {
      return [];
    }

    seenUrls.add(page.item.link);
    return [toReadingSet(page, "proper")];
  });

  return [...properSets, toReadingSet(dailyPage, "daily")];
}

function toReadingSet(
  page: UsccbReadingPage,
  sourceKind: UsccbLectionaryReadingSet["sourceKind"],
): UsccbLectionaryReadingSet {
  const firstReading = page.item.sections.find(
    (section) => getSectionKind(section) === "reading",
  );
  const gospelCitations = page.item.sections
    .filter((section) => getSectionKind(section) === "gospel")
    .map((section) => section.citation);
  const properTitle = page.item.title.replace(
    /^(?:optional\s+)?memorial of\s+/iu,
    "",
  );

  return {
    id: sourceKind === "daily"
      ? "daily"
      : `proper-${slugify(new URL(page.item.link).pathname)}`,
    sourceKind,
    label: sourceKind === "daily"
      ? "Daily Lectionary set"
      : `${properTitle} proper`,
    description:
      page.note ??
      `${sourceKind === "daily" ? "Daily" : "Proper"} readings published by the USCCB${
        page.lectionaryNumber ? ` (Lectionary ${page.lectionaryNumber})` : ""
      }.`,
    officialUrl: page.item.link,
    lectionaryNumber: page.lectionaryNumber,
    firstReadingCitation: firstReading?.citation ?? null,
    gospelCitations,
    item: page.item,
  };
}

function parseRelatedReadingPages(
  readingContent: string,
  currentUrl: string,
): UsccbRelatedReadingPage[] {
  const pages: UsccbRelatedReadingPage[] = [];
  const seen = new Set<string>();
  const pattern = /Readings for the\s+\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/giu;

  for (const match of readingContent.matchAll(pattern)) {
    const url = normalizeUsccbUrl(match[2], true);
    const title = normalizePlainText(match[1]);

    if (!url || url === currentUrl || seen.has(url) || !title) {
      continue;
    }

    seen.add(url);
    pages.push({ title, url });
  }

  return pages.slice(0, 4);
}

function parseReadingSections(
  readingContent: string,
  firstSectionIndex: number,
) {
  const sectionContent = readingContent.slice(firstSectionIndex);
  const headingMatches = Array.from(
    sectionContent.matchAll(/^###\s+(.+?)\s*$/gmu),
  );
  const sections: UsccbLectionarySection[] = [];

  for (const [headingIndex, headingMatch] of headingMatches.entries()) {
    const heading = normalizePlainText(headingMatch[1]);
    const blockStart = (headingMatch.index ?? 0) + headingMatch[0].length;
    const blockEnd = headingMatches[headingIndex + 1]?.index ?? sectionContent.length;
    const block = sectionContent.slice(blockStart, blockEnd);
    const citationMatches = Array.from(
      block.matchAll(/^\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)\s*$/gmu),
    ).filter((match) => isUsccbScriptureUrl(match[2]));

    for (const [citationIndex, citationMatch] of citationMatches.entries()) {
      const nextCitationIndex = citationMatches[citationIndex + 1]?.index;
      const bodyStart = (citationMatch.index ?? 0) + citationMatch[0].length;
      const bodyEnd = nextCitationIndex ?? block.length;
      const officialUrl = normalizeUsccbUrl(citationMatch[2], false);
      const citation = normalizePlainText(citationMatch[1]);
      const lines = parseReadingLines(block.slice(bodyStart, bodyEnd));

      if (!officialUrl || !citation || lines.length === 0) {
        continue;
      }

      const title = citationIndex === 0
        ? heading
        : heading.toLowerCase().includes("gospel")
          ? "Alternate Gospel"
          : `${heading} option ${citationIndex + 1}`;

      sections.push({
        id: `${slugify(title)}-${sections.length + 1}`,
        title,
        citation,
        lines,
        officialUrl,
      });
    }
  }

  return sections;
}

function parseReadingLines(value: string) {
  const stopIndex = value.search(
    /^(?:Lectionary for Mass|\*\s+\[(?:LISTEN PODCAST|VIEW REFLECTION VIDEO|En Espa|View Calendar))/mu,
  );
  const content = stopIndex >= 0 ? value.slice(0, stopIndex) : value;

  return content
    .split("\n")
    .map(normalizePlainText)
    .filter((line) => line && line.toLowerCase() !== "or:")
    .slice(0, MAX_READING_LINES)
    .map((line) => line.slice(0, MAX_LINE_LENGTH));
}

function parseReadingPageNote(preface: string) {
  const lines = preface
    .split("\n")
    .map(normalizePlainText)
    .filter((line) => line && !/^Lectionary:\s*\d+$/iu.test(line));
  return lines.length > 0 ? lines.join(" ") : null;
}

function normalizePlainText(value: string) {
  return decodeEntities(
    value
      .replace(/!\[([^\]]*)\]\([^)]+\)/gu, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
      .replace(/<[^>]+>/gu, " ")
      .replace(/[*_`>#]+/gu, " ")
      .replace(/\\([\\`*_[\]{}()#+.!-])/gu, "$1"),
  )
    .replace(/\s+/gu, " ")
    .trim();
}

function decodeEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    ndash: "–",
    mdash: "—",
    quot: '"',
  };

  return value.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/giu,
    (entity, code: string) => {
      if (code.startsWith("#x")) {
        return safeCodePoint(Number.parseInt(code.slice(2), 16), entity);
      }
      if (code.startsWith("#")) {
        return safeCodePoint(Number.parseInt(code.slice(1), 10), entity);
      }
      return named[code.toLowerCase()] ?? entity;
    },
  );
}

function safeCodePoint(value: number, fallback: string) {
  return Number.isSafeInteger(value) && value >= 0 && value <= 0x10ffff
    ? String.fromCodePoint(value)
    : fallback;
}

function normalizeUsccbUrl(value: string, readingPage: boolean) {
  try {
    const url = new URL(value.trim());
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.hostname !== "bible.usccb.org"
    ) {
      return null;
    }

    if (
      readingPage
        ? !url.pathname.startsWith("/bible/readings/")
        : !url.pathname.startsWith("/bible/") ||
          url.pathname.startsWith("/bible/readings/")
    ) {
      return null;
    }

    url.protocol = "https:";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function isUsccbScriptureUrl(value: string) {
  return normalizeUsccbUrl(value, false) !== null;
}

function getReadingSignature(item: UsccbLectionaryItem) {
  return item.sections
    .map((section) => `${getSectionKind(section)}:${normalizeCitation(section.citation)}`)
    .join("|");
}

function getSectionKind(section: UsccbLectionarySection) {
  const title = section.title.toLowerCase();
  if (title.includes("gospel") && !title.includes("acclamation")) {
    return "gospel";
  }
  if (title.includes("psalm")) {
    return "psalm";
  }
  if (
    title.includes("alleluia") ||
    title.includes("acclamation") ||
    title.includes("verse before")
  ) {
    return "acclamation";
  }
  return "reading";
}

function normalizeCitation(value: string) {
  return value
    .toLowerCase()
    .replace(/[–—]/gu, "-")
    .replace(/\s+/gu, "");
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/gu, "")
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-|-$/gu, "") || "readings"
  ).slice(0, 120);
}
