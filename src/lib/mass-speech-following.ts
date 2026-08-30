const DEFAULT_MIN_WORDS = 8;
const DEFAULT_MAX_WORDS = 12;
const DEFAULT_BRIDGE_TAIL_WORDS = 4;
const MAX_MATCH_WINDOW_WORDS =
  DEFAULT_MAX_WORDS + DEFAULT_BRIDGE_TAIL_WORDS;
const FORWARD_TARGET_WINDOW = 16;
const MIN_PROSE_EVIDENCE_WORDS = 4;
const MIN_GLOBAL_INFORMATIVE_WORDS = 5;
const MIN_GLOBAL_SCORE = 0.75;
const MIN_GLOBAL_WINNER_MARGIN = 0.15;
const MIN_FORWARD_SCORE = 0.68;
const MIN_GLOBAL_POSTING_OVERLAP = 2;
const DISTINCTIVE_NGRAM_WORDS = 4;
const MIN_FUZZY_EXACT_ANCHORS = 3;
const FUZZY_TOKEN_WEIGHT = 0.72;

const IGNORED_RECOGNITION_WORDS = new Set([
  "applause",
  "erm",
  "hmm",
  "music",
  "singing",
  "uh",
  "um",
]);

const UNINFORMATIVE_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "been",
  "but",
  "by",
  "for",
  "from",
  "had",
  "has",
  "have",
  "he",
  "her",
  "him",
  "his",
  "i",
  "in",
  "into",
  "is",
  "it",
  "its",
  "may",
  "my",
  "nor",
  "not",
  "of",
  "on",
  "or",
  "our",
  "she",
  "so",
  "that",
  "the",
  "their",
  "them",
  "they",
  "this",
  "through",
  "to",
  "us",
  "was",
  "we",
  "were",
  "who",
  "with",
  "you",
  "your",
]);

export type MassSpeechCandidateMode = "prose" | "response";

export type MassSpeechCandidate = {
  id: string;
  order: number;
  text: string;
  label?: string;
  /**
   * Additional recognition phrases for this same visible target. The visible
   * text is always included, so bridge text must never replace it.
   */
  matchTexts?: readonly string[];
  /**
   * Prose can be found in the bounded forward window or by distinctive global
   * reacquisition. Responses can only match the immediate next target.
   *
   * Omitted mode defaults to prose for compatibility with existing callers.
   */
  mode?: MassSpeechCandidateMode;
};

export type MassSpeechRunnerUp = {
  candidate: MassSpeechCandidate;
  score: number;
};

export type MassSpeechMatch = {
  candidate: MassSpeechCandidate;
  score: number;
  scope: "forward" | "global";
  runnerUp: MassSpeechRunnerUp | null;
  margin: number;
  matchedInformativeWords: number;
  /**
   * One means the immediate next distinct target order. Initial acquisition
   * has no distance because there is no committed position yet.
   */
  orderDistance: number | null;
};

export type MassSpeechEvidenceState = {
  acceptedFingerprint: string | null;
  pending: {
    count: number;
    fingerprint: string;
    lastObservedAt: number;
    observedAt: number;
    targetKey: string;
  } | null;
};

type AdvanceMassSpeechEvidenceInput = {
  acceptImmediately: boolean;
  allowAcceptedFingerprintReuse?: boolean;
  confirmationWindowMs: number;
  final: boolean;
  fingerprint: string;
  repeatConfirmationDelayMs?: number;
  now: number;
  state: MassSpeechEvidenceState;
  targetKey: string;
};

export type MassSpeechEvidenceDecision = {
  accepted: boolean;
  state: MassSpeechEvidenceState;
};

type FindMassSpeechMatchInput = {
  transcript: string;
  candidates: readonly MassSpeechCandidate[];
  currentOrder?: number;
  allowGlobal?: boolean;
};

type FindPreparedMassSpeechMatchInput = {
  transcript: string;
  prepared: PreparedMassSpeechCandidates;
  currentOrder?: number;
  allowGlobal?: boolean;
};

type PreparedVariation = {
  normalized: string;
  tokens: readonly string[];
  ngrams: ReadonlySet<string>;
};

type PreparedCandidate = {
  candidate: MassSpeechCandidate;
  index: number;
  mode: MassSpeechCandidateMode;
  variations: readonly PreparedVariation[];
};

export type PreparedMassSpeechCandidates = {
  readonly candidates: readonly MassSpeechCandidate[];
  readonly preparedCandidates: readonly PreparedCandidate[];
  readonly distinctOrders: readonly number[];
  readonly postings: ReadonlyMap<string, readonly number[]>;
  readonly tokenDocumentFrequency: ReadonlyMap<string, number>;
  readonly ngramDocumentFrequency: ReadonlyMap<string, number>;
};

type ScoreEvidence = {
  candidateWindow: readonly string[];
  matchedInformativeWords: number;
  score: number;
  transcriptWindow: readonly string[];
  variation: PreparedVariation;
};

type ScoredCandidate = ScoreEvidence & {
  preparedCandidate: PreparedCandidate;
};

type AlignmentCell = {
  exactMatches: number;
  fuzzyMatches: number;
  informativeMatches: number;
  rawScore: number;
  startCandidateIndex: number;
  startTranscriptIndex: number;
  weightedMatches: number;
};

export type MassSpeechAcceptanceDecision = {
  acceptImmediately: boolean;
  eligible: boolean;
  reason:
    | "eligible"
    | "insufficient-informative-words"
    | "insufficient-margin"
    | "insufficient-score";
};

export type MassSpeechAcceptanceInput = {
  alternativeRank?: number;
  final: boolean;
  initial: boolean;
  match: MassSpeechMatch;
  requiresConfirmation?: boolean;
  requiresUniqueMatch?: boolean;
};

export type MassSpeechContextPhrase = {
  boost: number;
  text: string;
};

const preparedCandidateCache = new WeakMap<
  readonly MassSpeechCandidate[],
  PreparedMassSpeechCandidates
>();

export function createMassSpeechEvidenceState(): MassSpeechEvidenceState {
  return {
    acceptedFingerprint: null,
    pending: null,
  };
}

/**
 * Applies the streaming-evidence rules without touching browser state. Rapid
 * duplicate interims count once, stable wording can confirm after a brief
 * settle delay, corrections to another target start fresh, and accepted
 * evidence cannot advance another target unless the caller explicitly marks an
 * immediate repeated response.
 */
export function advanceMassSpeechEvidence({
  acceptImmediately,
  allowAcceptedFingerprintReuse = false,
  confirmationWindowMs,
  final,
  fingerprint,
  now,
  repeatConfirmationDelayMs = 280,
  state,
  targetKey,
}: AdvanceMassSpeechEvidenceInput): MassSpeechEvidenceDecision {
  if (
    !fingerprint ||
    !Number.isFinite(now) ||
    confirmationWindowMs < 0 ||
    repeatConfirmationDelayMs < 0 ||
    (state.acceptedFingerprint === fingerprint &&
      !allowAcceptedFingerprintReuse)
  ) {
    return { accepted: false, state };
  }

  if (acceptImmediately) {
    return {
      accepted: true,
      state: {
        acceptedFingerprint: fingerprint,
        pending: null,
      },
    };
  }

  const pending = state.pending;
  const pendingIsFresh =
    pending !== null &&
    now - pending.observedAt <= confirmationWindowMs;
  if (
    pendingIsFresh &&
    pending.targetKey === targetKey &&
    pending.fingerprint === fingerprint
  ) {
    const stableInterimHasSettled =
      now - pending.observedAt >= repeatConfirmationDelayMs;
    if (!final && !stableInterimHasSettled) {
      return {
        accepted: false,
        state: {
          acceptedFingerprint: state.acceptedFingerprint,
          pending: {
            ...pending,
            lastObservedAt: now,
          },
        },
      };
    }
  }

  const count =
    pendingIsFresh && pending.targetKey === targetKey
      ? pending.count + 1
      : 1;
  if (count >= 2) {
    return {
      accepted: true,
      state: {
        acceptedFingerprint: fingerprint,
        pending: null,
      },
    };
  }

  return {
    accepted: false,
    state: {
      acceptedFingerprint: state.acceptedFingerprint,
      pending: {
        count,
        fingerprint,
        lastObservedAt: now,
        observedAt: now,
        targetKey,
      },
    },
  };
}

/**
 * Converts a raw best match into a streaming acceptance tier. Nearby prose is
 * intentionally quick, while skips, global reacquisition, lower-ranked speech
 * alternatives, and targets that reveal a variant need progressively stronger
 * evidence. The returned `eligible` result still flows through the independent
 * evidence confirmer unless `acceptImmediately` is true.
 */
export function evaluateMassSpeechAcceptance({
  alternativeRank = 0,
  final,
  initial,
  match,
  requiresConfirmation = false,
  requiresUniqueMatch = false,
}: MassSpeechAcceptanceInput): MassSpeechAcceptanceDecision {
  const safeAlternativeRank = Math.max(0, Math.min(2, alternativeRank));
  const isImmediateResponse =
    (match.candidate.mode ?? "prose") === "response" &&
    match.scope === "forward" &&
    match.orderDistance === 1;
  const candidateWordCount = normalizeMassSpeech(match.candidate.text)
    .split(" ")
    .filter(Boolean).length;
  const isShortSequentialFormula =
    !requiresUniqueMatch &&
    (match.candidate.mode ?? "prose") === "prose" &&
    match.scope === "forward" &&
    match.orderDistance === 1 &&
    candidateWordCount >= 4 &&
    candidateWordCount <= 8;

  if (isImmediateResponse) {
    const eligible =
      match.score === 1 &&
      (!requiresUniqueMatch || match.margin >= 0.12);
    return {
      acceptImmediately:
        eligible &&
        !requiresUniqueMatch &&
        !requiresConfirmation &&
        (final || safeAlternativeRank === 0),
      eligible,
      reason:
        match.score !== 1
          ? "insufficient-score"
          : eligible
            ? "eligible"
            : "insufficient-margin",
    };
  }

  let minimumScore: number;
  let minimumMargin: number;
  let minimumInformativeWords: number;

  if (initial) {
    minimumScore = 0.75;
    minimumMargin = 0.15;
    minimumInformativeWords = 5;
  } else if (match.scope === "global") {
    minimumScore = 0.82;
    minimumMargin = 0.15;
    minimumInformativeWords = 5;
  } else if ((match.orderDistance ?? Number.POSITIVE_INFINITY) === 1) {
    minimumScore = isShortSequentialFormula ? 0.8 : 0.7;
    minimumMargin = isShortSequentialFormula ? 0 : 0.03;
    minimumInformativeWords = isShortSequentialFormula ? 1 : 3;
  } else if ((match.orderDistance ?? Number.POSITIVE_INFINITY) <= 4) {
    minimumScore = 0.8;
    minimumMargin = 0.08;
    minimumInformativeWords = 4;
  } else {
    minimumScore = 0.86;
    minimumMargin = 0.12;
    minimumInformativeWords = 5;
  }

  minimumScore +=
    safeAlternativeRank * (isShortSequentialFormula ? 0.01 : 0.035);
  minimumMargin +=
    safeAlternativeRank * (isShortSequentialFormula ? 0 : 0.015);
  if (requiresUniqueMatch) {
    minimumScore = Math.max(
      minimumScore,
      candidateWordCount <= 8 ? 0.82 : 0.88,
    );
    minimumMargin = Math.max(minimumMargin, 0.12);
  }

  if (match.matchedInformativeWords < minimumInformativeWords) {
    return {
      acceptImmediately: false,
      eligible: false,
      reason: "insufficient-informative-words",
    };
  }
  if (match.score < minimumScore) {
    return {
      acceptImmediately: false,
      eligible: false,
      reason: "insufficient-score",
    };
  }
  if (match.margin < minimumMargin) {
    return {
      acceptImmediately: false,
      eligible: false,
      reason: "insufficient-margin",
    };
  }

  const strongKnownSkip =
    !requiresUniqueMatch &&
    !requiresConfirmation &&
    final &&
    match.scope === "forward" &&
    (match.orderDistance ?? Number.POSITIVE_INFINITY) > 1 &&
    match.score >=
      ((match.orderDistance ?? Number.POSITIVE_INFINITY) <= 4
        ? 0.92
        : 0.94) +
        safeAlternativeRank * 0.01 &&
    match.margin >= 0.14 + safeAlternativeRank * 0.02 &&
    match.matchedInformativeWords >=
      ((match.orderDistance ?? Number.POSITIVE_INFINITY) <= 4 ? 6 : 7);
  const fastImmediateTarget =
    !requiresUniqueMatch &&
    !requiresConfirmation &&
    final &&
    match.scope === "forward" &&
    match.orderDistance === 1 &&
    match.score >=
      (isShortSequentialFormula ? 0.8 : 0.84) +
        safeAlternativeRank * (isShortSequentialFormula ? 0.01 : 0.04) &&
    match.margin >=
      (isShortSequentialFormula ? 0 : 0.05) +
        safeAlternativeRank * (isShortSequentialFormula ? 0 : 0.02) &&
    match.matchedInformativeWords >=
      (isShortSequentialFormula ? 1 : 4);
  return {
    acceptImmediately:
      (initial && final && !requiresConfirmation) ||
      strongKnownSkip ||
      fastImmediateTarget,
    eligible: true,
    reason: "eligible",
  };
}

/**
 * Produces the comparison form used by Mass speech following. The normalized
 * value is deliberately display-agnostic and must not replace visible copy.
 */
export function normalizeMassSpeech(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/&/gu, " and ")
    .replace(/[\u2019']/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

/**
 * Adds one browser recognition segment to a bounded transcript window. Browser
 * engines frequently replay four or more trailing words in the next result;
 * removing only those long overlaps avoids duplicated prose without collapsing
 * legitimate short repetitions such as "Amen. Amen."
 */
export function appendMassSpeechWordWindow(
  currentWords: readonly string[],
  transcript: string,
  maxWords = 24,
) {
  if (!Number.isInteger(maxWords) || maxWords < 1) {
    throw new RangeError("Mass speech word windows require a positive size");
  }

  const existingWords = currentWords.filter(
    (word) => !IGNORED_RECOGNITION_WORDS.has(normalizeMassSpeech(word)),
  );
  const incomingWords = transcript
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .filter(
      (word) => !IGNORED_RECOGNITION_WORDS.has(normalizeMassSpeech(word)),
    );
  const maximumOverlap = Math.min(
    existingWords.length,
    incomingWords.length,
  );
  let overlap = 0;
  for (let length = maximumOverlap; length >= 4; length -= 1) {
    const existingTail = existingWords
      .slice(-length)
      .map(normalizeMassSpeech);
    const incomingHead = incomingWords.slice(0, length).map(normalizeMassSpeech);
    if (
      existingTail.every(
        (word, index) => word.length > 0 && word === incomingHead[index],
      )
    ) {
      overlap = length;
      break;
    }
  }

  return [...existingWords, ...incomingWords.slice(overlap)].slice(-maxWords);
}

/**
 * Counts exact informative words contributed by the newest recognition
 * segment for one candidate. Matching may use rolling context, but streaming
 * confirmation must not be satisfied by an old phrase plus unrelated new
 * speech.
 */
export function countMassSpeechFreshInformativeWords(
  transcript: string,
  candidate: MassSpeechCandidate,
) {
  const candidateWords = new Set<string>();
  for (const text of [candidate.text, ...(candidate.matchTexts ?? [])]) {
    for (const variation of createRecognitionVariations(text)) {
      tokenize(variation)
        .filter(isInformativeWord)
        .forEach((word) => candidateWords.add(word));
    }
  }

  return new Set(
    tokenize(transcript).filter(
      (word) => isInformativeWord(word) && candidateWords.has(word),
    ),
  ).size;
}

/**
 * Builds a small, forward-only phrase list for browsers that implement Web
 * Speech contextual biasing. Only distinctive prose is included; short common
 * responses are deliberately left unbiased so the recognizer is not coaxed
 * into inventing an Amen or another transition.
 */
export function createMassSpeechContextPhrases(
  candidates: readonly MassSpeechCandidate[],
  currentOrder: number | null | undefined,
): MassSpeechContextPhrase[] {
  if (currentOrder === null || currentOrder === undefined) {
    return [];
  }

  const futureOrders = Array.from(
    new Set(
      candidates
        .map((candidate) => candidate.order)
        .filter((order) => order > currentOrder),
    ),
  )
    .sort((left, right) => left - right)
    .slice(0, FORWARD_TARGET_WINDOW);
  const orderRanks = new Map(
    futureOrders.map((order, index) => [order, index]),
  );
  const phrases = new Map<string, MassSpeechContextPhrase>();

  for (const candidate of candidates) {
    const orderRank = orderRanks.get(candidate.order);
    const text = candidate.text.trim();
    const normalized = normalizeMassSpeech(text);
    const tokens = tokenize(text);
    if (
      orderRank === undefined ||
      (candidate.mode ?? "prose") !== "prose" ||
      !normalized ||
      countInformativeWords(tokens) < 4 ||
      phrases.has(normalized)
    ) {
      continue;
    }

    phrases.set(normalized, {
      boost: orderRank < 4 ? 1.8 : 1.1,
      text,
    });
    if (phrases.size >= 48) {
      break;
    }
  }

  return Array.from(phrases.values());
}

/**
 * Splits long spoken copy into balanced, non-overlapping display passages.
 * Every passage is an exact slice of the input, so joining the result always
 * reproduces the original punctuation, casing, and whitespace.
 *
 * Eight-to-twelve-word chunks are preferred. A thirteen-to-fifteen-word input
 * stays whole because splitting it would create undersized fragments.
 */
export function splitMassSpeechText(
  text: string,
  minWords = DEFAULT_MIN_WORDS,
  maxWords = DEFAULT_MAX_WORDS,
): string[] {
  assertWordBounds(minWords, maxWords);

  if (text.length === 0) {
    return [];
  }

  const wordStarts: number[] = [];
  const wordPattern = /[\p{L}\p{N}]+(?:[\u2019'][\p{L}\p{N}]+)*/gu;
  let wordMatch = wordPattern.exec(text);
  while (wordMatch) {
    wordStarts.push(wordMatch.index);
    wordMatch = wordPattern.exec(text);
  }

  if (wordStarts.length === 0 || wordStarts.length <= maxWords) {
    return [text];
  }

  const minimumPassageCount = Math.ceil(wordStarts.length / maxWords);
  const maximumPassageCount = Math.floor(wordStarts.length / minWords);
  const passageCount =
    minimumPassageCount <= maximumPassageCount
      ? minimumPassageCount
      : Math.max(1, maximumPassageCount);
  const basePassageWords = Math.floor(wordStarts.length / passageCount);
  const extraWords = wordStarts.length % passageCount;
  const passages: string[] = [];
  let passageStart = 0;
  let consumedWords = 0;

  for (let index = 0; index < passageCount; index += 1) {
    consumedWords += basePassageWords + (index < extraWords ? 1 : 0);
    const passageEnd =
      consumedWords < wordStarts.length
        ? wordStarts[consumedWords]
        : text.length;
    passages.push(text.slice(passageStart, passageEnd));
    passageStart = passageEnd;
  }

  return passages;
}

/**
 * Creates a matcher-only phrase that overlaps the previous prose tail with the
 * current visible chunk. This lets a rolling transcript cross a chunk boundary
 * without changing visible wording, element IDs, or target order.
 */
export function createMassSpeechBridgeText(
  previousText: string | null | undefined,
  currentText: string,
  previousTailWords = DEFAULT_BRIDGE_TAIL_WORDS,
): string | null {
  if (!Number.isInteger(previousTailWords) || previousTailWords < 1) {
    throw new RangeError(
      "Mass speech bridge tails must contain a positive integer number of words",
    );
  }

  const previousTokens = tokenize(previousText ?? "");
  const normalizedCurrent = normalizeMassSpeech(currentText);
  if (previousTokens.length === 0 || normalizedCurrent.length === 0) {
    return null;
  }

  return [
    ...previousTokens.slice(-previousTailWords),
    normalizedCurrent,
  ].join(" ");
}

/**
 * Prepares immutable Mass targets once per registry rebuild. Recognition events
 * can then reuse tokens, postings, order groups, and distinctiveness metadata.
 */
export function prepareMassSpeechCandidates(
  candidates: readonly MassSpeechCandidate[],
): PreparedMassSpeechCandidates {
  const preparedCandidates: PreparedCandidate[] = candidates.map(
    (candidate, index) => {
      const normalizedVariations = new Map<string, PreparedVariation>();
      for (const matchText of [candidate.text, ...(candidate.matchTexts ?? [])]) {
        for (const normalized of createRecognitionVariations(matchText)) {
          if (!normalized || normalizedVariations.has(normalized)) {
            continue;
          }
          const tokens = tokenize(normalized);
          if (tokens.length === 0) {
            continue;
          }
          normalizedVariations.set(normalized, {
            ngrams: new Set(createNgrams(tokens, DISTINCTIVE_NGRAM_WORDS)),
            normalized,
            tokens,
          });
        }
      }

      return {
        candidate,
        index,
        mode: candidate.mode ?? "prose",
        variations: Array.from(normalizedVariations.values()),
      };
    },
  );

  const tokenDocumentFrequency = new Map<string, number>();
  const ngramDocumentFrequency = new Map<string, number>();
  const mutablePostings = new Map<string, Set<number>>();

  preparedCandidates.forEach((preparedCandidate, candidateIndex) => {
    const candidateTokens = new Set<string>();
    const candidateNgrams = new Set<string>();
    for (const variation of preparedCandidate.variations) {
      variation.tokens.forEach((token) => {
        if (isInformativeWord(token)) {
          candidateTokens.add(token);
        }
      });
      variation.ngrams.forEach((ngram) => candidateNgrams.add(ngram));
    }

    candidateTokens.forEach((token) => {
      tokenDocumentFrequency.set(
        token,
        (tokenDocumentFrequency.get(token) ?? 0) + 1,
      );
      const posting = mutablePostings.get(token) ?? new Set<number>();
      posting.add(candidateIndex);
      mutablePostings.set(token, posting);
    });
    candidateNgrams.forEach((ngram) => {
      ngramDocumentFrequency.set(
        ngram,
        (ngramDocumentFrequency.get(ngram) ?? 0) + 1,
      );
    });
  });

  const postings = new Map<string, readonly number[]>();
  mutablePostings.forEach((candidateIndexes, token) => {
    postings.set(token, Array.from(candidateIndexes));
  });

  return {
    candidates,
    distinctOrders: Array.from(
      new Set(candidates.map((candidate) => candidate.order)),
    ).sort((left, right) => left - right),
    ngramDocumentFrequency,
    postings,
    preparedCandidates,
    tokenDocumentFrequency,
  };
}

/**
 * Finds a match using a pretokenized target index. Once a position has been
 * acquired, every result is strictly later than the committed order.
 */
export function findPreparedMassSpeechMatch({
  transcript,
  prepared,
  currentOrder,
  allowGlobal = currentOrder === undefined,
}: FindPreparedMassSpeechMatchInput): MassSpeechMatch | null {
  const transcriptTokens = tokenize(transcript);
  if (
    transcriptTokens.length === 0 ||
    prepared.preparedCandidates.length === 0
  ) {
    return null;
  }

  let forwardMatch: MassSpeechMatch | null = null;
  if (currentOrder !== undefined) {
    const futureOrders = prepared.distinctOrders.filter(
      (order) => order > currentOrder,
    );
    const forwardOrderSequence = futureOrders.slice(0, FORWARD_TARGET_WINDOW);
    const immediateNextOrder = forwardOrderSequence[0];
    const forwardOrders = new Set(forwardOrderSequence);
    const forwardOrderRanks = new Map(
      forwardOrderSequence.map((order, index) => [order, index + 1]),
    );
    const forwardCandidateIndexes = prepared.preparedCandidates
      .filter(
        (entry) =>
          forwardOrders.has(entry.candidate.order) &&
          (entry.mode === "prose" ||
            entry.candidate.order === immediateNextOrder),
      )
      .map((entry) => entry.index);
    const forward = rankPreparedCandidates({
      candidateIndexes: forwardCandidateIndexes,
      orderRanks: forwardOrderRanks,
      prepared,
      transcriptTokens,
    });
    const bestForward = forward[0];
    if (bestForward && bestForward.score >= MIN_FORWARD_SCORE) {
      forwardMatch = toMatch(
        bestForward,
        forward,
        "forward",
        forwardOrderRanks,
      );
      if (!allowGlobal) {
        return forwardMatch;
      }
    }
  }

  if (
    !allowGlobal ||
    countInformativeWords(transcriptTokens) < MIN_GLOBAL_INFORMATIVE_WORDS
  ) {
    return forwardMatch;
  }

  const globalCandidateIndexes = getGlobalCandidateIndexes({
    currentOrder,
    prepared,
    transcriptTokens,
  });
  const global = rankPreparedCandidates({
    candidateIndexes: globalCandidateIndexes,
    prepared,
    transcriptTokens,
  });
  const bestGlobal = global[0];
  if (
    !bestGlobal ||
    bestGlobal.score < MIN_GLOBAL_SCORE ||
    bestGlobal.matchedInformativeWords < MIN_GLOBAL_INFORMATIVE_WORDS ||
    !isDistinctiveGlobalMatch(bestGlobal, prepared)
  ) {
    return forwardMatch;
  }

  const runnerUp = getRunnerUp(bestGlobal, global);
  if (
    runnerUp &&
    bestGlobal.score - runnerUp.score < MIN_GLOBAL_WINNER_MARGIN
  ) {
    return forwardMatch;
  }

  const globalMatch = toMatch(
    bestGlobal,
    global,
    "global",
    undefined,
    currentOrder,
  );
  if (!forwardMatch) {
    return globalMatch;
  }
  if (globalMatch.candidate.id === forwardMatch.candidate.id) {
    return forwardMatch;
  }

  return globalMatch.score >= 0.9 &&
    globalMatch.score - forwardMatch.score >= 0.1
    ? globalMatch
    : forwardMatch;
}

/**
 * Compatibility wrapper for existing callers. Immutable candidate arrays are
 * cached, while new code can prepare explicitly at target-registration time.
 */
export function findMassSpeechMatch({
  transcript,
  candidates,
  currentOrder,
  allowGlobal = currentOrder === undefined,
}: FindMassSpeechMatchInput): MassSpeechMatch | null {
  let prepared = preparedCandidateCache.get(candidates);
  if (!prepared) {
    prepared = prepareMassSpeechCandidates(candidates);
    preparedCandidateCache.set(candidates, prepared);
  }

  return findPreparedMassSpeechMatch({
    allowGlobal,
    currentOrder,
    prepared,
    transcript,
  });
}

function getGlobalCandidateIndexes({
  currentOrder,
  prepared,
  transcriptTokens,
}: {
  currentOrder: number | undefined;
  prepared: PreparedMassSpeechCandidates;
  transcriptTokens: readonly string[];
}) {
  const overlapCounts = new Map<number, number>();
  const informativeTranscriptTokens = new Set(
    transcriptTokens.filter(isInformativeWord),
  );

  informativeTranscriptTokens.forEach((token) => {
    for (const candidateIndex of prepared.postings.get(token) ?? []) {
      overlapCounts.set(
        candidateIndex,
        (overlapCounts.get(candidateIndex) ?? 0) + 1,
      );
    }
  });

  return Array.from(overlapCounts.entries())
    .filter(([candidateIndex, overlap]) => {
      const entry = prepared.preparedCandidates[candidateIndex];
      return Boolean(
        entry &&
          overlap >= MIN_GLOBAL_POSTING_OVERLAP &&
          entry.mode === "prose" &&
          (currentOrder === undefined ||
            entry.candidate.order > currentOrder),
      );
    })
    .map(([candidateIndex]) => candidateIndex);
}

function rankPreparedCandidates({
  candidateIndexes,
  orderRanks,
  prepared,
  transcriptTokens,
}: {
  candidateIndexes: readonly number[];
  orderRanks?: ReadonlyMap<number, number>;
  prepared: PreparedMassSpeechCandidates;
  transcriptTokens: readonly string[];
}) {
  const scored: ScoredCandidate[] = [];

  for (const candidateIndex of candidateIndexes) {
    const preparedCandidate = prepared.preparedCandidates[candidateIndex];
    if (!preparedCandidate || preparedCandidate.variations.length === 0) {
      continue;
    }

    const evidence =
      preparedCandidate.mode === "response"
        ? scoreResponse(transcriptTokens, preparedCandidate.variations)
        : scoreProse(transcriptTokens, preparedCandidate.variations);
    if (evidence && evidence.score > 0) {
      scored.push({ ...evidence, preparedCandidate });
    }
  }

  return scored.sort((left, right) => {
    const scoreDifference = right.score - left.score;
    if (Math.abs(scoreDifference) > Number.EPSILON) {
      return scoreDifference;
    }

    if (left.matchedInformativeWords !== right.matchedInformativeWords) {
      return (
        right.matchedInformativeWords - left.matchedInformativeWords
      );
    }

    if (orderRanks) {
      const leftRank =
        orderRanks.get(left.preparedCandidate.candidate.order) ??
        Number.MAX_SAFE_INTEGER;
      const rightRank =
        orderRanks.get(right.preparedCandidate.candidate.order) ??
        Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
    }

    if (
      left.preparedCandidate.candidate.order !==
      right.preparedCandidate.candidate.order
    ) {
      return (
        left.preparedCandidate.candidate.order -
        right.preparedCandidate.candidate.order
      );
    }
    return left.preparedCandidate.index - right.preparedCandidate.index;
  });
}

function scoreResponse(
  transcriptTokens: readonly string[],
  variations: readonly PreparedVariation[],
): ScoreEvidence | null {
  let best: ScoreEvidence | null = null;
  for (const variation of variations) {
    const candidateTokens = variation.tokens;
    if (
      candidateTokens.length === 0 ||
      transcriptTokens.length < candidateTokens.length
    ) {
      continue;
    }

    const offset = transcriptTokens.length - candidateTokens.length;
    if (
      !candidateTokens.every(
        (token, index) => transcriptTokens[offset + index] === token,
      )
    ) {
      continue;
    }

    const evidence: ScoreEvidence = {
      candidateWindow: candidateTokens,
      matchedInformativeWords: countInformativeWords(candidateTokens),
      score: 1,
      transcriptWindow: transcriptTokens.slice(offset),
      variation,
    };
    if (!best || isBetterEvidence(evidence, best)) {
      best = evidence;
    }
  }
  return best;
}

function scoreProse(
  transcriptTokens: readonly string[],
  variations: readonly PreparedVariation[],
): ScoreEvidence | null {
  let best: ScoreEvidence | null = null;
  for (const variation of variations) {
    const evidence = scoreOrderedTokens(transcriptTokens, variation);
    if (evidence && (!best || isBetterEvidence(evidence, best))) {
      best = evidence;
    }
  }
  return best;
}

function scoreOrderedTokens(
  transcriptTokens: readonly string[],
  variation: PreparedVariation,
): ScoreEvidence | null {
  const candidateTokens = variation.tokens;
  const transcriptTail = transcriptTokens.slice(-MAX_MATCH_WINDOW_WORDS);
  if (
    transcriptTail.length < MIN_PROSE_EVIDENCE_WORDS ||
    candidateTokens.length < MIN_PROSE_EVIDENCE_WORDS
  ) {
    return null;
  }

  let previous = Array<AlignmentCell | null>(
    candidateTokens.length + 1,
  ).fill(null);

  for (
    let transcriptIndex = 0;
    transcriptIndex < transcriptTail.length;
    transcriptIndex += 1
  ) {
    const current = Array<AlignmentCell | null>(
      candidateTokens.length + 1,
    ).fill(null);
    for (
      let candidateIndex = 0;
      candidateIndex < candidateTokens.length;
      candidateIndex += 1
    ) {
      const transcriptToken = transcriptTail[transcriptIndex];
      const candidateToken = candidateTokens[candidateIndex];
      const exactMatch = transcriptToken === candidateToken;
      const fuzzyMatch =
        !exactMatch &&
        isConservativeFuzzyTokenMatch(
          transcriptToken ?? "",
          candidateToken ?? "",
        );
      const matches = exactMatch || fuzzyMatch;
      const options: AlignmentCell[] = [];

      if (matches) {
        options.push({
          exactMatches: exactMatch ? 1 : 0,
          fuzzyMatches: fuzzyMatch ? 1 : 0,
          informativeMatches:
            exactMatch && isInformativeWord(transcriptToken ?? "") ? 1 : 0,
          rawScore: exactMatch ? 2 : 1.25,
          startCandidateIndex: candidateIndex,
          startTranscriptIndex: transcriptIndex,
          weightedMatches: exactMatch ? 1 : FUZZY_TOKEN_WEIGHT,
        });
      }

      const diagonal = previous[candidateIndex];
      if (diagonal) {
        options.push(
          extendAlignmentCell(
            diagonal,
            exactMatch ? 2 : fuzzyMatch ? 1.25 : -1,
            exactMatch,
            fuzzyMatch,
            transcriptToken ?? "",
          ),
        );
      }
      const transcriptGap = previous[candidateIndex + 1];
      if (transcriptGap) {
        options.push(
          extendAlignmentCell(transcriptGap, -1, false, false, ""),
        );
      }
      const candidateGap = current[candidateIndex];
      if (candidateGap) {
        options.push(
          extendAlignmentCell(candidateGap, -1, false, false, ""),
        );
      }

      current[candidateIndex + 1] =
        options
          .filter((option) => option.rawScore > 0)
          .sort(compareAlignmentCells)[0] ?? null;
    }
    previous = current;
  }

  let best: ScoreEvidence | null = null;
  previous.forEach((cell, cellIndex) => {
    if (!cell || cellIndex === 0) {
      return;
    }
    const candidateEndIndex = cellIndex - 1;
    const transcriptLength =
      transcriptTail.length - cell.startTranscriptIndex;
    const candidateLength =
      candidateEndIndex - cell.startCandidateIndex + 1;
    if (
      transcriptLength < MIN_PROSE_EVIDENCE_WORDS ||
      candidateLength < MIN_PROSE_EVIDENCE_WORDS
    ) {
      return;
    }

    const reliableMatchWeight =
      cell.exactMatches >= MIN_FUZZY_EXACT_ANCHORS
        ? cell.weightedMatches
        : cell.exactMatches;
    const similarity =
      reliableMatchWeight / Math.max(transcriptLength, candidateLength);
    const evidenceWeight =
      0.82 +
      0.18 *
        Math.min(
          1,
          (transcriptLength - MIN_PROSE_EVIDENCE_WORDS) / 6,
        );
    const evidence: ScoreEvidence = {
      candidateWindow: candidateTokens.slice(
        cell.startCandidateIndex,
        candidateEndIndex + 1,
      ),
      matchedInformativeWords: cell.informativeMatches,
      score: similarity * evidenceWeight,
      transcriptWindow: transcriptTail.slice(cell.startTranscriptIndex),
      variation,
    };
    if (!best || isBetterEvidence(evidence, best)) {
      best = evidence;
    }
  });

  return best;
}

function extendAlignmentCell(
  cell: AlignmentCell,
  rawScoreDelta: number,
  exactMatch: boolean,
  fuzzyMatch: boolean,
  transcriptToken: string,
): AlignmentCell {
  return {
    exactMatches: cell.exactMatches + (exactMatch ? 1 : 0),
    fuzzyMatches: cell.fuzzyMatches + (fuzzyMatch ? 1 : 0),
    informativeMatches:
      cell.informativeMatches +
      (exactMatch && isInformativeWord(transcriptToken) ? 1 : 0),
    rawScore: cell.rawScore + rawScoreDelta,
    startCandidateIndex: cell.startCandidateIndex,
    startTranscriptIndex: cell.startTranscriptIndex,
    weightedMatches:
      cell.weightedMatches +
      (exactMatch ? 1 : fuzzyMatch ? FUZZY_TOKEN_WEIGHT : 0),
  };
}

function compareAlignmentCells(left: AlignmentCell, right: AlignmentCell) {
  if (left.rawScore !== right.rawScore) {
    return right.rawScore - left.rawScore;
  }
  if (left.exactMatches !== right.exactMatches) {
    return right.exactMatches - left.exactMatches;
  }
  if (left.weightedMatches !== right.weightedMatches) {
    return right.weightedMatches - left.weightedMatches;
  }
  if (left.informativeMatches !== right.informativeMatches) {
    return right.informativeMatches - left.informativeMatches;
  }
  if (left.startTranscriptIndex !== right.startTranscriptIndex) {
    return right.startTranscriptIndex - left.startTranscriptIndex;
  }
  return right.startCandidateIndex - left.startCandidateIndex;
}

function isBetterEvidence(left: ScoreEvidence, right: ScoreEvidence) {
  if (Math.abs(left.score - right.score) > Number.EPSILON) {
    return left.score > right.score;
  }
  if (left.matchedInformativeWords !== right.matchedInformativeWords) {
    return left.matchedInformativeWords > right.matchedInformativeWords;
  }
  return left.transcriptWindow.length > right.transcriptWindow.length;
}

function isDistinctiveGlobalMatch(
  scored: ScoredCandidate,
  prepared: PreparedMassSpeechCandidates,
) {
  const transcriptNgrams = createNgrams(
    scored.transcriptWindow,
    DISTINCTIVE_NGRAM_WORDS,
  );
  if (
    transcriptNgrams.some(
      (ngram) =>
        scored.variation.ngrams.has(ngram) &&
        prepared.ngramDocumentFrequency.get(ngram) === 1,
    )
  ) {
    return true;
  }

  const rareDocumentFrequency = Math.max(
    1,
    Math.floor(prepared.preparedCandidates.length * 0.1),
  );
  const candidateTokens = new Set(scored.candidateWindow);
  const rareSharedTokens = new Set(
    scored.transcriptWindow.filter(
      (token) =>
        isInformativeWord(token) &&
        candidateTokens.has(token) &&
        (prepared.tokenDocumentFrequency.get(token) ?? 0) <=
          rareDocumentFrequency,
    ),
  );
  return rareSharedTokens.size >= 2;
}

function getRunnerUp(
  best: ScoredCandidate,
  ranked: readonly ScoredCandidate[],
) {
  return (
    ranked.find(
      (entry) =>
        entry.preparedCandidate.candidate.id !==
        best.preparedCandidate.candidate.id,
    ) ?? null
  );
}

function toMatch(
  best: ScoredCandidate,
  ranked: readonly ScoredCandidate[],
  scope: MassSpeechMatch["scope"],
  orderRanks?: ReadonlyMap<number, number>,
  currentOrder?: number,
): MassSpeechMatch {
  const runnerUp = getRunnerUp(best, ranked);
  const runnerUpScore = runnerUp ? roundScore(runnerUp.score) : null;
  const orderDistance =
    orderRanks?.get(best.preparedCandidate.candidate.order) ??
    (currentOrder === undefined
      ? null
      : getFutureOrderDistance(
          ranked,
          currentOrder,
          best.preparedCandidate.candidate.order,
        ));

  return {
    candidate: best.preparedCandidate.candidate,
    margin: roundScore(
      runnerUp ? best.score - runnerUp.score : best.score,
    ),
    matchedInformativeWords: best.matchedInformativeWords,
    orderDistance,
    runnerUp: runnerUp
      ? {
          candidate: runnerUp.preparedCandidate.candidate,
          score: runnerUpScore ?? 0,
        }
      : null,
    scope,
    score: roundScore(best.score),
  };
}

function getFutureOrderDistance(
  ranked: readonly ScoredCandidate[],
  currentOrder: number,
  targetOrder: number,
) {
  const orders = Array.from(
    new Set(
      ranked
        .map((entry) => entry.preparedCandidate.candidate.order)
        .filter((order) => order > currentOrder),
    ),
  ).sort((left, right) => left - right);
  const index = orders.indexOf(targetOrder);
  return index >= 0 ? index + 1 : null;
}

function createNgrams(words: readonly string[], length: number) {
  const ngrams: string[] = [];
  for (let index = 0; index + length <= words.length; index += 1) {
    ngrams.push(words.slice(index, index + length).join(" "));
  }
  return ngrams;
}

function tokenize(text: string) {
  const normalized = normalizeMassSpeech(text);
  return normalized
    ? normalized
        .split(" ")
        .filter((token) => !IGNORED_RECOGNITION_WORDS.has(token))
    : [];
}

function createRecognitionVariations(text: string) {
  const normalized = normalizeMassSpeech(text);
  if (!normalized) {
    return [];
  }

  const variations = new Set([normalized]);
  if (/\bamen\b/u.test(normalized)) {
    variations.add(normalized.replace(/\bamen\b/gu, "a man"));
    variations.add(normalized.replace(/\bamen\b/gu, "a men"));
  }
  if (/\bbrethren\b/u.test(normalized)) {
    variations.add(
      normalized.replace(/\bbrethren\b/gu, "brothers and sisters"),
    );
  }
  if (/\bbrothers and sisters\b/u.test(normalized)) {
    variations.add(
      normalized.replace(/\bbrothers and sisters\b/gu, "brethren"),
    );
  }
  return Array.from(variations);
}

function isConservativeFuzzyTokenMatch(left: string, right: string) {
  if (
    left.length < 5 ||
    right.length < 5 ||
    Math.abs(left.length - right.length) > 1 ||
    !isInformativeWord(left) ||
    !isInformativeWord(right)
  ) {
    return false;
  }

  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) {
      return false;
    }
    if (left.length > right.length) {
      leftIndex += 1;
    } else if (right.length > left.length) {
      rightIndex += 1;
    } else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }

  edits += left.length - leftIndex + (right.length - rightIndex);
  return edits === 1;
}

function countInformativeWords(words: readonly string[]) {
  return words.reduce(
    (count, word) => count + (isInformativeWord(word) ? 1 : 0),
    0,
  );
}

function isInformativeWord(word: string) {
  return word.length > 1 && !UNINFORMATIVE_WORDS.has(word);
}

function roundScore(score: number) {
  return Number(score.toFixed(4));
}

function assertWordBounds(minWords: number, maxWords: number) {
  if (
    !Number.isInteger(minWords) ||
    !Number.isInteger(maxWords) ||
    minWords < 1 ||
    maxWords < minWords
  ) {
    throw new RangeError(
      "Mass speech passage bounds must be positive integers with maxWords >= minWords",
    );
  }
}
