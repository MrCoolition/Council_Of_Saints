import type { ScripturePassage } from "./scripture";

export type MassReadingJurisdiction = "US";

export type OfficialMassReadingSource = {
  label: string;
  url: string;
  authority: "USCCB";
};

export type DouayScriptureSource = {
  translationId: "original-douay-rheims";
  translationLabel: "Original Douay-Rheims (1582–1610), public domain";
  citation: string;
  passages: readonly ScripturePassage[];
};

export type MassScriptureSelection = {
  title: string;
  displayCitation: string;
  douaySource: DouayScriptureSource;
};

export type MassResponsorialPsalm = MassScriptureSelection & {
  refrainDisplayCitations: readonly string[];
  refrainDouaySources: readonly DouayScriptureSource[];
};

export type MassReadingOption = {
  id: "weekday" | "saint-proper";
  label: string;
  description: string;
  firstReading: MassScriptureSelection;
  responsorialPsalm: MassResponsorialPsalm;
  gospelAcclamation: MassScriptureSelection;
  gospelChoices: readonly MassScriptureSelection[];
};

export type CuratedMassReadingsEntry = {
  status: "curated";
  localDate: string;
  jurisdiction: MassReadingJurisdiction;
  observance: {
    title: string;
    rank: "memorial";
    obligatory: true;
    liturgicalColor: "white";
    lectionaryNumbers: readonly [403, 607];
  };
  options: readonly MassReadingOption[];
  validityExplanation: string;
  additionalPermittedChoiceNote: string;
  officialSources: readonly OfficialMassReadingSource[];
};

export type MetadataOnlyMassReadingsEntry = {
  status: "metadata-only";
  localDate: string;
  jurisdiction: MassReadingJurisdiction;
  notice: string;
  officialSources: readonly OfficialMassReadingSource[];
};

export type MassReadingsEntry =
  | CuratedMassReadingsEntry
  | MetadataOnlyMassReadingsEntry;

const DOUAY_TRANSLATION = {
  translationId: "original-douay-rheims",
  translationLabel: "Original Douay-Rheims (1582–1610), public domain",
} as const;

const JULY_29_2026_DAILY_URL =
  "https://bible.usccb.org/bible/readings/072926.cfm";
const MARTHA_MARY_LAZARUS_PROPER_URL =
  "https://bible.usccb.org/bible/readings/0729-memorial-martha.cfm";

const JULY_29_GOSPEL_CHOICES = [
  selection(
    "Gospel",
    "John 11:19–27",
    "Douay John 11:19–27",
    [passage("john", 11, 19, 27)],
  ),
  selection(
    "Gospel",
    "Luke 10:38–42",
    "Douay Luke 10:38–42",
    [passage("luke", 10, 38, 42)],
  ),
] as const;

const JULY_29_GOSPEL_ACCLAMATION = selection(
  "Gospel Acclamation",
  "John 8:12",
  "Douay John 8:12",
  [passage("john", 8, 12, 12)],
);

export const JULY_29_2026_US_MASS_READINGS = {
  status: "curated",
  localDate: "2026-07-29",
  jurisdiction: "US",
  observance: {
    title: "Memorial of Saints Martha, Mary, and Lazarus",
    rank: "memorial",
    obligatory: true,
    liturgicalColor: "white",
    lectionaryNumbers: [403, 607],
  },
  options: [
    {
      id: "weekday",
      label: "Weekday first reading and psalm",
      description:
        "Uses the Wednesday of the Seventeenth Week in Ordinary Time for the first reading and responsorial psalm, followed by the proper Gospel choice for the Memorial.",
      firstReading: selection(
        "First Reading",
        "Jeremiah 15:10, 16–21",
        "Douay Jeremiah 15:10, 16–21",
        [
          passage("jeremiah", 15, 10, 10),
          passage("jeremiah", 15, 16, 21),
        ],
      ),
      responsorialPsalm: responsorialPsalm(
        "Psalm 59:2–3, 4, 10–11, 17, 18",
        "Douay Psalm 58:2–4, 10–11, 17–18",
        [
          passage("psalms", 58, 2, 4),
          passage("psalms", 58, 10, 11),
          passage("psalms", 58, 17, 18),
        ],
        ["Psalm 59:17d"],
        [
          douaySource("Douay Psalm 58:17", [
            passage("psalms", 58, 17, 17),
          ]),
        ],
      ),
      gospelAcclamation: JULY_29_GOSPEL_ACCLAMATION,
      gospelChoices: JULY_29_GOSPEL_CHOICES,
    },
    {
      id: "saint-proper",
      label: "Saint-proper first reading and psalm",
      description:
        "Uses the first reading and responsorial psalm supplied in Proper of Saints no. 607, followed by either permitted Gospel for the Memorial.",
      firstReading: selection(
        "First Reading",
        "1 John 4:7–16",
        "Douay 1 John 4:7–16",
        [passage("1-john", 4, 7, 16)],
      ),
      responsorialPsalm: responsorialPsalm(
        "Psalm 34:2–3, 4–5, 6–7, 8–9, 10–11",
        "Douay Psalm 33:2–11",
        [passage("psalms", 33, 2, 11)],
        ["Psalm 34:2", "Psalm 34:9"],
        [
          douaySource("Douay Psalm 33:2", [
            passage("psalms", 33, 2, 2),
          ]),
          douaySource("Douay Psalm 33:9", [
            passage("psalms", 33, 9, 9),
          ]),
        ],
      ),
      gospelAcclamation: JULY_29_GOSPEL_ACCLAMATION,
      gospelChoices: JULY_29_GOSPEL_CHOICES,
    },
  ],
  validityExplanation:
    "Both options are valid. For this Memorial, Lectionary no. 607 makes the Gospel proper while permitting the first reading and responsorial psalm to come either from the weekday or from the Proper of Saints.",
  additionalPermittedChoiceNote:
    "The USCCB also permits a suitable first reading and psalm from the Common of Holy Men and Women, nos. 737–742. No single Common selection is modeled here because the liturgical books offer a choice.",
  officialSources: [
    officialSource(
      "USCCB daily readings for July 29, 2026",
      JULY_29_2026_DAILY_URL,
    ),
    officialSource(
      "USCCB Proper of Saints no. 607",
      MARTHA_MARY_LAZARUS_PROPER_URL,
    ),
    officialSource(
      "USCCB: Saints Martha, Mary, and Lazarus",
      "https://www.usccb.org/prayer-worship/liturgical-year/saints-martha-mary-and-lazarus",
    ),
    officialSource(
      "USCCB 2026 Liturgical Calendar",
      "https://www.usccb.org/resources/2026cal.pdf",
    ),
  ],
} as const satisfies CuratedMassReadingsEntry;

const CURATED_US_MASS_READINGS = new Map<string, CuratedMassReadingsEntry>([
  [JULY_29_2026_US_MASS_READINGS.localDate, JULY_29_2026_US_MASS_READINGS],
]);

/**
 * Returns curated U.S. Mass readings only when this module has verified data.
 * Other dates deliberately return an official link without inferred readings.
 */
export function getUsMassReadingsForDate(
  localDate: string,
): MassReadingsEntry {
  assertIsoCalendarDate(localDate);

  const curated = CURATED_US_MASS_READINGS.get(localDate);
  if (curated) {
    return curated;
  }

  return {
    status: "metadata-only",
    localDate,
    jurisdiction: "US",
    notice:
      "No curated Mass lectionary entry is stored for this date. Open the official USCCB daily-readings page; this module will not guess an observance or Scripture selection.",
    officialSources: [
      officialSource(
        `USCCB daily readings for ${localDate}`,
        getUsccbDailyReadingsUrl(localDate),
      ),
      officialSource(
        "USCCB daily readings calendar",
        "https://bible.usccb.org/readings/calendar",
      ),
    ],
  };
}

export function getUsccbDailyReadingsUrl(localDate: string) {
  const { year, month, day } = parseIsoCalendarDate(localDate);
  const shortYear = String(year).slice(-2);

  return `https://bible.usccb.org/bible/readings/${twoDigits(month)}${twoDigits(day)}${shortYear}.cfm`;
}

export function hasCuratedUsMassReadings(localDate: string) {
  return CURATED_US_MASS_READINGS.has(localDate);
}

function selection(
  title: string,
  displayCitation: string,
  douayCitation: string,
  passages: readonly ScripturePassage[],
): MassScriptureSelection {
  return {
    title,
    displayCitation,
    douaySource: douaySource(douayCitation, passages),
  };
}

function responsorialPsalm(
  displayCitation: string,
  douayCitation: string,
  passages: readonly ScripturePassage[],
  refrainDisplayCitations: readonly string[],
  refrainDouaySources: readonly DouayScriptureSource[],
): MassResponsorialPsalm {
  return {
    ...selection(
      "Responsorial Psalm",
      displayCitation,
      douayCitation,
      passages,
    ),
    refrainDisplayCitations,
    refrainDouaySources,
  };
}

function douaySource(
  citation: string,
  passages: readonly ScripturePassage[],
): DouayScriptureSource {
  return {
    ...DOUAY_TRANSLATION,
    citation,
    passages,
  };
}

function officialSource(
  label: string,
  url: string,
): OfficialMassReadingSource {
  return { label, url, authority: "USCCB" };
}

function passage(
  bookId: string,
  chapter: number,
  verseStart: number | null = null,
  verseEnd: number | null = verseStart,
): ScripturePassage {
  return { bookId, chapter, verseStart, verseEnd };
}

function assertIsoCalendarDate(localDate: string) {
  parseIsoCalendarDate(localDate);
}

function parseIsoCalendarDate(localDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  if (!match) {
    throw new RangeError(`Invalid ISO calendar date: ${localDate}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid ISO calendar date: ${localDate}`);
  }

  return { year, month, day };
}

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}
