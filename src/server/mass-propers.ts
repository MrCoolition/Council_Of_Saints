import "server-only";

import type { MassCelebrationPropers } from "@/lib/mass-propers";
import {
  parseNamedMassPrefaceSourceDocument,
  parseMassPrefaceSourceDocument,
  parseMassPrefaceSourceReferences,
  parseMassPropersDocument,
  scopeMassProperSourceDocument,
} from "@/lib/mass-propers-parser";
import {
  canonicalTrustedIndexedHtmlUrl,
  discoverIndexedMassProperSource,
  listIndexedMassProperSources,
  planIndexedMassProperResolution,
  sourceDocumentTitleSimilarity,
  type IndexedMassProperSourceCandidate,
} from "@/lib/mass-propers-source";

const MISSAL_BASE_URL =
  "https://www.liturgies.net/Liturgies/Catholic/roman_missal/";
const MISSAL_INDEX_URL = `${MISSAL_BASE_URL}index.htm`;
const MISSAL_PREFACES_URL = `${MISSAL_BASE_URL}prefaces.htm`;
const SOURCE_REVALIDATE_SECONDS = 7 * 24 * 60 * 60;
const SOURCE_TIMEOUT_MS = 4_000;
const MAX_SOURCE_DOCUMENT_BYTES = 2_000_000;
const MIN_SOURCE_IDENTITY_SCORE = 0.6;
const MIN_SOURCE_CONTEXT_MARGIN = 0.12;

const NON_PROPER_SOURCE_PATHS = new Set([
  "index.htm",
  "prefaces.htm",
  "roman_missal_commons.htm",
  "roman_missal_order_of_mass.htm",
]);

export async function getMassCelebrationPropers({
  localDate,
  massForm,
  season,
  title,
  titleAliases = [],
}: {
  localDate: string;
  massForm?: "anticipated" | "daytime";
  season: string;
  title: string;
  titleAliases?: readonly string[];
}): Promise<MassCelebrationPropers | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(localDate) || !title.trim()) {
    return null;
  }

  const sourceSignal = AbortSignal.timeout(SOURCE_TIMEOUT_MS);
  const requestedTitles = uniqueTextValues([title, ...titleAliases]);
  let indexHtml: string;
  try {
    indexHtml = await fetchMissalDocument(
      MISSAL_INDEX_URL,
      sourceSignal,
    );
  } catch {
    // A source-index outage must not take down the manual Mass experience.
    return null;
  }

  const indexedSources = listIndexedMassProperSources({
    indexHtml,
    indexUrl: MISSAL_INDEX_URL,
  });
  const excludedSourceUrls = indexedSources
    .filter((candidate) => isNonProperSource(candidate.sourceUrl))
    .map((candidate) => candidate.sourceUrl);
  const directCandidate = discoverIndexedMassProperSource({
    excludedSourceUrls,
    indexHtml,
    indexUrl: MISSAL_INDEX_URL,
    titles: requestedTitles,
  });
  const seasonalCandidate = season.trim()
    ? discoverIndexedMassProperSource({
        excludedSourceUrls,
        indexHtml,
        indexUrl: MISSAL_INDEX_URL,
        titles: [season],
      })
    : null;
  const preferredCandidates = uniqueSourceDocuments([
    directCandidate,
    seasonalCandidate,
  ]);
  const resolutionPlan = planIndexedMassProperResolution({
    contextFallbackCandidates:
      getContextFallbackSourceCandidates(indexedSources),
    preferredCandidates,
  });
  if (resolutionPlan.candidates.length === 0) {
    return null;
  }
  const results = await resolveCandidates({
    candidates: resolutionPlan.candidates,
    indexedSources,
    localDate,
    massForm,
    requestedTitles,
    requireFragmentContext: resolutionPlan.requireFragmentContext,
    signal: sourceSignal,
    title,
    titleAliases,
  });
  return results.length === 1 ? results[0] ?? null : null;
}

async function resolveCandidates({
  candidates,
  indexedSources,
  localDate,
  massForm,
  requestedTitles,
  requireFragmentContext = false,
  signal,
  title,
  titleAliases,
}: {
  candidates: readonly IndexedMassProperSourceCandidate[];
  indexedSources: readonly IndexedMassProperSourceCandidate[];
  localDate: string;
  massForm?: "anticipated" | "daytime";
  requestedTitles: readonly string[];
  requireFragmentContext?: boolean;
  signal: AbortSignal;
  title: string;
  titleAliases: readonly string[];
}) {
  const results = await Promise.all(
    candidates.map((candidate) => {
      const sourceDocumentUrl = withoutHash(candidate.sourceUrl);
      return tryResolveSource(
        {
          localDate,
          massForm,
          requireFragmentContext,
          sourceContextUrls: indexedSources
            .filter(
              (source) =>
                !isNonProperSource(source.sourceUrl) &&
                withoutHash(source.sourceUrl) === sourceDocumentUrl,
            )
            .map((source) => source.sourceUrl),
          sourceLabelAlias: isMissalRootSource(candidate.sourceUrl)
            ? undefined
            : candidate.label,
          sourceUrl: candidate.sourceUrl,
          title,
          titleAliases,
          verifyTitles: requestedTitles,
        },
        signal,
        new Set([sourceDocumentUrl]),
      );
    }),
  );
  return results.filter(
    (result): result is MassCelebrationPropers => result !== null,
  );
}

async function tryResolveSource(
  input: {
    localDate: string;
    massForm?: "anticipated" | "daytime";
    requireFragmentContext?: boolean;
    sourceContextUrls?: readonly string[];
    sourceLabelAlias?: string;
    sourceUrl: string;
    title: string;
    titleAliases?: readonly string[];
    verifyTitles?: readonly string[];
  },
  signal: AbortSignal,
  allowedExactSourceUrls: ReadonlySet<string> = new Set(),
): Promise<MassCelebrationPropers | null> {
  try {
    return await resolveSource(input, signal, allowedExactSourceUrls);
  } catch {
    return null;
  }
}

async function resolveSource({
  localDate,
  massForm,
  requireFragmentContext,
  sourceContextUrls,
  sourceLabelAlias,
  sourceUrl,
  title,
  titleAliases,
  verifyTitles,
}: {
  localDate: string;
  massForm?: "anticipated" | "daytime";
  requireFragmentContext?: boolean;
  sourceContextUrls?: readonly string[];
  sourceLabelAlias?: string;
  sourceUrl: string;
  title: string;
  titleAliases?: readonly string[];
  verifyTitles?: readonly string[];
}, signal: AbortSignal, allowedExactSourceUrls: ReadonlySet<string>): Promise<MassCelebrationPropers | null> {
  const html = await fetchMissalDocument(
    sourceUrl,
    signal,
    allowedExactSourceUrls,
  );
  const resolvedSourceUrl = selectSourceContext({
    html,
    preferredSourceUrl: sourceUrl,
    sourceContextUrls,
    titles: verifyTitles ?? [title, ...(titleAliases ?? [])],
  });
  if (requireFragmentContext && !new URL(resolvedSourceUrl).hash) {
    return null;
  }
  const contextHtml = scopeMassProperSourceDocument(html, resolvedSourceUrl);
  if (contextHtml === null) {
    return null;
  }
  if (
    verifyTitles &&
    sourceDocumentTitleSimilarity({ html: contextHtml, titles: verifyTitles }) <
      MIN_SOURCE_IDENTITY_SCORE
  ) {
    return null;
  }
  const propers = parseMassPropersDocument({
    html,
    localDate,
    massForm,
    sourceLabel: `Roman Missal · ${title}`,
    sourceUrl: resolvedSourceUrl,
    title,
    titleAliases: uniqueTextValues([
      ...(titleAliases ?? []),
      sourceLabelAlias ?? "",
    ]),
  });
  if (!propers) {
    return null;
  }

  const references = parseMassPrefaceSourceReferences({
    html: contextHtml,
    prefaceOptions: propers.prefaceOptions,
    sourceUrl: resolvedSourceUrl,
  });
  const documents = new Map<string, Promise<string>>();
  const baseDocumentUrl = withoutHash(resolvedSourceUrl);
  const resolved = await Promise.all(
    references.map(async (reference) => {
      try {
        const documentUrl = withoutHash(reference.sourceUrl);
        let documentHtml: string;
        if (documentUrl === baseDocumentUrl) {
          documentHtml = html;
        } else {
          const pending = documents.get(documentUrl) ??
            fetchMissalDocument(
              documentUrl,
              signal,
              allowedExactSourceUrls,
            );
          documents.set(documentUrl, pending);
          documentHtml = await pending;
        }
        return {
          label: reference.label,
          options: parseMassPrefaceSourceDocument({
            html: documentHtml,
            reference,
          }),
        };
      } catch {
        return { label: reference.label, options: [] };
      }
    }),
  );
  const resolvedByLabel = new Map(
    resolved
      .filter((entry) => entry.options.length > 0)
      .map((entry) => [entry.label, entry.options] as const),
  );

  const unresolvedNamedOptions = propers.prefaceOptions.filter(
    (option) => option.text === null && !resolvedByLabel.has(option.label),
  );
  if (unresolvedNamedOptions.length > 0) {
    try {
      const centralDocumentUrl = withoutHash(MISSAL_PREFACES_URL);
      const pending = documents.get(centralDocumentUrl) ??
        fetchMissalDocument(
          centralDocumentUrl,
          signal,
          allowedExactSourceUrls,
        );
      documents.set(centralDocumentUrl, pending);
      const centralHtml = await pending;
      unresolvedNamedOptions.forEach((option) => {
        const named = parseNamedMassPrefaceSourceDocument({
          html: centralHtml,
          label: option.label,
        });
        if (named.length === 1) {
          resolvedByLabel.set(option.label, named);
        }
      });
    } catch {
      // Retain unresolved labels when central exact-name lookup is unavailable.
    }
  }

  return {
    ...propers,
    prefaceOptions: propers.prefaceOptions.flatMap(
      (option) => resolvedByLabel.get(option.label) ?? [option],
    ),
  };
}

function selectSourceContext({
  html,
  preferredSourceUrl,
  sourceContextUrls = [],
  titles,
}: {
  html: string;
  preferredSourceUrl: string;
  sourceContextUrls?: readonly string[];
  titles: readonly string[];
}) {
  if (new URL(preferredSourceUrl).hash) {
    return preferredSourceUrl;
  }

  const fragmentScores = uniqueTextValues(sourceContextUrls)
    .filter((sourceUrl) => new URL(sourceUrl).hash)
    .flatMap((sourceUrl) => {
      const scopedHtml = scopeMassProperSourceDocument(html, sourceUrl);
      return scopedHtml === null
        ? []
        : [{
            score: sourceDocumentTitleSimilarity({ html: scopedHtml, titles }),
            sourceUrl,
          }];
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.sourceUrl.localeCompare(right.sourceUrl),
    );
  const best = fragmentScores[0];
  const runnerUp = fragmentScores[1];
  return best &&
    best.score >= MIN_SOURCE_IDENTITY_SCORE &&
    (!runnerUp || best.score - runnerUp.score >= MIN_SOURCE_CONTEXT_MARGIN)
    ? best.sourceUrl
    : preferredSourceUrl;
}

function getContextFallbackSourceCandidates(
  candidates: readonly IndexedMassProperSourceCandidate[],
) {
  const contextDocuments = new Set(
    candidates.flatMap((candidate) => {
      const sourceUrl = new URL(candidate.sourceUrl);
      return sourceUrl.hash && !isNonProperSource(candidate.sourceUrl)
        ? [withoutHash(candidate.sourceUrl)]
        : [];
    }),
  );
  return uniqueSourceDocuments(
    candidates.filter((candidate) => {
      const sourceUrl = new URL(candidate.sourceUrl);
      return (
        !sourceUrl.hash &&
        contextDocuments.has(withoutHash(candidate.sourceUrl)) &&
        isMissalRootSource(candidate.sourceUrl) &&
        !isNonProperSource(candidate.sourceUrl)
      );
    }),
  );
}

function isMissalRootSource(value: string) {
  return new URL(value).pathname.startsWith(new URL(MISSAL_BASE_URL).pathname);
}

function uniqueSourceDocuments(
  candidates: readonly (IndexedMassProperSourceCandidate | null)[],
) {
  const documents = new Set<string>();
  return candidates.flatMap((candidate) => {
    if (!candidate) {
      return [];
    }
    const documentUrl = withoutHash(candidate.sourceUrl);
    if (documents.has(documentUrl)) {
      return [];
    }
    documents.add(documentUrl);
    return [candidate];
  });
}

function uniqueTextValues(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isNonProperSource(value: string) {
  const sourceUrl = new URL(value);
  const relativePath = sourceUrl.pathname.startsWith(
    new URL(MISSAL_BASE_URL).pathname,
  )
    ? sourceUrl.pathname.slice(new URL(MISSAL_BASE_URL).pathname.length)
    : "";
  return NON_PROPER_SOURCE_PATHS.has(relativePath);
}

function withoutHash(value: string) {
  const url = new URL(value);
  url.hash = "";
  return url.toString();
}

async function fetchMissalDocument(
  url: string,
  signal: AbortSignal,
  allowedExactSourceUrls: ReadonlySet<string> = new Set(),
) {
  const canonicalUrl = canonicalTrustedIndexedHtmlUrl(
    url,
    MISSAL_INDEX_URL,
  );
  if (!canonicalUrl) {
    throw new Error("Untrusted Roman Missal source URL");
  }
  const parsedUrl = new URL(canonicalUrl);
  const documentUrl = withoutHash(parsedUrl.toString());
  if (
    !parsedUrl.pathname.startsWith("/Liturgies/Catholic/roman_missal/") &&
    !allowedExactSourceUrls.has(documentUrl)
  ) {
    throw new Error("Untrusted Roman Missal source URL");
  }
  parsedUrl.hash = "";

  const response = await fetch(parsedUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml;q=0.9",
      "User-Agent":
        "Sanctum Council/1.0 (+https://council-of-saints.vercel.app)",
    },
    next: { revalidate: SOURCE_REVALIDATE_SECONDS },
    redirect: "error",
    signal,
  } satisfies RequestInit & { next: { revalidate: number } });
  if (!response.ok) {
    throw new Error(`Roman Missal source unavailable (${response.status})`);
  }
  const contentType = response.headers.get("content-type");
  const contentLength = Number(response.headers.get("content-length"));
  if (
    (contentType &&
      !/^(?:text\/html|application\/xhtml\+xml)(?:;|$)/iu.test(contentType)) ||
    (Number.isFinite(contentLength) &&
      contentLength > MAX_SOURCE_DOCUMENT_BYTES)
  ) {
    throw new Error("Roman Missal source returned an invalid HTML document");
  }
  const html = await response.text();
  if (html.length > MAX_SOURCE_DOCUMENT_BYTES) {
    throw new Error("Roman Missal source document exceeds the size limit");
  }
  return html;
}
