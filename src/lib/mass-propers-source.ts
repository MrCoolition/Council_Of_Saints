export type IndexedMassProperSourceCandidate = {
  label: string;
  score: number;
  sourceUrl: string;
};

export type IndexedMassProperResolutionPlan = {
  candidates: readonly IndexedMassProperSourceCandidate[];
  requireFragmentContext: boolean;
};

const TITLE_NOISE = new Set([
  "and",
  "at",
  "bishop",
  "blessed",
  "dawn",
  "day",
  "doctor",
  "during",
  "evangelist",
  "feast",
  "holy",
  "in",
  "lord",
  "martyr",
  "mass",
  "memorial",
  "missal",
  "most",
  "night",
  "of",
  "pope",
  "priest",
  "roman",
  "saint",
  "solemnity",
  "st",
  "sunday",
  "the",
  "time",
  "vigil",
  "virgin",
]);

const MIN_SOURCE_SCORE = 0.3;
const MIN_SOURCE_MARGIN = 0.12;

export function planIndexedMassProperResolution({
  contextFallbackCandidates,
  preferredCandidates,
}: {
  contextFallbackCandidates: readonly IndexedMassProperSourceCandidate[];
  preferredCandidates: readonly IndexedMassProperSourceCandidate[];
}): IndexedMassProperResolutionPlan {
  return preferredCandidates.length > 0
    ? {
        candidates: preferredCandidates,
        requireFragmentContext: false,
      }
    : {
        candidates: contextFallbackCandidates,
        requireFragmentContext: true,
      };
}

export function discoverIndexedMassProperSource({
  excludedSourceUrls = [],
  indexHtml,
  indexUrl,
  titles,
}: {
  excludedSourceUrls?: readonly string[];
  indexHtml: string;
  indexUrl: string;
  titles: readonly string[];
}): IndexedMassProperSourceCandidate | null {
  const normalizedTitles = titles
    .map(sourceTitleTokens)
    .filter((tokens) => tokens.length > 0);
  if (normalizedTitles.length === 0) {
    return null;
  }
  const excluded = new Set(
    excludedSourceUrls.flatMap((value) => {
      const canonical = canonicalTrustedIndexedHtmlUrl(value, indexUrl);
      return canonical ? [canonical] : [];
    }),
  );

  const candidates = new Map<string, IndexedMassProperSourceCandidate>();
  for (const candidate of listIndexedMassProperSources({ indexHtml, indexUrl })) {
    if (excluded.has(candidate.sourceUrl)) {
      continue;
    }
    const labelTokens = sourceTitleTokens(candidate.label);
    const score = Math.max(
      0,
      ...normalizedTitles.map((titleTokens) =>
        scoreTokenSets(titleTokens, labelTokens),
      ),
    );
    if (score >= MIN_SOURCE_SCORE) {
      candidates.set(candidate.sourceUrl, { ...candidate, score });
    }
  }

  const ranked = [...candidates.values()].sort(
    (left, right) =>
      right.score - left.score ||
      left.label.localeCompare(right.label) ||
      left.sourceUrl.localeCompare(right.sourceUrl),
  );
  const best = ranked[0];
  if (!best) {
    return null;
  }
  const runnerUp = ranked[1];
  return runnerUp && best.score - runnerUp.score < MIN_SOURCE_MARGIN
    ? null
    : best;
}

export function listIndexedMassProperSources({
  indexHtml,
  indexUrl,
}: {
  indexHtml: string;
  indexUrl: string;
}): IndexedMassProperSourceCandidate[] {
  const candidates = new Map<string, IndexedMassProperSourceCandidate>();
  const linkPattern =
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/giu;
  let match = linkPattern.exec(indexHtml);
  while (match) {
    const sourceUrl = canonicalTrustedIndexedHtmlUrl(
      decodeHtmlEntities(match[1] ?? ""),
      indexUrl,
    );
    const label = sourceUrl
      ? linkFragmentToLabel(match[2] ?? "", sourceUrl)
      : "";
    if (sourceUrl && label) {
      const existing = candidates.get(sourceUrl);
      if (!existing || sourceTitleTokens(label).length > sourceTitleTokens(existing.label).length) {
        candidates.set(sourceUrl, { label, score: 0, sourceUrl });
      }
    }
    match = linkPattern.exec(indexHtml);
  }

  return [...candidates.values()].sort(
    (left, right) =>
      left.sourceUrl.localeCompare(right.sourceUrl) ||
      left.label.localeCompare(right.label),
  );
}

export function canonicalTrustedIndexedHtmlUrl(
  value: string,
  trustedIndexUrl: string,
) {
  let indexUrl: URL;
  let candidate: URL;
  try {
    indexUrl = new URL(trustedIndexUrl);
    candidate = new URL(value, indexUrl);
  } catch {
    return null;
  }

  if (
    candidate.protocol === "http:" &&
    candidate.hostname === indexUrl.hostname &&
    candidate.port === ""
  ) {
    candidate.protocol = "https:";
  }
  if (
    indexUrl.protocol !== "https:" ||
    indexUrl.port !== "" ||
    candidate.protocol !== "https:" ||
    candidate.hostname !== indexUrl.hostname ||
    candidate.port !== "" ||
    candidate.username !== "" ||
    candidate.password !== "" ||
    candidate.search !== ""
  ) {
    return null;
  }

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(candidate.pathname);
  } catch {
    return null;
  }
  if (
    decodedPath.length === 0 ||
    decodedPath.length > 512 ||
    !/^\/[^\u0000-\u001f\\]*\.html?$/iu.test(decodedPath) ||
    decodedPath
      .split("/")
      .some((segment) => segment === "." || segment === "..")
  ) {
    return null;
  }

  return candidate.toString();
}

export function sourceTitleSimilarity(
  title: string,
  sourceLabel: string,
) {
  return scoreTokenSets(sourceTitleTokens(title), sourceTitleTokens(sourceLabel));
}

export function sourceDocumentTitleSimilarity({
  html,
  titles,
}: {
  html: string;
  titles: readonly string[];
}) {
  const sourceLabels = extractSourceDocumentLabels(html);
  return Math.max(
    0,
    ...titles.flatMap((title) =>
      sourceLabels.map((label) => sourceTitleSimilarity(title, label)),
    ),
  );
}

function sourceTitleTokens(value: string) {
  return normalizeWords(value).filter(
    (word) => word.length > 1 && !TITLE_NOISE.has(word),
  );
}

function scoreTokenSets(left: readonly string[], right: readonly string[]) {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }
  const pairs = left.flatMap((leftToken, leftIndex) =>
    right.map((rightToken, rightIndex) => ({
      leftIndex,
      rightIndex,
      score: tokenSimilarity(leftToken, rightToken),
    })),
  ).sort((leftPair, rightPair) => rightPair.score - leftPair.score);
  const usedLeft = new Set<number>();
  const usedRight = new Set<number>();
  let total = 0;
  for (const pair of pairs) {
    if (
      pair.score < 0.84 ||
      usedLeft.has(pair.leftIndex) ||
      usedRight.has(pair.rightIndex)
    ) {
      continue;
    }
    usedLeft.add(pair.leftIndex);
    usedRight.add(pair.rightIndex);
    total += pair.score;
  }
  const requestedCoverage = total / left.length;
  const sourceCoverage = total / right.length;
  return requestedCoverage + sourceCoverage === 0
    ? 0
    : (2 * requestedCoverage * sourceCoverage) /
        (requestedCoverage + sourceCoverage);
}

function tokenSimilarity(left: string, right: string) {
  if (left === right) {
    return 1;
  }
  if (left.length < 5 || right.length < 5) {
    return 0;
  }
  let prefix = 0;
  while (
    prefix < left.length &&
    prefix < right.length &&
    left[prefix] === right[prefix]
  ) {
    prefix += 1;
  }
  return prefix / Math.max(left.length, right.length);
}

function normalizeWords(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/gu)
    .filter(Boolean);
}

function htmlFragmentToText(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/gu, ""))
    .replace(/\s+/gu, " ")
    .trim();
}

function linkFragmentToLabel(value: string, sourceUrl: string) {
  const visibleText = htmlFragmentToText(value);
  if (visibleText) {
    return visibleText;
  }
  const alternatives: string[] = [];
  const imagePattern = /<img\b[^>]*\balt\s*=\s*(?:["']([^"']*)["']|([^\s>]+))[^>]*>/giu;
  let imageMatch = imagePattern.exec(value);
  while (imageMatch) {
    const alternative = decodeHtmlEntities(
      imageMatch[1] ?? imageMatch[2] ?? "",
    ).replace(/\s+/gu, " ").trim();
    if (alternative) {
      alternatives.push(alternative);
    }
    imageMatch = imagePattern.exec(value);
  }
  const explicitAlternatives = [...new Set(alternatives)];
  if (explicitAlternatives.length > 0) {
    return explicitAlternatives.join(" · ");
  }

  return trustedSourcePathLabel(sourceUrl);
}

function trustedSourcePathLabel(sourceUrl: string) {
  try {
    const source = new URL(sourceUrl);
    const filename = decodeURIComponent(
      source.pathname.split("/").filter(Boolean).at(-1) ?? "",
    );
    const stem = filename.replace(/\.html?$/iu, "");
    const separated = stem
      .replace(/([\p{Ll}\d])(\p{Lu})/gu, "$1 $2")
      .replace(/([\p{L}]{3,})(mass|readings)$/iu, "$1 $2")
      .replace(/[_-]+/gu, " ")
      .replace(/\s+/gu, " ")
      .trim();
    if (
      separated.length === 0 ||
      separated.length > 80 ||
      !/\p{L}/u.test(separated)
    ) {
      return "";
    }
    return separated.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
  } catch {
    return "";
  }
}

function extractSourceDocumentLabels(html: string) {
  const labels: string[] = [];
  const structuralPattern =
    /<(title|h[1-4])\b[^>]*>([\s\S]*?)<\/\1>/giu;
  let structuralMatch = structuralPattern.exec(html);
  while (structuralMatch) {
    const label = htmlFragmentToText(structuralMatch[2] ?? "");
    if (label.length > 0 && label.length <= 180) {
      labels.push(label);
    }
    structuralMatch = structuralPattern.exec(html);
  }

  const fontPattern = /<font\b[^>]*>([\s\S]*?)<\/font>/giu;
  let fontMatch = fontPattern.exec(html);
  while (fontMatch) {
    const label = htmlFragmentToText(fontMatch[1] ?? "");
    const letters = Array.from(label).filter((character) =>
      /\p{L}/u.test(character),
    );
    if (
      label.length > 2 &&
      label.length <= 180 &&
      letters.length > 0 &&
      letters.every((character) => character === character.toUpperCase())
    ) {
      labels.push(label);
    }
    fontMatch = fontPattern.exec(html);
  }
  return [...new Set(labels)];
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;|&apos;/giu, "'")
    .replace(/&nbsp;/giu, " ");
}
