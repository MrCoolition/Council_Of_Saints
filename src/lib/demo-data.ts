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
import {
  getUsMassReadingsForDate,
  type MassReadingsEntry,
} from "@/lib/mass-readings";

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
    observanceId?: string;
    weekdayCycle?: string;
    sundayCycle?: string;
    sourceLabel?: string;
    sourceUrl?: string;
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
  massReadings: MassReadingsEntry;
  councilPrompt: CouncilPrompt;
};

const ordinaryTimeAnchor = new Date("2026-07-05T12:00:00");
const ordinaryTimeAnchorWeek = 14;
const verifiedCalendarFixtures: Record<
  string,
  TodayPayload["liturgicalDay"]
> = {
  "2026-07-29": {
    title: "Saints Martha, Mary and Lazarus",
    season: "Ordinary Time",
    weekOfSeason: 17,
    psalterWeek: 1,
    rank: "Obligatory Memorial",
    color: "White",
    observanceId: "saints_martha_mary_and_lazarus",
    weekdayCycle: "Weekday Cycle II",
    sundayCycle: "Sunday Cycle A",
    sourceLabel: "Verified 2026 U.S. liturgical calendar fixture",
    sourceUrl: "https://www.usccb.org/resources/2026cal.pdf",
  },
};
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
      editionId: "sanctum-hours",
      title: "Sanctum Hours",
      currentVolume: "Seven canonical Hours",
    },
    prayerRule: {
      enabledItems: [
        "office_readings",
        "morning_prayer",
        "daytime_prayer",
        "evening_prayer",
        "night_prayer",
      ],
      difficultyLevel: 1,
    },
    habitLog: {},
    habitHistory: {},
    officeGuides: getDailyOfficeGuides(localDate, liturgicalDay.psalterWeek, {
      title: liturgicalDay.title,
      season: liturgicalDay.season,
      rank: liturgicalDay.rank,
      color: liturgicalDay.color,
    }),
    massReadings: getUsMassReadingsForDate(localDate),
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
  const verifiedFixture = verifiedCalendarFixtures[localDate];

  if (verifiedFixture) {
    return verifiedFixture;
  }

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
