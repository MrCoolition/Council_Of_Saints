import { getCouncilPrompt, type CouncilPrompt } from "@/lib/council";
import {
  FORMATION_MOTTO,
  type HabitStatus,
  type PrayerItemType,
} from "@/lib/domain";
import { getLocalIsoDate, getMonthBounds } from "@/lib/dates";

export type OfficeGuideStep = {
  order: number;
  sectionType: string;
  pageStart: number | null;
  pageEnd: number | null;
  userPageStart: number | null;
  userPageEnd: number | null;
  instruction: string;
  copyrightSafeNote: string;
  contentLicenseStatus: "metadata_only";
};

export type ScriptureAnchor = {
  title: string;
  citation: string;
  role: string;
  text: string | null;
  source: "citation_only" | "public_domain";
  sourceLabel: string;
  reflection: string;
};

export type OfficeGuide = {
  hourType: PrayerItemType;
  volume: string;
  psalterWeek: number;
  generalNote: string;
  bookReferenceNote: string;
  scriptureAnchors: ScriptureAnchor[];
  steps: OfficeGuideStep[];
};

export type TodayPayload = {
  appName: string;
  motto: string;
  localDate: string;
  mode: "demo" | "database";
  liturgicalDay: {
    title: string;
    season: string;
    weekOfSeason: number;
    psalterWeek: number;
    rank: string;
    color: string;
  };
  profile: {
    displayName: string;
    timezone: string;
    country: string;
    diocese: string | null;
    formationStage: string;
  };
  breviary: {
    editionId: string;
    title: string;
    currentVolume: string;
  };
  prayerRule: {
    enabledItems: PrayerItemType[];
    difficultyLevel: number;
  };
  habitLog: Partial<Record<PrayerItemType, HabitStatus>>;
  habitHistory: Record<string, Partial<Record<PrayerItemType, HabitStatus>>>;
  officeGuides: OfficeGuide[];
  councilPrompt: CouncilPrompt;
};

const ordinaryTimeAnchor = new Date("2026-07-06T12:00:00");
const ordinaryTimeAnchorWeek = 14;
const ordinalNames = [
  "",
  "First",
  "Second",
  "Third",
  "Fourth",
  "Fifth",
  "Sixth",
  "Seventh",
  "Eighth",
  "Ninth",
  "Tenth",
  "Eleventh",
  "Twelfth",
  "Thirteenth",
  "Fourteenth",
  "Fifteenth",
  "Sixteenth",
  "Seventeenth",
  "Eighteenth",
  "Nineteenth",
  "Twentieth",
  "Twenty-First",
  "Twenty-Second",
  "Twenty-Third",
  "Twenty-Fourth",
  "Twenty-Fifth",
  "Twenty-Sixth",
  "Twenty-Seventh",
  "Twenty-Eighth",
  "Twenty-Ninth",
  "Thirtieth",
  "Thirty-First",
  "Thirty-Second",
  "Thirty-Third",
  "Thirty-Fourth",
];

export function getDemoTodayPayload(localDate = getLocalIsoDate()): TodayPayload {
  const liturgicalDay = getDemoLiturgicalDay(localDate);

  return {
    appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Sanctum Council",
    motto: FORMATION_MOTTO,
    localDate,
    mode: "demo",
    liturgicalDay,
    profile: {
      displayName: "Coolition",
      timezone: "America/New_York",
      country: "US",
      diocese: null,
      formationStage: "lay_discernment",
    },
    breviary: {
      editionId: "us-four-volume-large-print",
      title: "Liturgy of the Hours, Large Print Four Volume Edition",
      currentVolume: "Volume III",
    },
    prayerRule: {
      enabledItems: ["morning_prayer", "night_prayer"],
      difficultyLevel: 1,
    },
    habitLog: {},
    habitHistory: {},
    officeGuides: getDemoOfficeGuides(localDate, liturgicalDay),
    councilPrompt: getCouncilPrompt("morning", "missed_prayer"),
  };
}

export function getDemoOfficeGuides(
  localDate: string,
  liturgicalDay: TodayPayload["liturgicalDay"],
): OfficeGuide[] {
  const weekday = getWeekdayName(localDate);
  const psalterWeek = liturgicalDay.psalterWeek;
  const psalterLabel = `Psalter Week ${toRomanNumeral(psalterWeek)}`;

  return [
    {
      hourType: "morning_prayer",
      volume: "Volume III",
      psalterWeek,
      generalNote:
        "Open the large-print Volume III and let the Church give the first words.",
      bookReferenceNote:
        "Large-print page numbers are saved after you verify them from your physical book.",
      scriptureAnchors: getOfficeScriptureAnchors(
        "morning_prayer",
        localDate,
        psalterWeek,
      ),
      steps: [
        createOfficeStep(
          1,
          "ordinary",
          "Begin with the Ordinary for Morning Prayer.",
          "Metadata only.",
        ),
        createOfficeStep(
          2,
          "psalter",
          `Go to ${psalterLabel}, ${weekday}.`,
          "Page references can be added after edition verification.",
        ),
        createOfficeStep(
          3,
          "proper",
          "Check the Proper of Saints before the concluding prayer.",
          "Do not store official translated texts.",
        ),
      ],
    },
    {
      hourType: "night_prayer",
      volume: "Volume III",
      psalterWeek,
      generalNote:
        "Close the day under God's protection, then let the screen go dark.",
      bookReferenceNote:
        "Large-print page numbers are saved after you verify them from your physical book.",
      scriptureAnchors: getOfficeScriptureAnchors(
        "night_prayer",
        localDate,
        psalterWeek,
      ),
      steps: [
        createOfficeStep(
          1,
          "ordinary",
          "Begin with the examination of conscience.",
          "Metadata only.",
        ),
        createOfficeStep(
          2,
          "psalter",
          `Use ${weekday} Night Prayer from the psalter.`,
          "Do not store official translated texts.",
        ),
        createOfficeStep(
          3,
          "closing",
          "Use the concluding prayer indicated in the book.",
          "Physical breviary carries the text.",
        ),
      ],
    },
  ];
}

export function getOfficeScriptureAnchors(
  hourType: PrayerItemType,
  localDate: string,
  psalterWeek: number,
): ScriptureAnchor[] {
  const weekday = getWeekdayName(localDate);

  if (
    hourType === "morning_prayer" &&
    psalterWeek === 2 &&
    weekday === "Thursday"
  ) {
    return [
      {
        title: "Psalmody",
        citation: "Psalm 80; Isaiah 12:1-6; Psalm 81",
        role: "Psalms and canticle",
        text: "Convert us, O God: and shew us thy face, and we shall be saved.",
        source: "public_domain",
        sourceLabel: "Douay-Rheims 1899, Psalm 79:4",
        reflection:
          "Let the morning begin as a cry for conversion, not as a performance report.",
      },
      {
        title: "Short reading",
        citation: "Romans 8:18-21",
        role: "Scripture reading",
        text: "The sufferings of this time are not worthy to be compared with the glory to come.",
        source: "public_domain",
        sourceLabel: "Douay-Rheims 1899, Romans 8:18",
        reflection:
          "Hope is not mood. Hope is obedience under the weight of glory.",
      },
    ];
  }

  if (hourType === "night_prayer" && weekday === "Thursday") {
    return [
      {
        title: "Psalmody",
        citation: "Psalm 16",
        role: "Psalm",
        text: "Preserve me, O Lord, for I have put my trust in thee.",
        source: "public_domain",
        sourceLabel: "Douay-Rheims 1899, Psalm 15:1",
        reflection:
          "End the day by placing your body, memory, and unfinished work under protection.",
      },
      {
        title: "Short reading",
        citation: "1 Thessalonians 5:23",
        role: "Scripture reading",
        text: "May the God of peace himself sanctify you in all things.",
        source: "public_domain",
        sourceLabel: "Douay-Rheims 1899, 1 Thessalonians 5:23",
        reflection:
          "The last word of the day is not scorekeeping. It is sanctification.",
      },
    ];
  }

  return [
    {
      title: "Office scripture",
      citation: `Psalter Week ${toRomanNumeral(psalterWeek)}, ${weekday}`,
      role: "Psalter reference",
      text: null,
      source: "citation_only",
      sourceLabel: "Liturgy of the Hours metadata",
      reflection:
        "Open the appointed psalmody and let Scripture name the desire of the hour.",
    },
  ];
}

function createOfficeStep(
  order: number,
  sectionType: string,
  instruction: string,
  copyrightSafeNote: string,
): OfficeGuideStep {
  return {
    order,
    sectionType,
    pageStart: null,
    pageEnd: null,
    userPageStart: null,
    userPageEnd: null,
    instruction,
    copyrightSafeNote,
    contentLicenseStatus: "metadata_only",
  };
}

export function getDemoCalendarMonth(year: number, month: number) {
  const { daysInMonth } = getMonthBounds(year, month);

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const localDate = `${year}-${String(month).padStart(2, "0")}-${String(
      day,
    ).padStart(2, "0")}`;

    return {
      localDate,
      ...getDemoLiturgicalDay(localDate),
    };
  });
}

function getDemoLiturgicalDay(localDate: string): TodayPayload["liturgicalDay"] {
  const date = new Date(`${localDate}T12:00:00`);
  const daysSinceAnchor = Math.round(
    (date.getTime() - ordinaryTimeAnchor.getTime()) / 86_400_000,
  );
  const weekOfSeason = Math.max(
    1,
    ordinaryTimeAnchorWeek + Math.floor(daysSinceAnchor / 7),
  );
  const psalterWeek = ((weekOfSeason - 1) % 4) + 1;
  const weekday = getWeekdayName(localDate);
  const ordinal = ordinalNames[weekOfSeason] ?? `${weekOfSeason}th`;

  return {
    title: `${weekday} of the ${ordinal} Week in Ordinary Time`,
    season: "Ordinary Time",
    weekOfSeason,
    psalterWeek,
    rank: "Weekday",
    color: "Green",
  };
}

function getWeekdayName(localDate: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    new Date(`${localDate}T12:00:00`),
  );
}

function toRomanNumeral(value: number) {
  switch (value) {
    case 1:
      return "I";
    case 2:
      return "II";
    case 3:
      return "III";
    case 4:
      return "IV";
    default:
      return String(value);
  }
}
