const DEFAULT_MIN_WORDS = 8;
const DEFAULT_MAX_WORDS = 20;
const FORWARD_TARGET_WINDOW = 16;
const MIN_GLOBAL_INFORMATIVE_WORDS = 5;
const MIN_GLOBAL_SCORE = 0.75;
const MIN_GLOBAL_WINNER_MARGIN = 0.15;
const MIN_FORWARD_SCORE = 0.68;

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

export type MassSpeechCandidate = {
  id: string;
  order: number;
  text: string;
  label?: string;
};

export type MassSpeechMatch = {
  candidate: MassSpeechCandidate;
  score: number;
  scope: "forward" | "global";
};

type FindMassSpeechMatchInput = {
  transcript: string;
  candidates: readonly MassSpeechCandidate[];
  currentOrder?: number;
  allowGlobal?: boolean;
};

type ScoredCandidate = {
  candidate: MassSpeechCandidate;
  index: number;
  score: number;
};

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
 * Splits long spoken copy into balanced, non-overlapping display passages.
 * Every passage is an exact slice of the input, so joining the result always
 * reproduces the original punctuation, casing, and whitespace.
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

  const passageCount = Math.ceil(wordStarts.length / maxWords);
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
 * Finds the best current or forward Mass target for a rolling recognition
 * transcript. With no current order, global acquisition is enabled by default.
 * With a current order, global recovery is opt-in and can never move backward.
 */
export function findMassSpeechMatch({
  transcript,
  candidates,
  currentOrder,
  allowGlobal = currentOrder === undefined,
}: FindMassSpeechMatchInput): MassSpeechMatch | null {
  const transcriptTokens = tokenize(transcript);
  if (transcriptTokens.length === 0 || candidates.length === 0) {
    return null;
  }

  if (currentOrder !== undefined) {
    const futureOrders = Array.from(
      new Set(
        candidates
          .filter((candidate) => candidate.order > currentOrder)
          .map((candidate) => candidate.order),
      ),
    ).sort((left, right) => left - right);
    const immediateNextOrder = futureOrders[0];
    const forwardOrderSequence = [
      currentOrder,
      ...futureOrders.slice(0, FORWARD_TARGET_WINDOW),
    ];
    const forwardOrders = new Set(forwardOrderSequence);
    const forwardOrderRanks = new Map(
      forwardOrderSequence.map((order, index) => [order, index]),
    );
    const forward = rankCandidates({
      candidates,
      orderRanks: forwardOrderRanks,
      transcriptTokens,
      predicate: (candidate, candidateTokens) => {
        if (!forwardOrders.has(candidate.order)) {
          return false;
        }

        return (
          !isShortResponse(candidateTokens) ||
          candidate.order === immediateNextOrder
        );
      },
    });
    const bestForward = forward[0];
    if (bestForward && bestForward.score >= MIN_FORWARD_SCORE) {
      return toMatch(bestForward, "forward");
    }
  }

  if (
    !allowGlobal ||
    countInformativeWords(transcriptTokens) < MIN_GLOBAL_INFORMATIVE_WORDS
  ) {
    return null;
  }

  const global = rankCandidates({
    candidates,
    transcriptTokens,
    predicate: (candidate, candidateTokens) =>
      !isShortResponse(candidateTokens) &&
      (currentOrder === undefined || candidate.order >= currentOrder),
  });
  const bestGlobal = global[0];
  if (!bestGlobal || bestGlobal.score < MIN_GLOBAL_SCORE) {
    return null;
  }

  const runnerUp = global.find(
    (entry) => entry.candidate.id !== bestGlobal.candidate.id,
  );
  if (
    runnerUp &&
    bestGlobal.score - runnerUp.score < MIN_GLOBAL_WINNER_MARGIN
  ) {
    return null;
  }

  return toMatch(bestGlobal, "global");
}

function rankCandidates({
  candidates,
  orderRanks,
  predicate,
  transcriptTokens,
}: {
  candidates: readonly MassSpeechCandidate[];
  orderRanks?: ReadonlyMap<number, number>;
  predicate: (
    candidate: MassSpeechCandidate,
    candidateTokens: readonly string[],
  ) => boolean;
  transcriptTokens: readonly string[];
}) {
  const scored: ScoredCandidate[] = [];

  candidates.forEach((candidate, index) => {
    const candidateTokens = tokenize(candidate.text);
    if (
      candidateTokens.length === 0 ||
      !predicate(candidate, candidateTokens)
    ) {
      return;
    }

    const score = isShortResponse(candidateTokens)
      ? scoreShortResponse(transcriptTokens, candidateTokens)
      : scoreOrderedTokens(transcriptTokens, candidateTokens);
    if (score > 0) {
      scored.push({ candidate, index, score });
    }
  });

  return scored.sort((left, right) => {
    const scoreDifference = right.score - left.score;
    if (Math.abs(scoreDifference) > Number.EPSILON) {
      return scoreDifference;
    }

    if (orderRanks) {
      const leftRank =
        orderRanks.get(left.candidate.order) ?? Number.MAX_SAFE_INTEGER;
      const rightRank =
        orderRanks.get(right.candidate.order) ?? Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
    }

    if (left.candidate.order !== right.candidate.order) {
      return left.candidate.order - right.candidate.order;
    }
    return left.index - right.index;
  });
}

function scoreShortResponse(
  transcriptTokens: readonly string[],
  candidateTokens: readonly string[],
) {
  if (transcriptTokens.length < candidateTokens.length) {
    return 0;
  }

  const offset = transcriptTokens.length - candidateTokens.length;
  return candidateTokens.every(
    (token, index) => transcriptTokens[offset + index] === token,
  )
    ? 1
    : 0;
}

function scoreOrderedTokens(
  transcriptTokens: readonly string[],
  candidateTokens: readonly string[],
) {
  const maximumTranscriptWindow = Math.min(
    DEFAULT_MAX_WORDS,
    transcriptTokens.length,
  );
  if (maximumTranscriptWindow < MIN_GLOBAL_INFORMATIVE_WORDS) {
    return 0;
  }

  let bestScore = 0;
  for (
    let transcriptLength = MIN_GLOBAL_INFORMATIVE_WORDS;
    transcriptLength <= maximumTranscriptWindow;
    transcriptLength += 1
  ) {
    const transcriptWindow = transcriptTokens.slice(-transcriptLength);
    const minimumCandidateLength = Math.max(
      MIN_GLOBAL_INFORMATIVE_WORDS,
      transcriptLength - 2,
    );
    const maximumCandidateLength = Math.min(
      DEFAULT_MAX_WORDS,
      candidateTokens.length,
      transcriptLength + 2,
    );

    for (
      let candidateLength = minimumCandidateLength;
      candidateLength <= maximumCandidateLength;
      candidateLength += 1
    ) {
      for (
        let candidateStart = 0;
        candidateStart + candidateLength <= candidateTokens.length;
        candidateStart += 1
      ) {
        const candidateWindow = candidateTokens.slice(
          candidateStart,
          candidateStart + candidateLength,
        );
        const distance = tokenEditDistance(
          transcriptWindow,
          candidateWindow,
        );
        const similarity =
          1 - distance / Math.max(transcriptLength, candidateLength);
        const evidenceWeight =
          0.85 + 0.15 * Math.min(1, (transcriptLength - 5) / 5);
        bestScore = Math.max(bestScore, similarity * evidenceWeight);
      }
    }
  }

  return bestScore;
}

function tokenEditDistance(
  left: readonly string[],
  right: readonly string[],
) {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const current = [leftIndex + 1];
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex] === right[rightIndex] ? 0 : 1;
      current.push(
        Math.min(
          current[rightIndex] + 1,
          previous[rightIndex + 1] + 1,
          previous[rightIndex] + substitutionCost,
        ),
      );
    }
    previous = current;
  }

  return previous[right.length];
}

function tokenize(text: string) {
  const normalized = normalizeMassSpeech(text);
  return normalized ? normalized.split(" ") : [];
}

function countInformativeWords(words: readonly string[]) {
  return words.reduce(
    (count, word) =>
      count +
      (word.length > 1 && !UNINFORMATIVE_WORDS.has(word) ? 1 : 0),
    0,
  );
}

function isShortResponse(words: readonly string[]) {
  return countInformativeWords(words) < MIN_GLOBAL_INFORMATIVE_WORDS;
}

function toMatch(
  scored: ScoredCandidate,
  scope: MassSpeechMatch["scope"],
): MassSpeechMatch {
  return {
    candidate: scored.candidate,
    score: Number(scored.score.toFixed(4)),
    scope,
  };
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
