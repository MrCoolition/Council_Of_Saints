export type MassProperAntiphon = {
  citation: string;
  text: string;
};

export type MassProperPrefaceOption = {
  label: string;
  text: string | null;
};

export type MassCelebrationPropers = {
  id: string;
  entranceAntiphons: readonly MassProperAntiphon[];
  collects: readonly string[];
  prayersOverOfferings: readonly string[];
  communionAntiphons: readonly MassProperAntiphon[];
  prayersAfterCommunion: readonly string[];
  prefaceOptions: readonly MassProperPrefaceOption[];
  sourceLabel: string;
  sourceUrl: string;
  rightsNotice: string;
};

export type MassCelebrationPropersByReadingSetId = Readonly<
  Record<string, MassCelebrationPropers | null>
>;

export type MassProperFormKind = "dawn" | "day" | "night" | "vigil";

export function getMassProperFormKind(title: string): MassProperFormKind | null {
  const heading = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/gu, " ")
    .trim();

  if (/\bVIGIL(?: MASS)?\b/u.test(heading)) {
    return "vigil";
  }
  if (/\bMASS (?:DURING|IN) THE DAY\b/u.test(heading)) {
    return "day";
  }
  if (/\bMASS (?:DURING|IN) THE NIGHT\b/u.test(heading)) {
    return "night";
  }
  if (/\bMASS AT DAWN\b/u.test(heading)) {
    return "dawn";
  }
  return null;
}

export function getCompatibleMassProperTitleAliases(
  title: string,
  aliases: readonly string[],
) {
  const titleKey = normalizeMassProperTitleKey(title);
  const titleForm = getMassProperFormKind(title);
  const seen = new Set([titleKey]);

  return aliases.flatMap((alias) => {
    const trimmed = alias.trim();
    const key = normalizeMassProperTitleKey(trimmed);
    const aliasForm = getMassProperFormKind(trimmed);
    if (
      !trimmed ||
      seen.has(key) ||
      (aliasForm !== null && aliasForm !== titleForm)
    ) {
      return [];
    }
    seen.add(key);
    return [trimmed];
  });
}

export function getMassPropersForReadingSet({
  fallback,
  propersByReadingSetId,
  readingSetId,
}: {
  fallback: MassCelebrationPropers | null;
  propersByReadingSetId: MassCelebrationPropersByReadingSetId;
  readingSetId: string | null;
}) {
  if (
    readingSetId !== null &&
    Object.prototype.hasOwnProperty.call(propersByReadingSetId, readingSetId)
  ) {
    return propersByReadingSetId[readingSetId] ?? null;
  }

  return fallback;
}

function normalizeMassProperTitleKey(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/gu, " ");
}
