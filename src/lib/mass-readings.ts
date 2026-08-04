import {
  MEMORIAL_MASS_PROFILE,
  SUNDAY_ORDINARY_TIME_MASS_PROFILE,
  type MassCelebrationProfile,
  type MassCelebrationRank,
  type MassLiturgicalColor,
} from "./holy-mass";
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
  refrains: readonly string[];
  refrainDisplayCitations: readonly string[];
  refrainDouaySources: readonly DouayScriptureSource[];
};

export type MassReadingOption = {
  id: string;
  label: string;
  description: string;
  officialUrl?: string;
  firstReading: MassScriptureSelection;
  responsorialPsalm: MassResponsorialPsalm;
  secondReading?: MassScriptureSelection;
  gospelAcclamation: MassScriptureSelection;
  gospelChoices: readonly MassScriptureSelection[];
};

export type MassObservance = {
  title: string;
  rank: MassCelebrationRank;
  obligatory: boolean;
  liturgicalColor: MassLiturgicalColor;
  lectionaryNumbers: readonly number[];
  profile: MassCelebrationProfile;
};

export type CuratedMassReadingsEntry = {
  status: "curated";
  localDate: string;
  jurisdiction: MassReadingJurisdiction;
  observance: MassObservance;
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

const USCCB_2026_CALENDAR_URL =
  "https://www.usccb.org/resources/2026cal.pdf";
const JULY_29_2026_DAILY_URL = getUsccbDailyReadingsUrl("2026-07-29");
const AUGUST_1_2026_DAILY_URL = getUsccbDailyReadingsUrl("2026-08-01");
const AUGUST_2_2026_DAILY_URL = getUsccbDailyReadingsUrl("2026-08-02");
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
    profile: MEMORIAL_MASS_PROFILE,
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
        ["God is my refuge on the day of distress."],
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
        [
          "I will bless the Lord at all times.",
          "Taste and see the goodness of the Lord.",
        ],
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
    "The USCCB also permits a suitable first reading and psalm from the Common of Holy Men and Women, nos. 737–742. No single Common selection is modeled because the liturgical books offer a choice.",
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
    officialSource("USCCB 2026 Liturgical Calendar", USCCB_2026_CALENDAR_URL),
  ],
} as const satisfies CuratedMassReadingsEntry;

export const AUGUST_1_2026_US_MASS_READINGS = {
  status: "curated",
  localDate: "2026-08-01",
  jurisdiction: "US",
  observance: {
    title: "Memorial of Saint Alphonsus Liguori, Bishop and Doctor of the Church",
    rank: "memorial",
    obligatory: true,
    liturgicalColor: "white",
    lectionaryNumbers: [406],
    profile: MEMORIAL_MASS_PROFILE,
  },
  options: [
    {
      id: "appointed",
      label: "Appointed readings",
      description:
        "The readings appointed for the Memorial of Saint Alphonsus Liguori in the U.S. calendar.",
      firstReading: selection(
        "First Reading",
        "Jeremiah 26:11–16, 24",
        "Douay Jeremiah 26:11–16, 24",
        [
          passage("jeremiah", 26, 11, 16),
          passage("jeremiah", 26, 24, 24),
        ],
      ),
      responsorialPsalm: responsorialPsalm(
        "Psalm 69:15–16, 30–31, 33–34",
        "Douay Psalm 68:15–16, 30–31, 33–34",
        [
          passage("psalms", 68, 15, 16),
          passage("psalms", 68, 30, 31),
          passage("psalms", 68, 33, 34),
        ],
        ["Lord, in your great love, answer me."],
        ["Psalm 69:14c"],
        [
          douaySource("Douay Psalm 68:14", [
            passage("psalms", 68, 14, 14),
          ]),
        ],
      ),
      gospelAcclamation: selection(
        "Gospel Acclamation",
        "Matthew 5:10",
        "Douay Matthew 5:10",
        [passage("matthew", 5, 10, 10)],
      ),
      gospelChoices: [
        selection(
          "Gospel",
          "Matthew 14:1–12",
          "Douay Matthew 14:1–12",
          [passage("matthew", 14, 1, 12)],
        ),
      ],
    },
  ],
  validityExplanation:
    "This is the appointed U.S. Lectionary set for the daytime Memorial.",
  additionalPermittedChoiceNote: "Lectionary no. 406.",
  officialSources: [
    officialSource(
      "USCCB daily readings for August 1, 2026",
      AUGUST_1_2026_DAILY_URL,
    ),
    officialSource("USCCB 2026 Liturgical Calendar", USCCB_2026_CALENDAR_URL),
  ],
} as const satisfies CuratedMassReadingsEntry;

export const AUGUST_2_2026_US_MASS_READINGS = {
  status: "curated",
  localDate: "2026-08-02",
  jurisdiction: "US",
  observance: {
    title: "Eighteenth Sunday in Ordinary Time",
    rank: "sunday",
    obligatory: true,
    liturgicalColor: "green",
    lectionaryNumbers: [112],
    profile: SUNDAY_ORDINARY_TIME_MASS_PROFILE,
  },
  options: [
    {
      id: "appointed",
      label: "Sunday readings",
      description:
        "The Year A readings for the Eighteenth Sunday in Ordinary Time.",
      firstReading: selection(
        "First Reading",
        "Isaiah 55:1–3",
        "Douay Isaiah 55:1–3",
        [passage("isaiah", 55, 1, 3)],
      ),
      responsorialPsalm: responsorialPsalm(
        "Psalm 145:8–9, 15–16, 17–18",
        "Douay Psalm 144:8–9, 15–18",
        [
          passage("psalms", 144, 8, 9),
          passage("psalms", 144, 15, 16),
          passage("psalms", 144, 17, 18),
        ],
        ["The hand of the Lord feeds us; he answers all our needs."],
        ["Psalm 145:16"],
        [
          douaySource("Douay Psalm 144:16", [
            passage("psalms", 144, 16, 16),
          ]),
        ],
      ),
      secondReading: selection(
        "Second Reading",
        "Romans 8:35, 37–39",
        "Douay Romans 8:35, 37–39",
        [
          passage("romans", 8, 35, 35),
          passage("romans", 8, 37, 39),
        ],
      ),
      gospelAcclamation: selection(
        "Gospel Acclamation",
        "Matthew 4:4b",
        "Douay Matthew 4:4",
        [passage("matthew", 4, 4, 4)],
      ),
      gospelChoices: [
        selection(
          "Gospel",
          "Matthew 14:13–21",
          "Douay Matthew 14:13–21",
          [passage("matthew", 14, 13, 21)],
        ),
      ],
    },
  ],
  validityExplanation:
    "This is the appointed Year A U.S. Lectionary set for Sunday and its anticipated Mass.",
  additionalPermittedChoiceNote: "Lectionary no. 112.",
  officialSources: [
    officialSource(
      "USCCB daily readings for August 2, 2026",
      AUGUST_2_2026_DAILY_URL,
    ),
    officialSource("USCCB 2026 Liturgical Calendar", USCCB_2026_CALENDAR_URL),
  ],
} as const satisfies CuratedMassReadingsEntry;

const CURATED_US_MASS_READINGS = new Map<string, CuratedMassReadingsEntry>([
  [JULY_29_2026_US_MASS_READINGS.localDate, JULY_29_2026_US_MASS_READINGS],
  [AUGUST_1_2026_US_MASS_READINGS.localDate, AUGUST_1_2026_US_MASS_READINGS],
  [AUGUST_2_2026_US_MASS_READINGS.localDate, AUGUST_2_2026_US_MASS_READINGS],
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
      "No curated Mass lectionary entry is stored for this date. Open the official USCCB daily-readings page; this module will not infer an observance or Scripture selection.",
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

  return `https://bible.usccb.org/bible/readings/${twoDigits(month)}${twoDigits(day)}${shortYear}`;
}

export function hasCuratedUsMassReadings(localDate: string) {
  return CURATED_US_MASS_READINGS.has(localDate);
}

export function getCuratedUsMassReadingsEntries() {
  return [...CURATED_US_MASS_READINGS.values()];
}

export function getDouayDisplayCitation(selection: MassScriptureSelection) {
  return selection.douaySource.citation.replace(/^Douay\s+/u, "");
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
  refrains: readonly string[],
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
    refrains,
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
