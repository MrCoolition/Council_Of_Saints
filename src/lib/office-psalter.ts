import type { PrayerItemType } from "@/lib/domain";
import {
  getComplementaryPsalmody,
  getDaytimePsalmody,
  getOfficeOfReadingsPsalmody,
  type PsalmSchedule,
} from "@/lib/office-schedules";
import type { ScripturePassage } from "@/lib/scripture";

export const OFFICE_HOUR_TYPES = [
  "office_readings",
  "morning_prayer",
  "midmorning_prayer",
  "midday_prayer",
  "midafternoon_prayer",
  "evening_prayer",
  "night_prayer",
] as const;

export type OfficeHourType = (typeof OFFICE_HOUR_TYPES)[number];

export type ScriptureAnchor = {
  title: string;
  citation: string;
  role: string;
  passages: ScripturePassage[];
  text: string | null;
  source: "public_domain";
  sourceLabel: string;
  reflection: string;
  verseTextOverrides?: {
    passageIndex: number;
    verseNumber: number;
    text: string;
  }[];
};

export type OfficeGuide = {
  hourType: OfficeHourType;
  prayerItemType?: Extract<
    PrayerItemType,
    | "office_readings"
    | "morning_prayer"
    | "daytime_prayer"
    | "evening_prayer"
    | "night_prayer"
  >;
  hourLabel?: string;
  traditionalName?: string;
  suggestedTime?: string;
  psalterWeek: number;
  cycleLabel: string;
  generalNote: string;
  openingLines: string[];
  scriptureAnchors: ScriptureAnchor[];
  alternatePsalmody?: {
    title: string;
    instruction: string;
    scriptureAnchors: ScriptureAnchor[];
  };
  rubricNotes?: string[];
  properNotice?: {
    title: string;
    description: string;
    href: string;
    statusLabel: string;
  } | null;
  closingSteps: { title: string; instruction: string }[];
};

export type OfficeContext = {
  title?: string;
  season?: string;
  rank?: string;
  color?: string;
};

type Weekday =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

type PsalterPlan = Record<number, Record<Weekday, ScriptureAnchor[]>>;

const SOURCE_LABEL = "Original Douay-Rheims (1582–1610), public domain";

const MORNING_PSALTER: PsalterPlan = {
  1: {
    sunday: [
      psalm("Psalm 63:2–9", 62, [[2, 9]]),
      canticle("Canticle of Daniel · Daniel 3:57–88, 56", [
        passage("daniel", 3, 57, 88),
        passage("daniel", 3, 56, 56),
      ]),
      psalm("Psalm 149", 149),
    ],
    monday: [
      psalm("Psalm 5:2–10, 12–13", 5, [
        [2, 10],
        [12, 13],
      ]),
      canticle("Canticle of David · 1 Chronicles 29:10–13", [
        passage("1-chronicles", 29, 10, 13),
      ]),
      psalm("Psalm 29", 28),
    ],
    tuesday: [
      psalm("Psalm 24", 23),
      canticle("Canticle of Tobit · Tobit 13:1–10", [
        passage("tobit", 13, 1, 10),
      ]),
      psalm("Psalm 33", 32),
    ],
    wednesday: [
      psalm("Psalm 36", 35),
      canticle(
        "Canticle of Judith · Judith 16:2–3a, 13–15 · Douay 16:2–4, 15–19",
        [
          passage("judith", 16, 2, 4),
          passage("judith", 16, 15, 19),
        ],
      ),
      psalm("Psalm 47", 46),
    ],
    thursday: [
      psalm("Psalm 57", 56),
      canticle("Canticle of Jeremiah · Jeremiah 31:10–14", [
        passage("jeremiah", 31, 10, 14),
      ]),
      psalm("Psalm 48", 47),
    ],
    friday: [
      psalm("Psalm 51", 50),
      canticle("Canticle of Isaiah · Isaiah 45:15–25", [
        passage("isaiah", 45, 15, 25),
      ]),
      psalm("Psalm 100", 99),
    ],
    saturday: [
      psalm("Psalm 119:145–152", 118, [[145, 152]]),
      canticle("Canticle of Moses · Exodus 15:1–4, 8–13, 17–18", [
        passage("exodus", 15, 1, 4),
        passage("exodus", 15, 8, 13),
        passage("exodus", 15, 17, 18),
      ]),
      psalm("Psalm 117", 116),
    ],
  },
  2: {
    sunday: [
      psalm("Psalm 118", 117),
      canticle("Canticle of Daniel · Daniel 3:52–57", [
        passage("daniel", 3, 52, 57),
      ]),
      psalm("Psalm 150", 150),
    ],
    monday: [
      psalm("Psalm 42", 41),
      canticle("Canticle of Sirach · Sirach 36:1–7, 13–16", [
        passage("sirach", 36, 1, 7),
        passage("sirach", 36, 13, 16),
      ]),
      psalm("Psalm 19:2–7", 18, [[2, 7]]),
    ],
    tuesday: [
      psalm("Psalm 43", 42),
      canticle("Canticle of Hezekiah · Isaiah 38:10–14, 17–20", [
        passage("isaiah", 38, 10, 14),
        passage("isaiah", 38, 17, 20),
      ]),
      psalm("Psalm 65", 64),
    ],
    wednesday: [
      psalm("Psalm 77", 76),
      canticle("Canticle of Hannah · 1 Samuel 2:1–10", [
        passage("1-samuel", 2, 1, 10),
      ]),
      psalm("Psalm 97", 96),
    ],
    thursday: [
      psalm("Psalm 80", 79),
      canticle("Canticle of Isaiah · Isaiah 12:1–6", [
        passage("isaiah", 12, 1, 6),
      ]),
      psalm("Psalm 81", 80),
    ],
    friday: [
      psalm("Psalm 51", 50),
      canticle("Canticle of Habakkuk · Habakkuk 3:2–4, 13, 15–19", [
        passage("habakkuk", 3, 2, 4),
        passage("habakkuk", 3, 13, 13),
        passage("habakkuk", 3, 15, 19),
      ]),
      psalm("Psalm 147:12–20", 147, [[1, 9]]),
    ],
    saturday: [
      psalm("Psalm 92", 91),
      canticle("Canticle of Moses · Deuteronomy 32:1–12", [
        passage("deuteronomy", 32, 1, 12),
      ]),
      psalm("Psalm 8", 8),
    ],
  },
  3: {
    sunday: [
      psalm("Psalm 93", 92),
      canticle("Canticle of Daniel · Daniel 3:57–88, 56", [
        passage("daniel", 3, 57, 88),
        passage("daniel", 3, 56, 56),
      ]),
      psalm("Psalm 148", 148),
    ],
    monday: [
      psalm("Psalm 84", 83),
      canticle("Canticle of Isaiah · Isaiah 2:2–5", [
        passage("isaiah", 2, 2, 5),
      ]),
      psalm("Psalm 96", 95),
    ],
    tuesday: [
      psalm("Psalm 85", 84),
      canticle("Canticle of Isaiah · Isaiah 26:1–4, 7–9, 12", [
        passage("isaiah", 26, 1, 4),
        passage("isaiah", 26, 7, 9),
        passage("isaiah", 26, 12, 12),
      ]),
      psalm("Psalm 67", 66),
    ],
    wednesday: [
      psalm("Psalm 86", 85),
      canticle("Canticle of Isaiah · Isaiah 33:13–16", [
        passage("isaiah", 33, 13, 16),
      ]),
      psalm("Psalm 98", 97),
    ],
    thursday: [
      psalm("Psalm 87", 86),
      canticle("Canticle of Isaiah · Isaiah 40:10–17", [
        passage("isaiah", 40, 10, 17),
      ]),
      psalm("Psalm 99", 98),
    ],
    friday: [
      psalm("Psalm 51", 50),
      canticle("Canticle of Jeremiah · Jeremiah 14:17–21", [
        passage("jeremiah", 14, 17, 21),
      ]),
      psalm("Psalm 100", 99),
    ],
    saturday: [
      psalm("Psalm 119:145–152", 118, [[145, 152]]),
      canticle("Canticle of Wisdom · Wisdom 9:1–6, 9–11", [
        passage("wisdom", 9, 1, 6),
        passage("wisdom", 9, 9, 11),
      ]),
      psalm("Psalm 117", 116),
    ],
  },
  4: {
    sunday: [
      psalm("Psalm 118", 117),
      canticle("Canticle of Daniel · Daniel 3:52–57", [
        passage("daniel", 3, 52, 57),
      ]),
      psalm("Psalm 150", 150),
    ],
    monday: [
      psalm("Psalm 90", 89),
      canticle("Canticle of Isaiah · Isaiah 42:10–16", [
        passage("isaiah", 42, 10, 16),
      ]),
      psalm("Psalm 135:1–12", 134, [[1, 12]]),
    ],
    tuesday: [
      psalm("Psalm 101", 100),
      canticle("Canticle of Daniel · Daniel 3:26–27, 29, 34–41", [
        passage("daniel", 3, 26, 27),
        passage("daniel", 3, 29, 29),
        passage("daniel", 3, 34, 41),
      ]),
      psalm("Psalm 144:1–10", 143, [[1, 10]]),
    ],
    wednesday: [
      psalm("Psalm 108", 107),
      canticle("Canticle of Isaiah · Isaiah 61:10—62:5", [
        passage("isaiah", 61, 10, 11),
        passage("isaiah", 62, 1, 5),
      ]),
      psalm("Psalm 146", 145),
    ],
    thursday: [
      psalm("Psalm 143:1–11", 142, [[1, 11]]),
      canticle("Canticle of Isaiah · Isaiah 66:10–14", [
        passage("isaiah", 66, 10, 14),
      ]),
      psalm("Psalm 147:1–11", 146, [[1, 11]]),
    ],
    friday: [
      psalm("Psalm 51", 50),
      canticle("Canticle of Tobit · Tobit 13:10–15, 17–19", [
        passage("tobit", 13, 10, 15),
        passage("tobit", 13, 17, 19),
      ]),
      psalm("Psalm 147:12–20", 147, [[1, 9]]),
    ],
    saturday: [
      psalm("Psalm 92", 91),
      canticle("Canticle of Ezekiel · Ezekiel 36:24–28", [
        passage("ezekiel", 36, 24, 28),
      ]),
      psalm("Psalm 8", 8),
    ],
  },
};

const EVENING_PSALTER: PsalterPlan = {
  1: eveningWeek(1, {
    sunday: [
      psalm("Psalm 110:1–5, 7", 109, [
        [1, 5],
        [7, 7],
      ]),
      psalm("Psalm 114", 113, [[1, 8]]),
      canticle("Canticle of the redeemed · Revelation 19:1–7", [
        passage("revelation", 19, 1, 7),
      ]),
    ],
    monday: [psalm("Psalm 11", 10), psalm("Psalm 15", 14), ephesiansCanticle()],
    tuesday: [
      psalm("Psalm 20", 19),
      psalm("Psalm 21:2–8, 14", 20, [
        [2, 8],
        [14, 14],
      ]),
      revelationFourFiveCanticle(),
    ],
    wednesday: [
      psalm("Psalm 27:1–6", 26, [[1, 6]]),
      psalm("Psalm 27:7–14", 26, [[7, 14]]),
      colossiansCanticle(),
    ],
    thursday: [psalm("Psalm 30", 29), psalm("Psalm 32", 31), revelationElevenCanticle()],
    friday: [psalm("Psalm 41", 40), psalm("Psalm 46", 45), revelationFifteenCanticle()],
  }),
  2: eveningWeek(2, {
    sunday: [
      psalm("Psalm 110:1–5, 7", 109, [
        [1, 5],
        [7, 7],
      ]),
      psalm("Psalm 115", 113, [[9, 26]]),
      canticle("Canticle of the redeemed · Revelation 19:1–7", [
        passage("revelation", 19, 1, 7),
      ]),
    ],
    monday: [
      psalm("Psalm 45:2–10", 44, [[2, 10]]),
      psalm("Psalm 45:11–18", 44, [[11, 18]]),
      ephesiansCanticle(),
    ],
    tuesday: [
      psalm("Psalm 49:2–13", 48, [[2, 13]]),
      psalm("Psalm 49:14–21", 48, [[14, 21]]),
      revelationFourFiveCanticle(),
    ],
    wednesday: [psalm("Psalm 62", 61), psalm("Psalm 67", 66), colossiansCanticle()],
    thursday: [
      psalm("Psalm 72:2–11", 71, [[2, 11]]),
      psalm("Psalm 72:12–19", 71, [[12, 19]]),
      revelationElevenCanticle(),
    ],
    friday: [
      psalm("Psalm 116:1–9", 114, [[1, 9]]),
      psalm("Psalm 121", 120),
      revelationFifteenCanticle(),
    ],
  }),
  3: eveningWeek(3, {
    sunday: [
      psalm("Psalm 110:1–5, 7", 109, [
        [1, 5],
        [7, 7],
      ]),
      psalm("Psalm 111", 110),
      canticle("Canticle of the redeemed · Revelation 19:1–7", [
        passage("revelation", 19, 1, 7),
      ]),
    ],
    monday: [psalm("Psalm 123", 122), psalm("Psalm 124", 123), ephesiansCanticle()],
    tuesday: [psalm("Psalm 125", 124), psalm("Psalm 131", 130), revelationFourFiveCanticle()],
    wednesday: [psalm("Psalm 126", 125), psalm("Psalm 127", 126), colossiansCanticle()],
    thursday: [
      psalm("Psalm 132:1–10", 131, [[1, 10]]),
      psalm("Psalm 132:11–18", 131, [[11, 18]]),
      revelationElevenCanticle(),
    ],
    friday: [
      psalm("Psalm 135:1–12", 134, [[1, 12]]),
      psalm("Psalm 135:13–21", 134, [[13, 21]]),
      revelationFifteenCanticle(),
    ],
  }),
  4: eveningWeek(4, {
    sunday: [
      psalm("Psalm 110:1–5, 7", 109, [
        [1, 5],
        [7, 7],
      ]),
      psalm("Psalm 112", 111),
      canticle("Canticle of the redeemed · Revelation 19:1–7", [
        passage("revelation", 19, 1, 7),
      ]),
    ],
    monday: [
      psalm("Psalm 136:1–9", 135, [[1, 9]]),
      psalm("Psalm 136:10–26", 135, [[10, 26]]),
      ephesiansCanticle(),
    ],
    tuesday: [psalm("Psalm 137:1–6", 136, [[1, 6]]), psalm("Psalm 138", 137), revelationFourFiveCanticle()],
    wednesday: [
      psalm("Psalm 139:1–12", 138, [[1, 12]]),
      psalm("Psalm 139:13–18, 23–24", 138, [
        [13, 18],
        [23, 24],
      ]),
      colossiansCanticle(),
    ],
    thursday: [
      psalm("Psalm 144:1–8", 143, [[1, 8]]),
      psalm("Psalm 144:9–15", 143, [[9, 15]]),
      revelationElevenCanticle(),
    ],
    friday: [
      psalm("Psalm 145:1–13", 144, [[1, 13]]),
      psalm("Psalm 145:13–21", 144, [[13, 21]]),
      revelationFifteenCanticle(),
    ],
  }),
};

const NIGHT_PSALTER: Record<Weekday, ScriptureAnchor[]> = {
  saturday: [
    psalm("Psalm 4", 4),
    psalm("Psalm 134", 133),
    shortReading("Deuteronomy 6:4–7", [passage("deuteronomy", 6, 4, 7)]),
  ],
  sunday: [
    psalm("Psalm 91", 90),
    shortReading("Revelation 22:4–5", [passage("revelation", 22, 4, 5)]),
  ],
  monday: [
    psalm("Psalm 86", 85),
    shortReading("1 Thessalonians 5:9–10", [
      passage("1-thessalonians", 5, 9, 10),
    ]),
  ],
  tuesday: [
    psalm("Psalm 143:1–11", 142, [[1, 11]]),
    shortReading("1 Peter 5:8–9", [passage("1-peter", 5, 8, 9)]),
  ],
  wednesday: [
    psalm("Psalm 31:2–6", 30, [[2, 6]]),
    psalm("Psalm 130", 129),
    shortReading("Ephesians 4:26–27", [passage("ephesians", 4, 26, 27)]),
  ],
  thursday: [
    psalm("Psalm 16", 15),
    shortReading("1 Thessalonians 5:23", [
      passage("1-thessalonians", 5, 23, 23),
    ]),
  ],
  friday: [
    psalm("Psalm 88", 87),
    shortReading("Jeremiah 14:9", [passage("jeremiah", 14, 9, 9)]),
  ],
};

const MORNING_BRIEF_READINGS: Record<
  number,
  Record<Weekday, ScriptureAnchor>
> = {
  1: {
    sunday: shortReading("Revelation 7:9–12", [
      passage("revelation", 7, 9, 12),
    ]),
    monday: shortReading("2 Thessalonians 3:10b–13", [
      passage("2-thessalonians", 3, 10, 13),
    ]),
    tuesday: shortReading("Romans 13:11b–14", [
      passage("romans", 13, 11, 14),
    ]),
    wednesday: shortReading("Tobit 4:15–19 · Douay 4:16–17, 19–20", [
      passage("tobit", 4, 16, 17),
      passage("tobit", 4, 19, 20),
    ]),
    thursday: shortReading("Isaiah 66:1–2", [
      passage("isaiah", 66, 1, 2),
    ]),
    friday: shortReading("Ephesians 4:29–32", [
      passage("ephesians", 4, 29, 32),
    ]),
    saturday: shortReading("2 Peter 1:10–11", [
      passage("2-peter", 1, 10, 11),
    ]),
  },
  2: {
    sunday: shortReading("Ezekiel 36:25–28", [
      passage("ezekiel", 36, 25, 28),
    ]),
    monday: shortReading("Jeremiah 15:16", [
      passage("jeremiah", 15, 16, 16),
    ]),
    tuesday: shortReading("1 Thessalonians 5:4–5", [
      passage("1-thessalonians", 5, 4, 5),
    ]),
    wednesday: shortReading("Romans 8:35, 37", [
      passage("romans", 8, 35, 35),
      passage("romans", 8, 37, 37),
    ]),
    thursday: shortReading("Romans 14:17–19", [
      passage("romans", 14, 17, 19),
    ]),
    friday: shortReading("Ephesians 2:13–16", [
      passage("ephesians", 2, 13, 16),
    ]),
    saturday: shortReading("Romans 12:14–16", [
      passage("romans", 12, 14, 16),
    ]),
  },
  3: {
    sunday: shortReading("Ezekiel 37:12–14", [
      passage("ezekiel", 37, 12, 14),
    ]),
    monday: shortReading("James 2:12–13", [
      passage("james", 2, 12, 13),
    ]),
    tuesday: shortReading("1 John 4:14–15", [
      passage("1-john", 4, 14, 15),
    ]),
    wednesday: shortReading("Job 1:21; 2:10", [
      passage("job", 1, 21, 21),
      passage("job", 2, 10, 10),
    ]),
    thursday: shortReading("1 Peter 4:8–11", [
      passage("1-peter", 4, 8, 11),
    ]),
    friday: shortReading("2 Corinthians 12:9–10", [
      passage("2-corinthians", 12, 9, 10),
    ]),
    saturday: shortReading("Philippians 2:14–15", [
      passage("philippians", 2, 14, 15),
    ]),
  },
  4: {
    sunday: shortReading("2 Timothy 2:8a, 11–13", [
      passage("2-timothy", 2, 8, 8),
      passage("2-timothy", 2, 11, 13),
    ]),
    monday: shortReading(
      "Judith 8:25–27 · Douay 8:21–23, 26–27",
      [
        passage("judith", 8, 21, 23),
        passage("judith", 8, 26, 27),
      ],
    ),
    tuesday: shortReading("Isaiah 55:1–3", [
      passage("isaiah", 55, 1, 3),
    ]),
    wednesday: shortReading("Deuteronomy 4:39–40", [
      passage("deuteronomy", 4, 39, 40),
    ]),
    thursday: shortReading("Romans 8:18–21", [
      passage("romans", 8, 18, 21),
    ]),
    friday: shortReading("Galatians 2:19–20", [
      passage("galatians", 2, 19, 20),
    ]),
    saturday: shortReading("2 Peter 3:13–15", [
      passage("2-peter", 3, 13, 15),
    ]),
  },
};

const EVENING_BRIEF_READINGS: Record<
  number,
  Record<Weekday, ScriptureAnchor>
> = {
  1: {
    sunday: shortReading("2 Corinthians 1:3–4", [
      passage("2-corinthians", 1, 3, 4),
    ]),
    monday: shortReading("Colossians 1:9b–11", [
      passage("colossians", 1, 9, 11),
    ]),
    tuesday: shortReading("1 John 3:1a, 2", [
      passage("1-john", 3, 1, 2),
    ]),
    wednesday: shortReading("James 1:22, 25", [
      passage("james", 1, 22, 22),
      passage("james", 1, 25, 25),
    ]),
    thursday: shortReading("1 Peter 1:6–9", [
      passage("1-peter", 1, 6, 9),
    ]),
    friday: shortReading("Romans 15:1–6", [
      passage("romans", 15, 1, 6),
    ]),
    saturday: shortReading("Romans 11:33–36", [
      passage("romans", 11, 33, 36),
    ]),
  },
  2: {
    sunday: shortReading("2 Thessalonians 2:13–14", [
      passage("2-thessalonians", 2, 13, 14),
    ]),
    monday: shortReading("1 Thessalonians 2:13", [
      passage("1-thessalonians", 2, 13, 13),
    ]),
    tuesday: shortReading("Romans 3:23–25", [
      passage("romans", 3, 23, 25),
    ]),
    wednesday: shortReading("1 Peter 5:5b–7", [
      passage("1-peter", 5, 5, 7),
    ]),
    thursday: shortReading("1 Peter 1:18–23", [
      passage("1-peter", 1, 18, 23),
    ]),
    friday: shortReading("1 Corinthians 2:7–10a", [
      passage("1-corinthians", 2, 7, 10),
    ]),
    saturday: shortReading("Colossians 1:2b–6a", [
      passage("colossians", 1, 2, 6),
    ]),
  },
  3: {
    sunday: shortReading("1 Peter 1:3–5", [
      passage("1-peter", 1, 3, 5),
    ]),
    monday: shortReading("James 4:11–12", [
      passage("james", 4, 11, 12),
    ]),
    tuesday: shortReading("Romans 12:9–12", [
      passage("romans", 12, 9, 12),
    ]),
    wednesday: shortReading("Ephesians 3:20–21", [
      passage("ephesians", 3, 20, 21),
    ]),
    thursday: shortReading("1 Peter 3:8–9", [
      passage("1-peter", 3, 8, 9),
    ]),
    friday: shortReading("James 1:2–4", [
      passage("james", 1, 2, 4),
    ]),
    saturday: shortReading("Hebrews 13:20–21", [
      passage("hebrews", 13, 20, 21),
    ]),
  },
  4: {
    sunday: shortReading("Hebrews 12:22–24", [
      passage("hebrews", 12, 22, 24),
    ]),
    monday: shortReading("1 Thessalonians 3:12–13", [
      passage("1-thessalonians", 3, 12, 13),
    ]),
    tuesday: shortReading("Colossians 3:16", [
      passage("colossians", 3, 16, 16),
    ]),
    wednesday: shortReading("1 John 2:3–6", [
      passage("1-john", 2, 3, 6),
    ]),
    thursday: shortReading("Colossians 1:23", [
      passage("colossians", 1, 23, 23),
    ]),
    friday: shortReading("Romans 8:1–2, 10–11", [
      passage("romans", 8, 1, 2),
      passage("romans", 8, 10, 11),
    ]),
    saturday: shortReading("2 Peter 1:19–21", [
      passage("2-peter", 1, 19, 21),
    ]),
  },
};

export function getDailyOfficeGuides(
  localDate: string,
  psalterWeek: number,
  context: OfficeContext = {},
): OfficeGuide[] {
  const weekday = getWeekday(localDate);
  const normalizedWeek = normalizePsalterWeek(psalterWeek);
  const saturdayEveningWeek = normalizedWeek === 4 ? 1 : normalizedWeek + 1;
  const eveningWeek = weekday === "saturday" ? saturdayEveningWeek : normalizedWeek;
  const eveningDay = weekday === "saturday" ? "saturday" : weekday;
  const morningBrief = MORNING_BRIEF_READINGS[normalizedWeek][weekday];
  const eveningBrief = EVENING_BRIEF_READINGS[eveningWeek][eveningDay];
  const season = context.season ?? "Ordinary Time";
  const memorialOfMarthaMaryLazarus = localDate.endsWith("-07-29");
  const properNotice = memorialOfMarthaMaryLazarus
    ? {
        title: "Current U.S. proper for Saints Martha, Mary, and Lazarus",
        description:
          "The proper hymn, Saint Bernard reading, responsory, Gospel-canticle antiphons, and collect were confirmed in English in 2024. Open the official USCCB text below; Sanctum Council does not relabel an older or invented text as the approved proper.",
        href: "https://www.usccb.org/prayer-worship/liturgical-year/saints-martha-mary-and-lazarus",
        statusLabel: "Official proper · linked",
      }
    : null;
  const officeReadingPsalmody = getOfficeOfReadingsPsalmody(
    normalizedWeek,
    weekday,
    season,
  ).map(schedulePsalm);
  const currentDaytimePsalmody = getDaytimePsalmody(
    normalizedWeek,
    weekday,
  ).map(schedulePsalm);
  const officeLongReadings = getOfficeLongReadings(localDate);
  const daytimeReadings = getDaytimeReadings(localDate);

  return [
    {
      hourType: "office_readings",
      prayerItemType: "office_readings",
      hourLabel: "Office of Readings",
      traditionalName: "Vigils / Matins",
      suggestedTime: "Any hour · traditionally before dawn",
      psalterWeek: normalizedWeek,
      cycleLabel: `Four-week Psalter · Week ${toRomanNumeral(normalizedWeek)}`,
      generalNote:
        "A longer watch with three psalms and the day’s biblical reading. The current saint’s spiritual reading is linked from the approved U.S. proper.",
      openingLines: [
        "If this is your first Hour, say: O Lord, open thou my lips. And my mouth shall shew forth thy praise. Then use the optional Invitatory below.",
        "If another Hour already opened the day, say: O God, come to my assistance. O Lord, make haste to help me.",
      ],
      scriptureAnchors: [
        invitatoryPsalm(),
        ...officeReadingPsalmody,
        ...officeLongReadings,
      ],
      rubricNotes: memorialOfMarthaMaryLazarus
        ? [
            "Memorial rule: weekday psalmody and first biblical reading remain.",
            "Use the proper Saint Bernard second reading and responsory from the current U.S. proper.",
            "The Te Deum is not said on this memorial.",
          ]
        : [
            "The Office of Readings includes a second, non-biblical reading after the first responsory.",
            "Seasonal psalm substitutions are applied for the four affected Psalter days.",
          ],
      properNotice,
      closingSteps: [
        {
          title: "Keep silence",
          instruction:
            "Let the biblical reading and the witness of the Church meet before you answer.",
        },
        {
          title: "Respond",
          instruction:
            "Offer the day’s work of study, repentance, service, and contemplation to God.",
        },
      ],
    },
    {
      hourType: "morning_prayer",
      prayerItemType: "morning_prayer",
      hourLabel: "Morning Prayer",
      traditionalName: "Lauds",
      suggestedTime: "At dawn",
      psalterWeek: normalizedWeek,
      cycleLabel: `Four-week Psalter · Week ${toRomanNumeral(normalizedWeek)}`,
      generalNote:
        "Receive the morning from God: pray the appointed psalm, Old Testament canticle, psalm of praise, and the Benedictus in order.",
      openingLines: [
        "If this is your first Hour, say: O Lord, open thou my lips. And my mouth shall shew forth thy praise. Then use the optional Invitatory below.",
        "Otherwise say: O God, come to my assistance. O Lord, make haste to help me.",
      ],
      scriptureAnchors: [
        invitatoryPsalm(),
        ...MORNING_PSALTER[normalizedWeek][weekday],
        ...(memorialOfMarthaMaryLazarus
          ? [
              shortReading("Romans 12:1–2", [
                passage("romans", 12, 1, 2),
              ]),
            ]
          : [morningBrief]),
        gospelCanticle(
          "Benedictus · Canticle of Zechariah",
          "Luke 1:68–79",
          passage("luke", 1, 68, 79),
        ),
      ],
      rubricNotes: memorialOfMarthaMaryLazarus
        ? [
            "Week I Wednesday psalmody remains: Psalm 36, Judith 16, and Psalm 47.",
            "The Common of Holy Men supplies the built-in short reading, Romans 12:1–2; use its approved responsory and intercessions from the current liturgical text.",
            "Use the proper 2024 hymn, Benedictus antiphon, and collect from the linked U.S. proper.",
          ]
        : [
            "The Benedictus follows the brief reading and responsory.",
            "On celebrations, consult the current proper and common for replacements.",
          ],
      properNotice,
      closingSteps: [
        {
          title: "Intercede",
          instruction:
            "Name the people, duties, wounds, and hopes you are carrying into this day.",
        },
        { title: "Our Father", instruction: "Pray the Lord’s Prayer slowly." },
        {
          title: "Go in peace",
          instruction:
            "Ask for grace to live this day in holiness, mercy, and courage. Amen.",
        },
      ],
    },
    makeDaytimeGuide({
      hourType: "midmorning_prayer",
      hourLabel: "Midmorning Prayer",
      traditionalName: "Terce",
      suggestedTime: "About 9:00 AM",
      cycleLabel: "Complementary Psalmody · Series I",
      generalNote:
        "Sanctify the work already begun. Because the current four-week psalmody is placed at Midday, Terce uses its complementary psalms.",
      psalmody: getComplementaryPsalmody("midmorning_prayer").map(
        schedulePsalm,
      ),
      readings: daytimeReadings.midmorning_prayer ?? [],
      alternatePsalmody: {
        title: "Praying Terce as your only Daytime Hour?",
        instruction: `Use this current Week ${toRomanNumeral(normalizedWeek)} psalmody instead of Psalms 120–122.`,
        scriptureAnchors: currentDaytimePsalmody,
      },
      normalizedWeek,
      firstRubric:
        "If you pray only one Daytime Hour, you may use the current four-week psalmody here instead.",
      closingTitle: "Consecrate",
      closingInstruction:
        "Offer the next work, meeting, duty, or interruption to the Holy Spirit.",
    }),
    makeDaytimeGuide({
      hourType: "midday_prayer",
      hourLabel: "Midday Prayer",
      traditionalName: "Sext",
      suggestedTime: "About noon",
      cycleLabel: `Current Daytime Psalmody · Week ${toRomanNumeral(normalizedWeek)}`,
      generalNote:
        "Stand in the middle of the day before God. This is the selected Hour for today’s current four-week psalmody.",
      psalmody: currentDaytimePsalmody,
      readings: daytimeReadings.midday_prayer ?? [],
      normalizedWeek,
      firstRubric:
        "One Daytime Hour is sufficient outside choir; Terce, Sext, or None may be chosen.",
      closingTitle: "Return",
      closingInstruction:
        "Ask for a recollected heart through the labor and decisions of the afternoon.",
    }),
    makeDaytimeGuide({
      hourType: "midafternoon_prayer",
      hourLabel: "Midafternoon Prayer",
      traditionalName: "None",
      suggestedTime: "About 3:00 PM",
      cycleLabel: "Complementary Psalmody · Series III",
      generalNote:
        "Meet fatigue, unfinished work, and the memory of Christ’s Passion with prayer rather than drift.",
      psalmody: getComplementaryPsalmody("midafternoon_prayer").map(
        schedulePsalm,
      ),
      readings: daytimeReadings.midafternoon_prayer ?? [],
      alternatePsalmody: {
        title: "Praying None as your only Daytime Hour?",
        instruction: `Use this current Week ${toRomanNumeral(normalizedWeek)} psalmody instead of Psalms 126–128.`,
        scriptureAnchors: currentDaytimePsalmody,
      },
      normalizedWeek,
      firstRubric:
        "If this is the only Daytime Hour you pray, use the current four-week psalmody instead of complementary Series III.",
      closingTitle: "Persevere",
      closingInstruction:
        "Entrust the unfinished, the difficult, and the people encountered today to Christ.",
    }),
    {
      hourType: "evening_prayer",
      prayerItemType: "evening_prayer",
      hourLabel: "Evening Prayer",
      traditionalName: "Vespers",
      suggestedTime: "At evening",
      psalterWeek: eveningWeek,
      cycleLabel:
        weekday === "saturday"
          ? `Sunday Evening Prayer I · Week ${toRomanNumeral(eveningWeek)}`
          : `Four-week Psalter · Week ${toRomanNumeral(eveningWeek)}`,
      generalNote:
        "Return the day to God: pray the evening psalmody, New Testament canticle, and Mary’s Magnificat without hunting through pages.",
      openingLines: [
        "Make the Sign of the Cross and lay the day before God.",
        "O God, come to my assistance. O Lord, make haste to help me.",
      ],
      scriptureAnchors: [
        ...EVENING_PSALTER[eveningWeek][eveningDay],
        ...(memorialOfMarthaMaryLazarus
          ? [
              shortReading("Romans 8:28–30", [
                passage("romans", 8, 28, 30),
              ]),
            ]
          : [eveningBrief]),
        gospelCanticle(
          "Magnificat · Canticle of Mary",
          "Luke 1:46–55",
          passage("luke", 1, 46, 55),
        ),
      ],
      rubricNotes: memorialOfMarthaMaryLazarus
        ? [
            "Week I Wednesday psalmody remains: Psalm 27 in two sections and Colossians 1:12–20.",
            "The Common of Holy Men supplies the built-in short reading, Romans 8:28–30; use its approved responsory and intercessions from the current liturgical text.",
            "Use the proper hymn, Magnificat antiphon, and collect from the linked U.S. proper.",
          ]
        : [
            "The Magnificat follows the brief reading and responsory.",
            "Saturday Evening Prayer is Evening Prayer I of Sunday.",
          ],
      properNotice,
      closingSteps: [
        {
          title: "Give thanks",
          instruction:
            "Name the graces of this day, including the quiet ones that were easy to miss.",
        },
        {
          title: "Intercede",
          instruction: "Entrust the Church, the suffering, and the dead to God.",
        },
        { title: "Our Father", instruction: "Pray the Lord’s Prayer slowly." },
      ],
    },
    {
      hourType: "night_prayer",
      prayerItemType: "night_prayer",
      hourLabel: "Night Prayer",
      traditionalName: "Compline",
      suggestedTime: "Before sleep",
      psalterWeek: normalizedWeek,
      cycleLabel: "One-week Night Prayer cycle",
      generalNote:
        "End without scorekeeping: examine the day, ask mercy, pray the appointed psalm and reading, then rest with Simeon’s canticle.",
      openingLines: [
        "Become still. Review the day with gratitude, sorrow, and honesty; then ask God’s mercy.",
        "O God, come to my assistance. O Lord, make haste to help me.",
      ],
      scriptureAnchors: [
        ...NIGHT_PSALTER[weekday],
        gospelCanticle(
          "Nunc dimittis · Canticle of Simeon",
          "Luke 2:29–32",
          passage("luke", 2, 29, 32),
        ),
      ],
      rubricNotes: [
        "Night Prayer follows its own one-week cycle and is not replaced by the memorial.",
        "After the blessing, conclude with a permitted Marian antiphon.",
      ],
      properNotice: null,
      closingSteps: [
        {
          title: "Surrender",
          instruction:
            "Place your body, memory, unfinished work, and everyone you love under God’s protection.",
        },
        {
          title: "Rest",
          instruction:
            "May the almighty Lord grant us a quiet night and a perfect end. Amen.",
        },
      ],
    },
  ];
}

function makeDaytimeGuide({
  hourType,
  hourLabel,
  traditionalName,
  suggestedTime,
  cycleLabel,
  generalNote,
  psalmody,
  readings,
  alternatePsalmody,
  normalizedWeek,
  firstRubric,
  closingTitle,
  closingInstruction,
}: {
  hourType: Extract<
    OfficeHourType,
    "midmorning_prayer" | "midday_prayer" | "midafternoon_prayer"
  >;
  hourLabel: string;
  traditionalName: string;
  suggestedTime: string;
  cycleLabel: string;
  generalNote: string;
  psalmody: ScriptureAnchor[];
  readings: ScriptureAnchor[];
  alternatePsalmody?: OfficeGuide["alternatePsalmody"];
  normalizedWeek: number;
  firstRubric: string;
  closingTitle: string;
  closingInstruction: string;
}): OfficeGuide {
  return {
    hourType,
    prayerItemType: "daytime_prayer",
    hourLabel,
    traditionalName,
    suggestedTime,
    psalterWeek: normalizedWeek,
    cycleLabel,
    generalNote,
    openingLines: [
      "Pause the work in your hands and remember whose work it is.",
      "O God, come to my assistance. O Lord, make haste to help me.",
    ],
    scriptureAnchors: [...psalmody, ...readings],
    alternatePsalmody,
    rubricNotes: [
      firstRubric,
      "When all three Daytime Hours are prayed, the current psalmody is used once and complementary psalmody at the other two.",
    ],
    properNotice: null,
    closingSteps: [
      {
        title: closingTitle,
        instruction: closingInstruction,
      },
    ],
  };
}

function schedulePsalm(schedule: PsalmSchedule) {
  const verseTextOverrides =
    schedule.displayCitation === "Psalm 17:1–9a"
      ? [
          {
            passageIndex: 0,
            verseNumber: 9,
            text: "from the face of the impious, that have afflicted me.",
          },
        ]
      : schedule.displayCitation === "Psalm 17:9b–15"
        ? [
            {
              passageIndex: 0,
              verseNumber: 9,
              text: "Mine enemies have compassed my soul,",
            },
          ]
        : undefined;
  const rendered = psalm(
    schedule.displayCitation,
    schedule.douayChapter,
    schedule.douayRanges,
    verseTextOverrides,
  );

  return schedule.containsHalfVerse
    ? {
        ...rendered,
        sourceLabel: verseTextOverrides
          ? `${SOURCE_LABEL} · half-verse boundary divided at the Douay sentence break`
          : `${SOURCE_LABEL} · complete boundary verse shown where the liturgical citation specifies a half-verse`,
      }
    : rendered;
}

function getOfficeLongReadings(localDate: string): ScriptureAnchor[] {
  if (localDate === "2026-07-29") {
    return [
      anchor(
        "First reading",
        "2 Corinthians 10:1–11:6",
        "Office of Readings · biblical reading",
        [
          passage("2-corinthians", 10, 1, 18),
          passage("2-corinthians", 11, 1, 6),
        ],
        "Read the whole passage slowly. Keep silence before opening the proper spiritual reading.",
      ),
    ];
  }

  return [];
}

function getDaytimeReadings(localDate: string): Partial<
  Record<
    "midmorning_prayer" | "midday_prayer" | "midafternoon_prayer",
    ScriptureAnchor[]
  >
> {
  if (localDate !== "2026-07-29") {
    return {};
  }

  return {
    midmorning_prayer: [
      shortReading("1 Peter 1:13–14", [passage("1-peter", 1, 13, 14)]),
    ],
    midday_prayer: [
      shortReading("1 Peter 1:15–16", [passage("1-peter", 1, 15, 16)]),
    ],
    midafternoon_prayer: [
      {
        ...shortReading(
          "James 4:7–8a, 10",
          [
            passage("james", 4, 7, 8),
            passage("james", 4, 10, 10),
          ],
          [
            {
              passageIndex: 0,
              verseNumber: 8,
              text: "Approach to God, & he will approach to you.",
            },
          ],
        ),
        sourceLabel: `${SOURCE_LABEL} · verse 8a ends at the first Douay sentence`,
      },
    ],
  };
}

function eveningWeek(
  psalterWeek: number,
  weekdays: Omit<Record<Weekday, ScriptureAnchor[]>, "saturday">,
): Record<Weekday, ScriptureAnchor[]> {
  return {
    ...weekdays,
    saturday: sundayEveningOne(psalterWeek),
  };
}

function sundayEveningOne(psalterWeek: number) {
  const psalmsByWeek: Record<number, ScriptureAnchor[]> = {
    1: [psalm("Psalm 141:1–9", 140, [[1, 9]]), psalm("Psalm 142", 141)],
    2: [
      psalm("Psalm 119:105–112", 118, [[105, 112]]),
      psalm("Psalm 16", 15),
    ],
    3: [psalm("Psalm 113", 112), psalm("Psalm 116:10–19", 115)],
    4: [psalm("Psalm 122", 121), psalm("Psalm 130", 129)],
  };

  return [
    ...(psalmsByWeek[psalterWeek] ?? psalmsByWeek[1]),
    canticle("Canticle of Christ · Philippians 2:6–11", [
      passage("philippians", 2, 6, 11),
    ]),
  ];
}

function ephesiansCanticle() {
  return canticle("Canticle of blessing · Ephesians 1:3–10", [
    passage("ephesians", 1, 3, 10),
  ]);
}

function revelationFourFiveCanticle() {
  return canticle("Canticle of the redeemed · Revelation 4:11; 5:9–10, 12", [
    passage("revelation", 4, 11, 11),
    passage("revelation", 5, 9, 10),
    passage("revelation", 5, 12, 12),
  ]);
}

function colossiansCanticle() {
  return canticle("Canticle of Christ · Colossians 1:12–20", [
    passage("colossians", 1, 12, 20),
  ]);
}

function revelationElevenCanticle() {
  return canticle("Canticle of the kingdom · Revelation 11:17–18; 12:10–12", [
    passage("revelation", 11, 17, 18),
    passage("revelation", 12, 10, 12),
  ]);
}

function revelationFifteenCanticle() {
  return canticle("Canticle of adoration · Revelation 15:3–4", [
    passage("revelation", 15, 3, 4),
  ]);
}

function psalm(
  displayCitation: string,
  douayChapter: number,
  ranges: [number, number][] = [],
  verseTextOverrides?: ScriptureAnchor["verseTextOverrides"],
): ScriptureAnchor {
  const passages =
    ranges.length === 0
      ? [passage("psalms", douayChapter)]
      : ranges.map(([start, end]) => passage("psalms", douayChapter, start, end));

  return anchor(
    "Psalm",
    `${displayCitation} · Douay Psalm ${douayChapter}`,
    "Appointed psalmody",
    passages,
    "Pray the words aloud or under your breath; do not hurry the line that resists you.",
    verseTextOverrides,
  );
}

function canticle(citation: string, passages: ScripturePassage[]) {
  return anchor(
    "Canticle",
    citation,
    "Appointed biblical canticle",
    passages,
    "Receive this song as the Church’s answer to the Word of God.",
  );
}

function shortReading(
  citation: string,
  passages: ScripturePassage[],
  verseTextOverrides?: ScriptureAnchor["verseTextOverrides"],
) {
  return anchor(
    "Brief reading",
    citation,
    "Scripture reading",
    passages,
    "Keep one sentence with you in silence before continuing.",
    verseTextOverrides,
  );
}

function gospelCanticle(
  title: string,
  citation: string,
  scripturePassage: ScripturePassage,
) {
  return anchor(
    title,
    citation,
    "Gospel canticle",
    [scripturePassage],
    "Stand if you are able and make the Sign of the Cross as the canticle begins.",
  );
}

function invitatoryPsalm() {
  return anchor(
    "Optional Invitatory",
    "Psalm 95 · Douay Psalm 94",
    "Use only when this is the first Hour of the day",
    [passage("psalms", 94)],
    "Repeat the approved invitatory antiphon before and between the stanzas if you have it; otherwise pray the psalm attentively as a public-domain devotional opening.",
  );
}

function anchor(
  title: string,
  citation: string,
  role: string,
  passages: ScripturePassage[],
  reflection: string,
  verseTextOverrides?: ScriptureAnchor["verseTextOverrides"],
): ScriptureAnchor {
  return {
    title,
    citation,
    role,
    passages,
    text: null,
    source: "public_domain",
    sourceLabel: SOURCE_LABEL,
    reflection,
    verseTextOverrides,
  };
}

function passage(
  bookId: string,
  chapter: number,
  verseStart: number | null = null,
  verseEnd: number | null = verseStart,
): ScripturePassage {
  return { bookId, chapter, verseStart, verseEnd };
}

function getWeekday(localDate: string): Weekday {
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" })
    .format(new Date(`${localDate}T12:00:00`))
    .toLowerCase();

  if (
    weekday === "sunday" ||
    weekday === "monday" ||
    weekday === "tuesday" ||
    weekday === "wednesday" ||
    weekday === "thursday" ||
    weekday === "friday" ||
    weekday === "saturday"
  ) {
    return weekday;
  }

  return "sunday";
}

function normalizePsalterWeek(value: number) {
  return value >= 1 && value <= 4 ? value : 1;
}

function toRomanNumeral(value: number) {
  return ["I", "II", "III", "IV"][value - 1] ?? String(value);
}
