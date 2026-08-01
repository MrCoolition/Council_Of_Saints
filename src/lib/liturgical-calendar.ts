import { UnitedStates_En } from "@romcal/calendar.united-states";
import {
  Romcal,
  type LiturgicalCalendar,
  type LiturgicalDay as RomcalLiturgicalDay,
} from "romcal";

export type PsalterWeek = 1 | 2 | 3 | 4;

export type LiturgicalCycles = {
  proper: {
    id: string;
    label: string;
  };
  sunday: {
    id: string;
    label: string;
    year: "A" | "B" | "C" | null;
  };
  weekday: {
    id: string;
    label: string;
    year: 1 | 2 | null;
  };
  psalter: {
    id: string;
    label: string;
    week: PsalterWeek;
  };
};

export type LiturgicalWeekdayFallback = {
  observanceId: string;
  title: string;
  season: string;
  seasonId: string;
  weekOfSeason: number;
  psalterWeek: PsalterWeek;
  rank: string;
  rankId: string;
  color: string;
  colorId: string;
  cycles: LiturgicalCycles;
};

export type ResolvedLiturgicalDay = {
  localDate: string;
  country: "US";
  observanceId: string;
  title: string;
  season: string;
  seasonId: string;
  weekOfSeason: number;
  psalterWeek: PsalterWeek;
  rank: string;
  rankId: string;
  color: string;
  colorId: string;
  isHolyDayOfObligation: boolean;
  isOptional: boolean;
  cycles: LiturgicalCycles;
  weekdayFallback: LiturgicalWeekdayFallback | null;
  source: {
    engine: "romcal";
    engineVersion: string;
    calendar: "United States";
    calendarId: string;
    label: string;
    urls: {
      engine: string;
      calendarBundle: string;
      authority: string;
    };
  };
  settings: {
    epiphanyOnSunday: boolean;
    corpusChristiOnSunday: boolean;
    ascensionOnSunday: boolean;
  };
};

const ROMCAL_URL = "https://github.com/romcal/romcal";
const US_CALENDAR_BUNDLE_URL =
  "https://www.npmjs.com/package/@romcal/calendar.united-states";
const USCCB_CALENDAR_URL =
  "https://www.usccb.org/committees/divine-worship/liturgical-calendar";

const calendarCache = new Map<string, Promise<LiturgicalCalendar>>();
let unitedStatesRomcal: Romcal | undefined;

export async function getLiturgicalDay(
  localDate: string,
  country?: string,
): Promise<ResolvedLiturgicalDay> {
  const { year } = parseLocalDate(localDate);
  const countryCode = normalizeLiturgicalCountry(country);
  const romcal = getRomcal();
  const calendar = await getCalendar(romcal, countryCode, year);
  const observance = selectPrimaryObservance(calendar[localDate]);

  if (!observance) {
    throw new Error(
      `Romcal did not return a liturgical observance for ${localDate}.`,
    );
  }

  return {
    localDate,
    country: countryCode,
    ...summarizeObservance(observance),
    weekdayFallback: observance.weekday
      ? summarizeWeekday(observance.weekday)
      : null,
    source: {
      engine: "romcal",
      engineVersion: Romcal.getVersion(),
      calendar: "United States",
      calendarId: observance.fromCalendarId,
      label: "Romcal Roman Rite calendar · United States",
      urls: {
        engine: ROMCAL_URL,
        calendarBundle: US_CALENDAR_BUNDLE_URL,
        authority: USCCB_CALENDAR_URL,
      },
    },
    settings: {
      epiphanyOnSunday: romcal.config.epiphanyOnSunday,
      corpusChristiOnSunday: romcal.config.corpusChristiOnSunday,
      ascensionOnSunday: romcal.config.ascensionOnSunday,
    },
  };
}

export function parseLocalDate(localDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);

  if (!match) {
    throw new RangeError(
      `Invalid local date "${localDate}". Expected YYYY-MM-DD.`,
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(`${localDate}T00:00:00.000Z`);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== localDate
  ) {
    throw new RangeError(`Invalid local date "${localDate}".`);
  }

  return { year, month, day };
}

export function normalizeLiturgicalCountry(country?: unknown): "US" {
  if (country !== undefined && typeof country !== "string") {
    throw new RangeError(
      `Unsupported liturgical calendar country "${String(country)}". Only the United States calendar is installed.`,
    );
  }

  const normalized = (country ?? "US")
    .trim()
    .replaceAll(/[\s_-]+/g, "")
    .toUpperCase();

  if (
    normalized === "US" ||
    normalized === "USA" ||
    normalized === "UNITEDSTATES" ||
    normalized === "UNITEDSTATESOFAMERICA"
  ) {
    return "US";
  }

  throw new RangeError(
    `Unsupported liturgical calendar country "${country}". Only the United States calendar is installed.`,
  );
}

export function parsePsalterWeek(value: string): PsalterWeek {
  const match = /^WEEK_([1-4])$/.exec(value);

  if (!match) {
    throw new RangeError(`Invalid Romcal psalter week "${value}".`);
  }

  return Number(match[1]) as PsalterWeek;
}

function getRomcal() {
  if (!unitedStatesRomcal) {
    unitedStatesRomcal = new Romcal({
      localizedCalendar: UnitedStates_En,
    });
  }

  return unitedStatesRomcal;
}

function getCalendar(romcal: Romcal, country: "US", year: number) {
  const cacheKey = `${country}:${year}`;
  const cached = calendarCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const pending = romcal.generateCalendar(year).catch((error: unknown) => {
    calendarCache.delete(cacheKey);
    throw error;
  });

  calendarCache.set(cacheKey, pending);
  return pending;
}

function summarizeObservance(
  observance: RomcalLiturgicalDay,
): Omit<
  ResolvedLiturgicalDay,
  "localDate" | "country" | "weekdayFallback" | "source" | "settings"
> {
  const colorId = getObservanceColorId(observance);

  return {
    observanceId: observance.id,
    title: observance.name,
    season: firstLabel(observance.seasonNames, observance.seasons[0]),
    seasonId: observance.seasons[0],
    weekOfSeason: observance.calendar.weekOfSeason,
    psalterWeek: parsePsalterWeek(observance.cycles.psalterWeek),
    rank: sentenceCase(observance.rankName || observance.rank),
    rankId: observance.rank,
    color: sentenceCase(firstLabel(observance.colorNames, colorId)),
    colorId,
    isHolyDayOfObligation: observance.isHolyDayOfObligation,
    isOptional: observance.isOptional,
    cycles: summarizeCycles(observance),
  };
}

function getObservanceColorId(observance: RomcalLiturgicalDay) {
  const colorId = observance.colors[0];

  if (colorId) {
    return colorId;
  }

  if (observance.id === "holy_saturday") {
    return "WHITE";
  }

  throw new Error(`Romcal returned no liturgical color for ${observance.id}.`);
}

function summarizeWeekday(
  weekday: RomcalLiturgicalDay,
): LiturgicalWeekdayFallback {
  const summary = summarizeObservance(weekday);

  return {
    observanceId: summary.observanceId,
    title: summary.title,
    season: summary.season,
    seasonId: summary.seasonId,
    weekOfSeason: summary.weekOfSeason,
    psalterWeek: summary.psalterWeek,
    rank: summary.rank,
    rankId: summary.rankId,
    color: summary.color,
    colorId: summary.colorId,
    cycles: summary.cycles,
  };
}

function summarizeCycles(observance: RomcalLiturgicalDay): LiturgicalCycles {
  return {
    proper: {
      id: observance.cycles.properCycle,
      label: observance.cycles.properCycleName,
    },
    sunday: {
      id: observance.cycles.sundayCycle,
      label: observance.cycles.sundayCycleName,
      year: parseSundayCycle(observance.cycles.sundayCycle),
    },
    weekday: {
      id: observance.cycles.weekdayCycle,
      label: observance.cycles.weekdayCycleName,
      year: parseWeekdayCycle(observance.cycles.weekdayCycle),
    },
    psalter: {
      id: observance.cycles.psalterWeek,
      label: observance.cycles.psalterWeekName,
      week: parsePsalterWeek(observance.cycles.psalterWeek),
    },
  };
}

function parseSundayCycle(value: string): "A" | "B" | "C" | null {
  const match = /^YEAR_([ABC])$/.exec(value);
  return (match?.[1] as "A" | "B" | "C" | undefined) ?? null;
}

function parseWeekdayCycle(value: string): 1 | 2 | null {
  const match = /^YEAR_([12])$/.exec(value);
  return match ? (Number(match[1]) as 1 | 2) : null;
}

function selectPrimaryObservance(observances?: RomcalLiturgicalDay[]) {
  if (!observances?.length) {
    return undefined;
  }

  return (
    observances.find(
      (observance) => observance.id === "thursday_of_the_lords_supper",
    ) ?? observances[0]
  );
}

function firstLabel(labels: string[], fallback?: string) {
  return labels[0] || sentenceCase(fallback);
}

function sentenceCase(value?: string) {
  if (!value) {
    return "None";
  }

  const normalized = value.trim().replaceAll("_", " ").toLowerCase();
  return normalized
    ? `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`
    : value;
}
