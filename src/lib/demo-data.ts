import { getCouncilPrompt, type CouncilPrompt } from "@/lib/council";
import {
  FORMATION_MOTTO,
  type HabitStatus,
  type PrayerItemType,
} from "@/lib/domain";
import { getLocalIsoDate, getMonthBounds } from "@/lib/dates";
import {
  getDailyOfficeGuides,
  type OfficeGuide,
} from "@/lib/office-psalter";

export type { OfficeGuide, ScriptureAnchor } from "@/lib/office-psalter";

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

const ordinaryTimeAnchor = new Date("2026-07-05T12:00:00");
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
      editionId: "scripture-psalter",
      title: "Daily Scripture Psalter",
      currentVolume: "Scripture Psalter",
    },
    prayerRule: {
      enabledItems: [
        "morning_prayer",
        "evening_prayer",
        "night_prayer",
      ],
      difficultyLevel: 1,
    },
    habitLog: {},
    habitHistory: {},
    officeGuides: getDailyOfficeGuides(localDate, liturgicalDay.psalterWeek),
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
