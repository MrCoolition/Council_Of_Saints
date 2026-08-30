import type {
  MassCelebrationPropers,
  MassProperAntiphon,
  MassProperPrefaceOption,
} from "@/lib/mass-propers";

type ParseMassPropersDocumentInput = {
  html: string;
  localDate: string;
  massForm?: "anticipated" | "daytime";
  sourceLabel: string;
  sourceUrl: string;
  title: string;
  titleAliases?: readonly string[];
};

export type MassPrefaceSourceReference = {
  label: string;
  sourceUrl: string;
};

const RIGHTS_NOTICE =
  "Excerpts from the English translation of The Roman Missal © 2010, ICEL. All rights reserved.";

const SOURCE_MONTHS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
] as const;

const TITLE_STOP_WORDS = new Set([
  "and",
  "day",
  "feast",
  "in",
  "mass",
  "memorial",
  "of",
  "saint",
  "solemnity",
  "st",
  "the",
]);

export function parseMassPropersDocument({
  html,
  localDate,
  massForm,
  sourceLabel,
  sourceUrl,
  title,
  titleAliases = [],
}: ParseMassPropersDocumentInput): MassCelebrationPropers | null {
  if (!html.trim() || !title.trim()) {
    return null;
  }

  const titles = Array.from(
    new Set([title, ...titleAliases].map((value) => value.trim()).filter(Boolean)),
  );
  const fragmentScopedHtml = scopeMassProperSourceDocument(html, sourceUrl);
  if (fragmentScopedHtml === null) {
    return null;
  }
  const scopedHtml = scopeOrdinaryTimeWeek(fragmentScopedHtml, titles);
  const allLines = htmlToLines(scopedHtml);
  const lines = selectCelebrationLines(allLines, {
    localDate,
    massForm,
    titles,
  });
  const entranceIndex = findHeading(lines, "ENTRANCE ANTIPHON");
  const collectIndex = findHeading(lines, "COLLECT", entranceIndex + 1);
  const readingsIndex = findHeading(lines, "READINGS", collectIndex + 1);
  const offeringsIndex = findHeading(
    lines,
    "PRAYER OVER THE OFFERINGS",
    collectIndex + 1,
  );
  const communionIndex = findHeading(
    lines,
    "COMMUNION ANTIPHON",
    offeringsIndex + 1,
  );
  const afterCommunionIndex = findHeading(
    lines,
    "PRAYER AFTER COMMUNION",
    communionIndex + 1,
  );

  const entranceAntiphons = entranceIndex >= 0
    ? parseRepeatedAntiphonOptions(
        lines,
        entranceIndex,
        nextSectionIndex(entranceIndex, [
          collectIndex,
          readingsIndex,
          offeringsIndex,
          communionIndex,
          afterCommunionIndex,
        ], lines.length),
        "ENTRANCE ANTIPHON",
      )
    : [];
  const collects = collectIndex >= 0
    ? parsePrayerOptions(
        lines.slice(
          collectIndex + 1,
          boundAtNextNumberedSection(
            lines,
            collectIndex,
            nextSectionIndex(collectIndex, [
              readingsIndex,
              offeringsIndex,
              communionIndex,
              afterCommunionIndex,
            ], lines.length),
          ),
        ),
      )
    : [];
  const prayersOverOfferings = offeringsIndex >= 0
    ? parsePrayerOptions(
        lines.slice(
          offeringsIndex + 1,
          boundAtNextNumberedSection(
            lines,
            offeringsIndex,
            nextSectionIndex(offeringsIndex, [
              communionIndex,
              afterCommunionIndex,
            ], lines.length),
          ),
        ),
      )
    : [];
  const communionAntiphons = communionIndex >= 0
      ? parseAntiphonOptions(
          lines.slice(
            communionIndex + 1,
            boundAtNextNumberedSection(
              lines,
              communionIndex,
              nextSectionIndex(
                communionIndex,
                [afterCommunionIndex],
                lines.length,
              ),
            ),
          ),
        )
      : [];
  const prayersAfterCommunion = afterCommunionIndex >= 0
    ? parsePrayerOptions(
        lines.slice(
          afterCommunionIndex + 1,
          boundAtNextNumberedSection(
            lines,
            afterCommunionIndex,
            lines.length,
          ),
        ),
      )
    : [];
  const prefaceOptions =
    offeringsIndex >= 0 && communionIndex > offeringsIndex
      ? parsePrefaceOptions(
          lines.slice(offeringsIndex + 1, communionIndex),
          title,
        )
      : [];

  if (
    entranceAntiphons.length === 0 &&
    collects.length === 0 &&
    prayersOverOfferings.length === 0 &&
    communionAntiphons.length === 0 &&
    prayersAfterCommunion.length === 0 &&
    prefaceOptions.length === 0
  ) {
    return null;
  }

  return {
    id: `${localDate}-${slugify(title)}`,
    entranceAntiphons,
    collects,
    prayersOverOfferings,
    communionAntiphons,
    prayersAfterCommunion,
    prefaceOptions,
    rightsNotice: RIGHTS_NOTICE,
    sourceLabel,
    sourceUrl,
  };
}

function nextSectionIndex(
  start: number,
  candidates: readonly number[],
  fallback: number,
) {
  return Math.min(
    fallback,
    ...candidates.filter((candidate) => candidate > start),
  );
}

function boundAtNextNumberedSection(
  lines: readonly string[],
  start: number,
  fallback: number,
) {
  const boundary = lines.findIndex(
    (line, index) =>
      index > start && index < fallback && isNumberedSectionLine(line),
  );
  return boundary >= 0 ? boundary : fallback;
}

export function getOrdinaryTimeWeekNumber(title: string): number | null {
  const numericMatch = title.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:Sunday|Week)\s+in\s+Ordinary\s+Time\b/iu,
  );
  if (numericMatch?.[1]) {
    const number = Number(numericMatch[1]);
    return number >= 1 && number <= 34 ? number : null;
  }

  const wordMatch = title.match(
    /\b([\p{L}]+(?:[-\s]+[\p{L}]+)?)\s+(?:Sunday|Week)\s+in\s+Ordinary\s+Time\b/iu,
  );
  if (!wordMatch?.[1]) {
    return null;
  }

  const number = parseEnglishOrdinal(wordMatch[1]);
  return number >= 1 && number <= 34 ? number : null;
}

export function parseMassPrefaceSourceReferences({
  html,
  prefaceOptions,
  sourceUrl,
}: {
  html: string;
  prefaceOptions: readonly MassProperPrefaceOption[];
  sourceUrl: string;
}): MassPrefaceSourceReference[] {
  let baseUrl: URL;
  try {
    baseUrl = new URL(sourceUrl);
  } catch {
    return [];
  }

  const candidates = new Map<string, Set<string>>();
  const linkPattern =
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/giu;
  let match = linkPattern.exec(html);
  while (match) {
    const label = htmlFragmentToText(match[2] ?? "");
    const option = prefaceOptions.find(
      (candidate) =>
        candidate.text === null &&
        normalizeHeading(candidate.label) === normalizeHeading(label),
    );
    if (option) {
      try {
        const linkedUrl = new URL(
          decodeHtmlEntities(match[1] ?? ""),
          baseUrl,
        );
        if (
          linkedUrl.protocol === "http:" &&
          linkedUrl.hostname === baseUrl.hostname &&
          linkedUrl.port === ""
        ) {
          linkedUrl.protocol = "https:";
        }
        if (linkedUrl.hash) {
          const urls = candidates.get(option.label) ?? new Set<string>();
          urls.add(linkedUrl.toString());
          candidates.set(option.label, urls);
        }
      } catch {
        // Ignore malformed source links and retain the unresolved category.
      }
    }
    match = linkPattern.exec(html);
  }

  return prefaceOptions.flatMap((option) => {
    if (option.text !== null) {
      return [];
    }
    const urls = [...(candidates.get(option.label) ?? [])];
    return urls.length === 1
      ? [{ label: option.label, sourceUrl: urls[0] }]
      : [];
  });
}

export function parseMassPrefaceSourceDocument({
  html,
  reference,
}: {
  html: string;
  reference: MassPrefaceSourceReference;
}): MassProperPrefaceOption[] {
  let fragment: string;
  try {
    const sourceUrl = new URL(reference.sourceUrl);
    fragment = decodeURIComponent(sourceUrl.hash.slice(1)).trim();
  } catch {
    return [];
  }
  if (!html.trim() || !fragment) {
    return [];
  }

  const anchors = parseNamedAnchors(html);
  const normalizedFragment = fragment.toLowerCase();
  const categoryPosition = anchors.findIndex(
    (anchor) => anchor.name.toLowerCase() === normalizedFragment,
  );
  if (categoryPosition < 0) {
    return [];
  }

  const categoryAnchor = anchors[categoryPosition];
  if (!categoryAnchor) {
    return [];
  }
  const directEnd = anchors[categoryPosition + 1]?.index ?? html.length;
  const direct = parsePrefaceOptionBlock(
    html.slice(categoryAnchor.end, directEnd),
  );
  if (direct) {
    return [direct];
  }
  if (/\d$/u.test(normalizedFragment)) {
    return [];
  }

  const prefixPattern = new RegExp(
    `^${escapeRegex(normalizedFragment)}(\\d+)$`,
    "u",
  );
  const options: MassProperPrefaceOption[] = [];
  let expectedNumber = 1;
  let reachedBoundary = false;
  for (
    let position = categoryPosition + 1;
    position < anchors.length;
    position += 1
  ) {
    const anchor = anchors[position];
    if (!anchor) {
      return [];
    }
    const optionMatch = prefixPattern.exec(anchor.name.toLowerCase());
    if (!optionMatch?.[1]) {
      reachedBoundary = true;
      break;
    }
    const optionNumber = Number(optionMatch[1]);
    if (optionNumber !== expectedNumber) {
      return [];
    }

    const end = anchors[position + 1]?.index ?? html.length;
    const option = parsePrefaceOptionBlock(html.slice(anchor.end, end));
    if (!option) {
      return [];
    }
    options.push(option);
    expectedNumber += 1;
  }

  if (
    options.length === 0 ||
    (!reachedBoundary && !/<\/html\s*>/iu.test(html))
  ) {
    return [];
  }
  const keys = new Set<string>();
  return options.filter((option) => {
    const key = `${normalizeHeading(option.label)}\u0000${option.text}`;
    if (keys.has(key)) {
      return false;
    }
    keys.add(key);
    return true;
  });
}

export function parseNamedMassPrefaceSourceDocument({
  html,
  label,
}: {
  html: string;
  label: string;
}): MassProperPrefaceOption[] {
  const normalizedLabel = normalizeHeading(label);
  if (!/\bPREFACE\b/u.test(normalizedLabel)) {
    return [];
  }
  const identity = prefaceHeadingIdentity(normalizedLabel);

  const anchors = parseNamedAnchors(html);
  const matches: MassProperPrefaceOption[] = [];
  anchors.forEach((anchor, position) => {
    const end = anchors[position + 1]?.index ?? html.length;
    const block = html.slice(anchor.end, end);
    const headingMatch = /<b\b[^>]*>([\s\S]*?)<\/b>/iu.exec(block);
    if (
      !headingMatch ||
      prefaceHeadingIdentity(
        normalizeHeading(htmlFragmentToText(headingMatch[1] ?? "")),
      ) !== identity
    ) {
      return;
    }
    const option = parsePrefaceOptionBlock(block);
    if (option) {
      matches.push(option);
    }
  });

  return matches.length === 1 ? matches : [];
}

function prefaceHeadingIdentity(normalizedHeading: string) {
  const structuralWords = new Set([
    "LORD",
    "OF",
    "PREFACE",
    "PREFACES",
    "THE",
  ]);
  return normalizedHeading
    .split(" ")
    .filter((word) => word && !structuralWords.has(word))
    .sort()
    .join(" ");
}

export function scopeMassProperSourceDocument(html: string, sourceUrl: string) {
  let fragment: string;
  try {
    fragment = decodeURIComponent(new URL(sourceUrl).hash.slice(1)).trim();
  } catch {
    return null;
  }
  if (!fragment) {
    return html;
  }

  const anchors = parseNamedAnchors(html);
  const matchingPositions = anchors.flatMap((anchor, position) =>
    anchor.name.toLowerCase() === fragment.toLowerCase() ? [position] : [],
  );
  if (matchingPositions.length !== 1) {
    return null;
  }
  const position = matchingPositions[0] ?? -1;
  const anchor = anchors[position];
  if (!anchor) {
    return null;
  }

  let end = findDocumentContentEnd(html, anchor.end);
  const ownEnd = Math.min(anchors[position + 1]?.index ?? end, end);
  if (hasMassProperStart(htmlToLines(html.slice(anchor.end, ownEnd)))) {
    return html.slice(anchor.index, ownEnd);
  }

  let descendantKind: "category" | "forms" | null = null;
  for (let nextPosition = position + 1; nextPosition < anchors.length; nextPosition += 1) {
    const nextAnchor = anchors[nextPosition];
    if (!nextAnchor) {
      return null;
    }
    const followingIndex = anchors[nextPosition + 1]?.index ?? end;
    const blockLines = htmlToLines(html.slice(nextAnchor.end, followingIndex));
    const properIndex = blockLines.findIndex((line) =>
      isMassProperStartLine(line),
    );
    if (properIndex < 0) {
      continue;
    }
    const headingLines = blockLines.slice(0, properIndex);
    const form = getMassFormKind(headingLines);
    if (descendantKind === null) {
      descendantKind = form === null ? "category" : "forms";
      continue;
    }
    if (descendantKind === "forms" && form === null) {
      end = Math.min(end, nextAnchor.index);
      break;
    }
  }
  return html.slice(anchor.index, end);
}

function scopeOrdinaryTimeWeek(html: string, titles: readonly string[]) {
  const weeks = new Set(
    titles.flatMap((title) => {
      const week = getOrdinaryTimeWeekNumber(title);
      return week ? [week] : [];
    }),
  );
  if (weeks.size !== 1) {
    return html;
  }
  const week = [...weeks][0];
  if (!week) {
    return html;
  }

  const startPattern = new RegExp(
    `<a\\b[^>]*name\\s*=\\s*["']?week${week}["']?[^>]*>`,
    "iu",
  );
  const startMatch = startPattern.exec(html);
  if (!startMatch) {
    return html;
  }

  const start = startMatch.index;
  const nextPattern = new RegExp(
    `<a\\b[^>]*name\\s*=\\s*["']?week${week + 1}["']?[^>]*>`,
    "iu",
  );
  const nextMatch = nextPattern.exec(html.slice(start + startMatch[0].length));
  const end = nextMatch
    ? start + startMatch[0].length + nextMatch.index
    : findDocumentContentEnd(html, start + startMatch[0].length);
  return html.slice(start, end);
}

function findDocumentContentEnd(html: string, start: number) {
  const tail = html.slice(start);
  const boundaryPatterns = [
    /<footer\b/iu,
    /<\/main\s*>/iu,
    /<\/article\s*>/iu,
    /(?:&copy;|&#169;|©|all rights reserved)/iu,
    /<\/body\s*>/iu,
    /<\/html\s*>/iu,
  ];
  const offsets = boundaryPatterns.flatMap((pattern) => {
    const match = pattern.exec(tail);
    return match ? [match.index] : [];
  });
  return offsets.length > 0 ? start + Math.min(...offsets) : html.length;
}

function hasMassProperStart(lines: readonly string[]) {
  return lines.some(isMassProperStartLine);
}

function isMassProperStartLine(line: string) {
  const heading = normalizeSectionHeading(line);
  return heading.startsWith("ENTRANCE ANTIPHON") || heading === "COLLECT";
}

type CelebrationLineCandidate = {
  dateKeys: ReadonlySet<string>;
  end: number;
  form: "dawn" | "day" | "night" | "vigil" | null;
  start: number;
  titleScore: number;
};

type EntranceLineGroup = {
  collectIndex: number | null;
  firstEntranceIndex: number;
  lastEntranceIndex: number;
};

function selectCelebrationLines(
  lines: readonly string[],
  {
    localDate,
    massForm,
    titles,
  }: {
    localDate: string;
    massForm?: "anticipated" | "daytime";
    titles: readonly string[];
  },
) {
  const entranceIndices = findHeadingIndices(lines, "ENTRANCE ANTIPHON");
  const collectIndices = findHeadingIndices(lines, "COLLECT");
  if (entranceIndices.length === 0) {
    if (collectIndices.length !== 1) {
      return [];
    }
    const collectIndex = collectIndices[0] ?? 0;
    const headingLines = lines.slice(0, Math.min(lines.length, collectIndex + 1));
    const titleScore = scoreBoundedHeadingContext(titles, headingLines);
    const expectedDateKey = getSourceDateKey(localDate);
    const hasDateIdentity =
      expectedDateKey !== null &&
      headingLines.some(
        (line) => parseSourceDateHeading(line) === expectedDateKey,
      );
    return titleScore >= 0.65 || hasDateIdentity ? [...lines] : [];
  }

  const expectedDateKey = getSourceDateKey(localDate);
  const entranceGroups = groupEntrancesByFollowingCollect(
    entranceIndices,
    collectIndices,
  );
  let inheritedGroup:
    | Pick<CelebrationLineCandidate, "dateKeys" | "titleScore">
    | null = null;
  const candidates = entranceGroups.map((entranceGroup, position) => {
    const entranceIndex = entranceGroup.firstEntranceIndex;
    const previousEntranceIndex =
      entranceGroups[position - 1]?.firstEntranceIndex ?? -1;
    const contextStart = findCelebrationContextStart(
      lines,
      previousEntranceIndex,
      entranceIndex,
    );
    const headingLines = lines.slice(contextStart, entranceIndex);
    const ownDateKeys = new Set(
      headingLines.flatMap((line) => {
        const key = parseSourceDateHeading(line);
        return key ? [key] : [];
      }),
    );
    const ownTitleScore = scoreBoundedHeadingContext(titles, headingLines);
    const form = getMassFormKind(headingLines);
    const hasOwnIdentity =
      ownTitleScore >= 0.65 ||
      (expectedDateKey !== null && ownDateKeys.has(expectedDateKey));
    const inherited = inheritedGroup;
    const mayInherit =
      form !== null &&
      inherited !== null &&
      ownDateKeys.size === 0 &&
      !hasOwnIdentity;
    const titleScore = mayInherit && inherited
      ? Math.max(ownTitleScore, inherited.titleScore)
      : ownTitleScore;
    const dateKeys = mayInherit && inherited
      ? inherited.dateKeys
      : ownDateKeys;

    if (form !== null && (hasOwnIdentity || mayInherit)) {
      inheritedGroup = { dateKeys, titleScore };
    } else if (form === null) {
      inheritedGroup = null;
    }
    return {
      dateKeys,
      end:
        entranceGroups[position + 1]?.firstEntranceIndex ?? lines.length,
      form,
      start: entranceGroup.firstEntranceIndex,
      titleScore,
    } satisfies CelebrationLineCandidate;
  });

  let eligible = candidates;
  if (expectedDateKey !== null) {
    const dateMatches = eligible.filter((candidate) =>
      candidate.dateKeys.has(expectedDateKey),
    );
    if (dateMatches.length > 0) {
      eligible = dateMatches;
    }
  }

  const bestIdentityScore = Math.max(
    ...eligible.map((candidate) => candidate.titleScore),
  );
  if (bestIdentityScore >= 0.65) {
    eligible = eligible.filter(
      (candidate) => bestIdentityScore - candidate.titleScore < 0.08,
    );
  }

  const formCandidates = eligible.filter((candidate) => candidate.form !== null);
  if (formCandidates.length > 0) {
    const requestedForm = getRequestedMassForm(titles, massForm);
    if (requestedForm === "ambiguous" || requestedForm === null) {
      return [];
    }
    const matchingForms = formCandidates.filter(
      (candidate) => candidate.form === requestedForm,
    );
    if (matchingForms.length !== 1) {
      return [];
    }
    eligible = matchingForms;
  }

  const ordered = [...eligible].sort(
    (left, right) => right.titleScore - left.titleScore,
  );
  const best = ordered[0];
  const runnerUp = ordered[1];
  const hasUniqueDateEvidence =
    expectedDateKey !== null &&
    eligible.length === 1 &&
    best?.dateKeys.has(expectedDateKey);
  if (
    !best ||
    (!hasUniqueDateEvidence && best.titleScore < 0.65) ||
    (runnerUp && best.titleScore - runnerUp.titleScore < 0.08)
  ) {
    return [];
  }

  return lines.slice(best.start, best.end);
}

function groupEntrancesByFollowingCollect(
  entranceIndices: readonly number[],
  collectIndices: readonly number[],
) {
  const groups: EntranceLineGroup[] = [];
  let collectPosition = 0;
  for (const entranceIndex of entranceIndices) {
    while (
      collectPosition < collectIndices.length &&
      (collectIndices[collectPosition] ?? -1) <= entranceIndex
    ) {
      collectPosition += 1;
    }
    const collectIndex = collectIndices[collectPosition] ?? null;
    const previous = groups[groups.length - 1];
    if (collectIndex !== null && previous?.collectIndex === collectIndex) {
      previous.lastEntranceIndex = entranceIndex;
      continue;
    }
    groups.push({
      collectIndex,
      firstEntranceIndex: entranceIndex,
      lastEntranceIndex: entranceIndex,
    });
  }
  return groups;
}

function getRequestedMassForm(
  titles: readonly string[],
  massForm: "anticipated" | "daytime" | undefined,
) {
  const explicitForms = new Set(
    titles.flatMap((title) => {
      const form = getMassFormKind([title]);
      return form ? [form] : [];
    }),
  );
  if (explicitForms.size > 1) {
    return "ambiguous" as const;
  }
  const explicit = [...explicitForms][0];
  if (explicit) {
    return explicit;
  }
  return massForm === "anticipated"
    ? ("vigil" as const)
    : massForm === "daytime"
      ? ("day" as const)
      : null;
}

function findCelebrationContextStart(
  lines: readonly string[],
  previousEntranceIndex: number,
  entranceIndex: number,
) {
  if (previousEntranceIndex < 0) {
    return 0;
  }
  let afterCommunionIndex = -1;
  for (let index = previousEntranceIndex + 1; index < entranceIndex; index += 1) {
    if (
      normalizeSectionHeading(lines[index] ?? "").startsWith(
        "PRAYER AFTER COMMUNION",
      )
    ) {
      afterCommunionIndex = index;
    }
  }
  if (afterCommunionIndex < 0) {
    return previousEntranceIndex + 1;
  }
  for (let index = afterCommunionIndex + 1; index < entranceIndex; index += 1) {
    if (isPrayerConclusion(lines[index] ?? "")) {
      return index + 1;
    }
  }
  return afterCommunionIndex + 1;
}

function scoreBoundedHeadingContext(
  titles: readonly string[],
  lines: readonly string[],
) {
  let bestScore = 0;
  for (let start = 0; start < lines.length; start += 1) {
    const combined: string[] = [];
    for (
      let end = start;
      end < Math.min(lines.length, start + 6);
      end += 1
    ) {
      combined.push(lines[end] ?? "");
      const context = combined.join(" ");
      if (context.length > 280) {
        break;
      }
      for (let titlePosition = 0; titlePosition < titles.length; titlePosition += 1) {
        const title = titles[titlePosition];
        if (!title) {
          continue;
        }
        const authority = titlePosition === 0 ? 1 : 0.84;
        bestScore = Math.max(
          bestScore,
          scoreTitleSimilarity(title, context) * authority,
        );
      }
    }
  }
  return bestScore;
}

function getMassFormKind(lines: readonly string[]) {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const heading = normalizeHeading(lines[index] ?? "");
    if (/\bVIGIL(?: MASS)?\b/u.test(heading)) {
      return "vigil" as const;
    }
    if (/\bMASS (?:DURING|IN) THE DAY\b/u.test(heading)) {
      return "day" as const;
    }
    if (/\bMASS (?:DURING|IN) THE NIGHT\b/u.test(heading)) {
      return "night" as const;
    }
    if (/\bMASS AT DAWN\b/u.test(heading)) {
      return "dawn" as const;
    }
  }
  return null;
}

function getSourceDateKey(localDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(localDate);
  if (!match?.[2] || !match[3]) {
    return null;
  }
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return `${SOURCE_MONTHS[month - 1]} ${day}`;
}

function parseSourceDateHeading(line: string) {
  const heading = normalizeHeading(line);
  const monthFirst = /^(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER) (\d{1,2})(?:ST|ND|RD|TH)?$/u.exec(
    heading,
  );
  if (monthFirst?.[1] && monthFirst[2]) {
    return `${monthFirst[1]} ${Number(monthFirst[2])}`;
  }
  const dayFirst = /^(\d{1,2})(?:ST|ND|RD|TH)? (JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)$/u.exec(
    heading,
  );
  return dayFirst?.[1] && dayFirst[2]
    ? `${dayFirst[2]} ${Number(dayFirst[1])}`
    : null;
}

function parseRepeatedAntiphonOptions(
  lines: readonly string[],
  start: number,
  end: number,
  heading: string,
) {
  const headingIndices = findHeadingIndices(lines, heading, start, end);
  const options = headingIndices.flatMap((headingIndex, position) =>
    parseAntiphonOptions(
      lines.slice(headingIndex + 1, headingIndices[position + 1] ?? end),
    ),
  );
  const keys = new Set<string>();
  return options.filter((option) => {
    const key = `${option.citation}\u0000${option.text}`;
    if (keys.has(key)) {
      return false;
    }
    keys.add(key);
    return true;
  });
}

function parseAntiphonOptions(lines: readonly string[]) {
  return splitOptions(lines).flatMap((optionLines) => {
    const boundary = optionLines.findIndex(
      (line) => isNumberedSectionLine(line) || isAntiphonRubricHeading(line),
    );
    const boundedLines = boundary >= 0 ? optionLines.slice(0, boundary) : optionLines;
    const meaningful = boundedLines.filter(
      (line) => !isStructuralLine(line) && normalizeHeading(line) !== "GLORIA",
    );
    if (meaningful.length === 0) {
      return [];
    }

    const citationIndex = meaningful.findIndex(isScriptureCitation);
    const citation =
      citationIndex >= 0 ? meaningful[citationIndex] : "Roman Missal";
    const text = joinText(
      meaningful.filter((_, index) => index !== citationIndex),
    );
    return text ? [{ citation, text } satisfies MassProperAntiphon] : [];
  });
}

function parsePrayerOptions(lines: readonly string[]) {
  return splitOptions(lines).flatMap((optionLines) => {
    const prayer: string[] = [];
    for (const line of optionLines) {
      if (
        isStructuralLine(line) ||
        normalizeHeading(line).startsWith("PREFACE")
      ) {
        continue;
      }
      prayer.push(line);
      if (isPrayerConclusion(line)) {
        break;
      }
    }

    const text = normalizeCurrentUsConclusion(joinText(prayer));
    return text && prayer.some(isPrayerConclusion) ? [text] : [];
  });
}

function parsePrefaceOptions(lines: readonly string[], title: string) {
  const headingIndices = lines.flatMap((line, index) =>
    isPrefaceHeadingLine(line) ? [index] : [],
  );
  const options = headingIndices.map((headingIndex, position) => {
    const label = stripLeadingSectionNumber(lines[headingIndex] ?? "");
    const end = boundAtNextNumberedSection(
      lines,
      headingIndex,
      headingIndices[position + 1] ?? lines.length,
    );
    const inline = parseInlinePrefaceOption(
      label,
      lines.slice(headingIndex + 1, end),
    );
    return inline ?? { label, text: null };
  });
  const keys = new Set<string>();
  const uniqueOptions = options.filter((option) => {
    const key = `${normalizeHeading(option.label)}\u0000${option.text ?? ""}`;
    if (keys.has(key)) {
      return false;
    }
    keys.add(key);
    return true;
  });
  const normalizedTitle = normalizeHeading(title);
  const preferredOptions = normalizedTitle.includes("SUNDAY")
    ? uniqueOptions.filter((option) =>
        normalizeHeading(option.label).includes("SUNDAY"),
      )
    : uniqueOptions.filter((option) =>
        normalizeHeading(option.label).includes("WEEKDAY"),
      );
  return preferredOptions.length > 0 ? preferredOptions : uniqueOptions;
}

function isPrefaceHeadingLine(line: string) {
  const heading = normalizeHeading(line);
  const letters = Array.from(line).filter((character) => /\p{L}/u.test(character));
  return (
    /\bPREFACES?\b/u.test(heading) &&
    letters.length > 0 &&
    letters.every((character) => character === character.toUpperCase())
  );
}

function parseInlinePrefaceOption(
  heading: string,
  lines: readonly string[],
): MassProperPrefaceOption | null {
  const dialogueRoles = ["V", "R", "V", "R", "V", "R"] as const;
  const dialogueStarts: number[] = [];
  for (
    let start = 0;
    start <= lines.length - dialogueRoles.length;
    start += 1
  ) {
    if (
      dialogueRoles.every(
        (role, offset) => getPrefaceDialogueRole(lines[start + offset] ?? "") === role,
      )
    ) {
      dialogueStarts.push(start);
    }
  }
  if (dialogueStarts.length !== 1) {
    return null;
  }

  const dialogueStart = dialogueStarts[0] ?? -1;
  const dialogueEnd = dialogueStart + dialogueRoles.length;
  const prelude = lines.slice(0, dialogueStart);
  if (prelude.length > 1) {
    return null;
  }

  const sanctusIndices = lines.flatMap((line, index) =>
    index >= dialogueEnd &&
    normalizeHeading(line).startsWith("HOLY HOLY HOLY")
      ? [index]
      : [],
  );
  if (sanctusIndices.length !== 1) {
    return null;
  }
  const sanctusIndex = sanctusIndices[0] ?? -1;
  const trailingLines = lines.slice(sanctusIndex + 1);
  if (
    sanctusIndex <= dialogueEnd ||
    !isPostPrefaceRubric(joinText(trailingLines))
  ) {
    return null;
  }

  const text = joinText(lines.slice(dialogueEnd, sanctusIndex));
  if (text.split(/\s+/gu).filter(Boolean).length < 20) {
    return null;
  }

  const subtitle =
    prelude[0]?.replace(/^[\s:–—-]+/u, "").trim() ?? "";
  return {
    label: subtitle ? `${heading} · ${subtitle}` : heading,
    text,
  };
}

function isPostPrefaceRubric(line: string) {
  const heading = normalizeHeading(line);
  return (
    heading.length === 0 ||
    (heading.startsWith("WHEN ") &&
      heading.includes(" IS USED") &&
      heading.endsWith(" IS SAID"))
  );
}

function getPrefaceDialogueRole(line: string) {
  return /^([VR])(?:\.|\/|:)\s*/iu.exec(line.trim())?.[1]?.toUpperCase() ?? null;
}

function parseNamedAnchors(html: string) {
  const anchors: Array<{ end: number; index: number; name: string }> = [];
  const pattern =
    /<a\b[^>]*(?:name|id)\s*=\s*(?:["']([^"']+)["']|([^\s>]+))[^>]*>/giu;
  let match = pattern.exec(html);
  while (match) {
    anchors.push({
      end: (match.index ?? 0) + match[0].length,
      index: match.index ?? 0,
      name: decodeHtmlEntities(match[1] ?? match[2] ?? "").trim(),
    });
    match = pattern.exec(html);
  }
  return anchors;
}

function parsePrefaceOptionBlock(
  html: string,
): MassProperPrefaceOption | null {
  const headingMatch = /<b\b[^>]*>([\s\S]*?)<\/b>/iu.exec(html);
  if (!headingMatch) {
    return null;
  }
  const heading = htmlFragmentToText(headingMatch[1] ?? "");
  if (!/\bPREFACE\b/u.test(normalizeHeading(heading))) {
    return null;
  }

  let body = html.slice((headingMatch.index ?? 0) + headingMatch[0].length);
  const subtitleMatch =
    /^(?:(?:\s|&nbsp;|&#160;)*)<i\b[^>]*>([\s\S]*?)<\/i>/iu.exec(body);
  const subtitle = subtitleMatch
    ? htmlFragmentToText(subtitleMatch[1] ?? "")
    : "";
  if (subtitleMatch) {
    body = body.slice(subtitleMatch[0].length);
  }
  body = body.replace(/<i\b[^>]*>[\s\S]*?<\/i>/giu, " ");

  const lines = htmlToLines(body);
  const sanctusIndex = lines.findIndex((line) =>
    normalizeHeading(line).startsWith("HOLY HOLY HOLY"),
  );
  if (sanctusIndex < 0) {
    return null;
  }
  const text = joinText(lines.slice(0, sanctusIndex));
  if (text.split(/\s+/gu).filter(Boolean).length < 20) {
    return null;
  }

  return {
    label: subtitle ? `${heading} · ${subtitle}` : heading,
    text,
  };
}

function htmlFragmentToText(html: string) {
  return decodeHtmlEntities(html.replace(/<[^>]+>/gu, ""))
    .replace(/\s+/gu, " ")
    .trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function splitOptions(lines: readonly string[]) {
  const options: string[][] = [[]];
  for (const line of lines) {
    if (/^or\s*:?$/iu.test(line.trim())) {
      if (options[options.length - 1]?.length) {
        options.push([]);
      }
      continue;
    }
    options[options.length - 1]?.push(line);
  }
  return options.filter((option) => option.length > 0);
}

function htmlToLines(html: string) {
  const withoutLatin = removeLatinSpans(html)
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/giu, " ")
    .replace(/<\/?(?:br|p|div|tr|td|table|hr|li|h[1-6])\b[^>]*>/giu, "\n")
    .replace(/<\/(?:b|i|u)>/giu, "\n")
    .replace(/<[^>]+>/gu, "");

  return decodeHtmlEntities(withoutLatin)
    .split(/\r?\n/gu)
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter(Boolean);
}

function removeLatinSpans(html: string) {
  return html.replace(
    /<font\b[^>]*size\s*=\s*["']?-1["']?[^>]*>([\s\S]*?)<\/font>/giu,
    (_match, contents: string) => {
      const text = decodeHtmlEntities(contents.replace(/<[^>]+>/gu, ""))
        .replace(/\s+/gu, " ")
        .trim();
      return isHeadingFragment(text) ? contents : "";
    },
  );
}

function isHeadingFragment(text: string) {
  return (
    text.length > 0 &&
    text.length <= 40 &&
    /^[\p{Lu}\d\s-]+$/u.test(text)
  );
}

function findHeading(
  lines: readonly string[],
  heading: string,
  start = 0,
) {
  const normalizedHeading = normalizeHeading(heading);
  return lines.findIndex(
    (line, index) =>
      index >= Math.max(0, start) &&
      normalizeSectionHeading(line).startsWith(normalizedHeading),
  );
}

function findHeadingIndices(
  lines: readonly string[],
  heading: string,
  start = 0,
  end = lines.length,
) {
  const normalizedHeading = normalizeHeading(heading);
  return lines.flatMap((line, index) =>
    index >= Math.max(0, start) &&
    index < Math.min(lines.length, end) &&
    normalizeSectionHeading(line).startsWith(normalizedHeading)
      ? [index]
      : [],
  );
}

function normalizeHeading(text: string) {
  return decodeHtmlEntities(text)
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ")
    .toUpperCase();
}

function normalizeSectionHeading(text: string) {
  return normalizeHeading(text).replace(/^\d{1,3}\s+/u, "");
}

function stripLeadingSectionNumber(text: string) {
  return text.replace(/^\s*\d{1,3}(?:[.)])?\s+/u, "").trim();
}

function isNumberedSectionLine(line: string) {
  return (
    !isScriptureCitation(line) &&
    /^\s*\d{1,3}[.)]\s+\p{L}/u.test(line)
  );
}

function isAntiphonRubricHeading(line: string) {
  return normalizeHeading(line) === "AT THE MASS";
}

function isStructuralLine(line: string) {
  const heading = normalizeSectionHeading(line);
  return (
    heading === "READINGS" ||
    heading.startsWith("SUNDAY WEEK") ||
    heading.startsWith("DAILY MASS WEEK") ||
    heading.startsWith("PRAYER OVER THE OFFERINGS") ||
    heading.startsWith("COMMUNION ANTIPHON") ||
    heading.startsWith("PRAYER AFTER COMMUNION") ||
    heading === "AT THE MASS"
  );
}

function isScriptureCitation(line: string) {
  return (
    line.length <= 80 &&
    /^(?:Cf\.\s*)?(?:[1-3]\s*)?[\p{L}.]+(?:\s+[\p{L}.]+)?\s+\d/iu.test(
      line,
    )
  );
}

function isPrayerConclusion(line: string) {
  const normalized = line
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+amen$/u, "");
  return (
    normalized === "through christ our lord" ||
    normalized.endsWith("through christ our lord") ||
    normalized.endsWith("god for ever and ever") ||
    normalized.endsWith("who lives and reigns for ever and ever") ||
    normalized.endsWith("who live and reign for ever and ever")
  );
}

function normalizeCurrentUsConclusion(text: string) {
  return text.replace(/\bone God, for ever and ever\b/gu, "God, for ever and ever");
}

function joinText(lines: readonly string[]) {
  return lines
    .join(" ")
    .replace(/\s+([,.;:!?])/gu, "$1")
    .replace(/\s+/gu, " ")
    .trim();
}

function scoreTitleSimilarity(left: string, right: string) {
  const leftTokens = titleTokens(left);
  const rightTokens = titleTokens(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }
  const normalizedLeft = normalizeHeading(left);
  const normalizedRight = normalizeHeading(right);
  if (
    leftTokens.size >= 2 &&
    (` ${normalizedRight} `).includes(` ${normalizedLeft} `)
  ) {
    return 1;
  }
  const overlap = Array.from(leftTokens).filter((token) =>
    rightTokens.has(token),
  ).length;
  return overlap / Math.max(leftTokens.size, rightTokens.size);
}

function titleTokens(text: string) {
  return new Set(
    normalizeHeading(text)
      .toLowerCase()
      .split(" ")
      .flatMap(expandTitleToken)
      .filter((word) => word.length > 1 && !TITLE_STOP_WORDS.has(word)),
  );
}

function expandTitleToken(word: string) {
  if (/^(?:monday|tuesday|wednesday|thursday|friday|saturday)$/u.test(word)) {
    return [word, "weekday"];
  }
  return /^weekdays?$/u.test(word) ? ["weekday"] : [word];
}

function parseEnglishOrdinal(value: string) {
  const words = normalizeHeading(value).toLowerCase().split(" ");
  const smallNumbers: Readonly<Record<string, number>> = {
    first: 1,
    one: 1,
    second: 2,
    two: 2,
    third: 3,
    three: 3,
    fourth: 4,
    four: 4,
    fifth: 5,
    five: 5,
    sixth: 6,
    six: 6,
    seventh: 7,
    seven: 7,
    eighth: 8,
    eight: 8,
    ninth: 9,
    nine: 9,
    tenth: 10,
    ten: 10,
    eleventh: 11,
    eleven: 11,
    twelfth: 12,
    twelve: 12,
    thirteenth: 13,
    thirteen: 13,
    fourteenth: 14,
    fourteen: 14,
    fifteenth: 15,
    fifteen: 15,
    sixteenth: 16,
    sixteen: 16,
    seventeenth: 17,
    seventeen: 17,
    eighteenth: 18,
    eighteen: 18,
    nineteenth: 19,
    nineteen: 19,
  };
  const tens: Readonly<Record<string, number>> = {
    twentieth: 20,
    twenty: 20,
    thirtieth: 30,
    thirty: 30,
  };

  return words.reduce(
    (total, word) => total + (tens[word] ?? smallNumbers[word] ?? 0),
    0,
  );
}

function decodeHtmlEntities(value: string) {
  const named: Readonly<Record<string, string>> = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    mdash: "—",
    nbsp: " ",
    ndash: "–",
    quot: '"',
    rdquo: "”",
    rsquo: "’",
  };
  return value.replace(
    /&(#x[\da-f]+|#\d+|[a-z]+);/giu,
    (entity, key: string) => {
      if (key.startsWith("#x")) {
        return String.fromCodePoint(Number.parseInt(key.slice(2), 16));
      }
      if (key.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(key.slice(1), 10));
      }
      return named[key.toLowerCase()] ?? entity;
    },
  );
}

function slugify(value: string) {
  return normalizeHeading(value).toLowerCase().replace(/\s+/gu, "-");
}
