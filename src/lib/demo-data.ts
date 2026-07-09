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
  instruction: string;
  copyrightSafeNote: string;
  contentLicenseStatus: "metadata_only";
};

export type OfficeGuide = {
  hourType: PrayerItemType;
  volume: string;
  psalterWeek: number;
  generalNote: string;
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
      editionId: "us-four-volume",
      title: "Liturgy of the Hours, Four Volume Edition",
      currentVolume: "Volume III",
    },
    prayerRule: {
      enabledItems: ["morning_prayer", "night_prayer"],
      difficultyLevel: 1,
    },
    habitLog: {},
    habitHistory: {},
    officeGuides: [
      {
        hourType: "morning_prayer",
        volume: "Volume III",
        psalterWeek: liturgicalDay.psalterWeek,
        generalNote: "Use the physical breviary for the official prayer text.",
        steps: [
          {
            order: 1,
            sectionType: "ordinary",
            pageStart: null,
            instruction: "Begin with the Ordinary for Morning Prayer.",
            copyrightSafeNote: "Metadata only.",
            contentLicenseStatus: "metadata_only",
          },
          {
            order: 2,
            sectionType: "psalter",
            pageStart: null,
            instruction: `Go to Psalter Week ${toRomanNumeral(
              liturgicalDay.psalterWeek,
            )}, ${getWeekdayName(localDate)}.`,
            copyrightSafeNote:
              "Page references can be added after edition verification.",
            contentLicenseStatus: "metadata_only",
          },
          {
            order: 3,
            sectionType: "proper",
            pageStart: null,
            instruction:
              "Check the Proper of Saints before the concluding prayer.",
            copyrightSafeNote: "Do not store official translated texts.",
            contentLicenseStatus: "metadata_only",
          },
        ],
      },
      {
        hourType: "night_prayer",
        volume: "Volume III",
        psalterWeek: liturgicalDay.psalterWeek,
        generalNote:
          "Night Prayer follows the weekly psalter and the physical book.",
        steps: [
          {
            order: 1,
            sectionType: "ordinary",
            pageStart: null,
            instruction: "Begin with the examination of conscience.",
            copyrightSafeNote: "Metadata only.",
            contentLicenseStatus: "metadata_only",
          },
          {
            order: 2,
            sectionType: "psalter",
            pageStart: null,
            instruction: `Use ${getWeekdayName(
              localDate,
            )} Night Prayer from the psalter.`,
            copyrightSafeNote: "Do not store official translated texts.",
            contentLicenseStatus: "metadata_only",
          },
          {
            order: 3,
            sectionType: "closing",
            pageStart: null,
            instruction: "Use the concluding prayer indicated in the book.",
            copyrightSafeNote: "Physical breviary carries the text.",
            contentLicenseStatus: "metadata_only",
          },
        ],
      },
    ],
    councilPrompt: getCouncilPrompt("morning", "missed_prayer"),
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
