import {
  getSolarTimes,
  isValidSolarCoordinates,
  type SolarCalendarDate,
} from "@/lib/solar-times";

export const HOLY_CLOCK_STORAGE_KEY =
  "sanctum-council:holy-clock-preferences:v3";
export const HOLY_CLOCK_LEGACY_STORAGE_KEYS = [
  "sanctum-council:holy-clock-preferences:v2",
  "sanctum-council:holy-clock-preferences:v1",
] as const;
export const HOLY_CLOCK_LEGACY_STORAGE_KEY =
  HOLY_CLOCK_LEGACY_STORAGE_KEYS[0];
export const HOLY_CLOCK_STORAGE_KEYS = [
  HOLY_CLOCK_STORAGE_KEY,
  ...HOLY_CLOCK_LEGACY_STORAGE_KEYS,
] as const;
export const HOLY_CLOCK_PREFERENCES_EVENT =
  "sanctum-council:holy-clock-preferences-changed";
export const HOLY_CLOCK_PREFERENCES_VERSION = 3 as const;
export const DEFAULT_OFFICE_READINGS_LEAD_MINUTES = 45;

export const HOLY_CLOCK_CHIME_IDS = [
  "chime_01",
  "chime_02",
  "chime_03",
  "chime_04",
] as const;

export type HolyClockChimeId = (typeof HOLY_CLOCK_CHIME_IDS)[number];

export type HolyClockChime = {
  id: HolyClockChimeId;
  label: string;
  description: string;
  gain: number;
  src: `/audio/holy-clock/${string}.wav`;
};

export const HOLY_CLOCK_CHIMES: readonly HolyClockChime[] = [
  {
    id: "chime_01",
    label: "Sanctuary Chime",
    description: "Warm · spacious · gentle",
    gain: 1,
    src: "/audio/holy-clock/chime-01.wav",
  },
  {
    id: "chime_02",
    label: "Cloister Bell",
    description: "Rounded · calm · clear",
    gain: 1,
    src: "/audio/holy-clock/chime-02.wav",
  },
  {
    id: "chime_03",
    label: "Jubilee Peal",
    description: "Bright · threefold · ringing",
    gain: 1,
    src: "/audio/holy-clock/chime-03.wav",
  },
  {
    id: "chime_04",
    label: "Great Bell",
    description: "Strong · metallic · commanding",
    gain: 0.5,
    src: "/audio/holy-clock/chime-04.wav",
  },
] as const;

export const HOLY_CLOCK_HOUR_IDS = [
  "office_readings",
  "morning_prayer",
  "midmorning_prayer",
  "midday_prayer",
  "midafternoon_prayer",
  "evening_prayer",
  "night_prayer",
] as const;

export const HOLY_CLOCK_SOLAR_HOUR_IDS = [
  "office_readings",
  "morning_prayer",
  "evening_prayer",
] as const;

export type HolyClockHourId = (typeof HOLY_CLOCK_HOUR_IDS)[number];
export type HolyClockSolarHourId =
  (typeof HOLY_CLOCK_SOLAR_HOUR_IDS)[number];

export type HolyClockHour = {
  id: HolyClockHourId;
  name: string;
  traditionalName: string;
  defaultTime: string;
  canonicalWindow: string;
  anchor: `#office-${HolyClockHourId}`;
};

export const HOLY_CLOCK_HOURS: readonly HolyClockHour[] = [
  {
    id: "office_readings",
    name: "Office of Readings",
    traditionalName: "Officium lectionis",
    defaultTime: "05:30",
    canonicalWindow: "The pre-dawn watch, before first light",
    anchor: "#office-office_readings",
  },
  {
    id: "morning_prayer",
    name: "Morning Prayer",
    traditionalName: "Lauds",
    defaultTime: "06:00",
    canonicalWindow: "At daybreak, when the sun rises",
    anchor: "#office-morning_prayer",
  },
  {
    id: "midmorning_prayer",
    name: "Midmorning Prayer",
    traditionalName: "Terce",
    defaultTime: "09:00",
    canonicalWindow: "Midmorning, the traditional third hour",
    anchor: "#office-midmorning_prayer",
  },
  {
    id: "midday_prayer",
    name: "Midday Prayer",
    traditionalName: "Sext",
    defaultTime: "12:00",
    canonicalWindow: "At midday, the traditional sixth hour",
    anchor: "#office-midday_prayer",
  },
  {
    id: "midafternoon_prayer",
    name: "Midafternoon Prayer",
    traditionalName: "None",
    defaultTime: "15:00",
    canonicalWindow: "Midafternoon, the traditional ninth hour",
    anchor: "#office-midafternoon_prayer",
  },
  {
    id: "evening_prayer",
    name: "Evening Prayer",
    traditionalName: "Vespers",
    defaultTime: "18:00",
    canonicalWindow: "At sunset, as the day closes",
    anchor: "#office-evening_prayer",
  },
  {
    id: "night_prayer",
    name: "Night Prayer",
    traditionalName: "Compline",
    defaultTime: "21:00",
    canonicalWindow: "The last prayer, shortly before retiring",
    anchor: "#office-night_prayer",
  },
] as const;

export type HolyClockTimes = Record<HolyClockHourId, string>;

export type HolyClockSolarSettings = {
  enabled: boolean;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  timeZone: string | null;
  capturedAt: string | null;
  officeReadingsLeadMinutes: number;
};

export type HolyClockPreferences = {
  version: typeof HOLY_CLOCK_PREFERENCES_VERSION;
  remindersEnabled: boolean;
  soundEnabled: boolean;
  chimeId: HolyClockChimeId;
  soundVolume: number;
  times: HolyClockTimes;
  solar: HolyClockSolarSettings;
};

export type HolyClockSolarStatus =
  | "off"
  | "unconfigured"
  | "aligned"
  | "timezone-mismatch"
  | "polar-day"
  | "polar-night";

export type HolyClockEffectiveSchedule = {
  date: SolarCalendarDate;
  times: HolyClockTimes;
  solarAligned: boolean;
  solarStatus: HolyClockSolarStatus;
  sunrise: string | null;
  sunset: string | null;
};

export type HolyClockOccurrence = {
  hour: HolyClockHour;
  time: string;
  dayOffset: -1 | 0 | 1;
  scheduledAt: Date;
};

export type HolyClockState = {
  current: HolyClockOccurrence;
  next: HolyClockOccurrence;
  secondsToNext: number;
  intervalProgress: number;
  dayProgress: number;
  effectiveSchedule: HolyClockEffectiveSchedule;
};

type HolyClockStorageReader = Pick<Storage, "getItem">;

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DATE_PARTS_FORMATTERS = new Map<string, Intl.DateTimeFormat>();
const TIME_PARTS_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

export function getDefaultHolyClockTimes(): HolyClockTimes {
  return {
    office_readings: "05:30",
    morning_prayer: "06:00",
    midmorning_prayer: "09:00",
    midday_prayer: "12:00",
    midafternoon_prayer: "15:00",
    evening_prayer: "18:00",
    night_prayer: "21:00",
  };
}

export function getDefaultHolyClockSolarSettings(): HolyClockSolarSettings {
  return {
    enabled: false,
    latitude: null,
    longitude: null,
    accuracyMeters: null,
    timeZone: null,
    capturedAt: null,
    officeReadingsLeadMinutes: DEFAULT_OFFICE_READINGS_LEAD_MINUTES,
  };
}

export function getDefaultHolyClockPreferences(): HolyClockPreferences {
  return {
    version: HOLY_CLOCK_PREFERENCES_VERSION,
    remindersEnabled: false,
    soundEnabled: true,
    chimeId: "chime_01",
    soundVolume: 0.55,
    times: getDefaultHolyClockTimes(),
    solar: getDefaultHolyClockSolarSettings(),
  };
}

export function readHolyClockPreferences(
  storedValue: string | null,
): HolyClockPreferences {
  if (!storedValue) {
    return getDefaultHolyClockPreferences();
  }

  try {
    const value: unknown = JSON.parse(storedValue);
    if (
      !isRecord(value) ||
      (value.version !== 1 && value.version !== 2 && value.version !== 3)
    ) {
      return getDefaultHolyClockPreferences();
    }

    const defaults = getDefaultHolyClockPreferences();
    const storedTimes = isRecord(value.times) ? value.times : {};
    const times = getDefaultHolyClockTimes();

    for (const hour of HOLY_CLOCK_HOURS) {
      const candidate = storedTimes[hour.id];
      if (typeof candidate === "string" && isHolyClockTime(candidate)) {
        times[hour.id] = candidate;
      }
    }

    return {
      version: HOLY_CLOCK_PREFERENCES_VERSION,
      remindersEnabled: value.remindersEnabled === true,
      soundEnabled:
        value.version >= 2 ? value.soundEnabled !== false : defaults.soundEnabled,
      chimeId: isHolyClockChimeId(value.chimeId)
        ? value.chimeId
        : defaults.chimeId,
      soundVolume: isHolyClockVolume(value.soundVolume)
        ? value.soundVolume
        : defaults.soundVolume,
      times,
      solar:
        value.version === 3
          ? readSolarSettings(value.solar)
          : getDefaultHolyClockSolarSettings(),
    };
  } catch {
    return getDefaultHolyClockPreferences();
  }
}

export function readHolyClockPreferencesFromStorage(
  storage: HolyClockStorageReader,
): HolyClockPreferences {
  for (const key of HOLY_CLOCK_STORAGE_KEYS) {
    const storedValue = storage.getItem(key);
    if (storedValue !== null) {
      return readHolyClockPreferences(storedValue);
    }
  }

  return getDefaultHolyClockPreferences();
}

export function isHolyClockStorageKey(key: string | null): boolean {
  return key !== null && HOLY_CLOCK_STORAGE_KEYS.some((candidate) => candidate === key);
}

export function getHolyClockChime(
  chimeId: HolyClockChimeId,
): HolyClockChime {
  return (
    HOLY_CLOCK_CHIMES.find((chime) => chime.id === chimeId) ??
    HOLY_CLOCK_CHIMES[0]
  );
}

export function isHolyClockTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function isHolyClockSolarHour(
  hourId: HolyClockHourId,
): hourId is HolyClockSolarHourId {
  return HOLY_CLOCK_SOLAR_HOUR_IDS.some((candidate) => candidate === hourId);
}

export function getEffectiveHolyClockSchedule(
  date: Date | SolarCalendarDate,
  preferences: HolyClockPreferences,
  timeZone = getRuntimeTimeZone(),
): HolyClockEffectiveSchedule {
  const targetDate =
    date instanceof Date ? getCalendarDateInTimeZone(date, timeZone) : date;
  const fallback = (): HolyClockEffectiveSchedule => ({
    date: targetDate,
    times: { ...preferences.times },
    solarAligned: false,
    solarStatus: getFallbackSolarStatus(preferences, timeZone),
    sunrise: null,
    sunset: null,
  });

  if (!preferences.solar.enabled) {
    return fallback();
  }
  if (
    !isValidSolarCoordinates(
      preferences.solar.latitude,
      preferences.solar.longitude,
    ) ||
    !preferences.solar.timeZone
  ) {
    return fallback();
  }
  if (preferences.solar.timeZone !== timeZone) {
    return fallback();
  }

  const solarTimes = getSolarTimes(
    targetDate,
    preferences.solar.latitude as number,
    preferences.solar.longitude as number,
  );
  if (solarTimes.status !== "normal") {
    return {
      ...fallback(),
      solarStatus: solarTimes.status,
    };
  }

  const sunrise = formatDateAsTime(solarTimes.sunrise, timeZone);
  const sunset = formatDateAsTime(solarTimes.sunset, timeZone);
  const officeReadings = formatDateAsTime(
    new Date(
      solarTimes.sunrise.getTime() -
        preferences.solar.officeReadingsLeadMinutes * 60_000,
    ),
    timeZone,
  );

  return {
    date: targetDate,
    times: {
      ...preferences.times,
      office_readings: officeReadings,
      morning_prayer: sunrise,
      evening_prayer: sunset,
    },
    solarAligned: true,
    solarStatus: "aligned",
    sunrise,
    sunset,
  };
}

export function getHolyClockState(
  now: Date,
  preferences: HolyClockPreferences,
  timeZone = getRuntimeTimeZone(),
): HolyClockState {
  const today = getCalendarDateInTimeZone(now, timeZone);
  const offsets = [-1, 0, 1] as const;
  const occurrences = offsets.flatMap((dayOffset) => {
    const date = addCalendarDays(today, dayOffset);
    const schedule = getEffectiveHolyClockSchedule(
      date,
      preferences,
      timeZone,
    );

    return HOLY_CLOCK_HOURS.map((hour, canonicalIndex) => ({
      hour,
      time: schedule.times[hour.id],
      dayOffset,
      scheduledAt: zonedDateTimeToDate(
        date,
        schedule.times[hour.id],
        timeZone,
      ),
      canonicalIndex,
    }));
  }).sort(
    (left, right) =>
      left.scheduledAt.getTime() - right.scheduledAt.getTime() ||
      left.canonicalIndex - right.canonicalIndex,
  );
  const nowTime = now.getTime();
  let currentIndex = -1;

  for (let index = occurrences.length - 1; index >= 0; index -= 1) {
    if (occurrences[index].scheduledAt.getTime() <= nowTime) {
      currentIndex = index;
      break;
    }
  }

  const safeCurrentIndex = Math.max(0, currentIndex);
  const current = occurrences[safeCurrentIndex];
  const next = occurrences[Math.min(occurrences.length - 1, safeCurrentIndex + 1)];
  const intervalMilliseconds = Math.max(
    1,
    next.scheduledAt.getTime() - current.scheduledAt.getTime(),
  );
  const elapsedMilliseconds = Math.max(
    0,
    nowTime - current.scheduledAt.getTime(),
  );
  const zonedNow = getZonedDateTimeParts(now, timeZone);
  const daySeconds =
    zonedNow.hour * 3_600 + zonedNow.minute * 60 + zonedNow.second;

  return {
    current: toPublicOccurrence(current),
    next: toPublicOccurrence(next),
    secondsToNext: Math.max(
      0,
      Math.ceil((next.scheduledAt.getTime() - nowTime) / 1_000),
    ),
    intervalProgress: Math.min(
      1,
      elapsedMilliseconds / intervalMilliseconds,
    ),
    dayProgress: daySeconds / 86_400,
    effectiveSchedule: getEffectiveHolyClockSchedule(
      today,
      preferences,
      timeZone,
    ),
  };
}

export function formatHolyClockCountdown(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3_600);
  const minutes = Math.floor((safeSeconds % 3_600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function getDueHolyClockHours(
  now: Date,
  preferences: HolyClockPreferences,
  timeZone = getRuntimeTimeZone(),
): HolyClockHour[] {
  const schedule = getEffectiveHolyClockSchedule(now, preferences, timeZone);
  const localTime = formatDateAsTime(now, timeZone);

  return HOLY_CLOCK_HOURS.filter(
    (hour) => schedule.times[hour.id] === localTime,
  );
}

export function getCalendarDateInTimeZone(
  date: Date,
  timeZone = getRuntimeTimeZone(),
): SolarCalendarDate {
  const parts = getDatePartsFormatter(timeZone).formatToParts(date);
  return {
    year: getNumericPart(parts, "year"),
    month: getNumericPart(parts, "month"),
    day: getNumericPart(parts, "day"),
  };
}

export function addCalendarDays(
  date: SolarCalendarDate,
  days: number,
): SolarCalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function readSolarSettings(value: unknown): HolyClockSolarSettings {
  const defaults = getDefaultHolyClockSolarSettings();
  if (!isRecord(value)) {
    return defaults;
  }

  const latitude = isFiniteNumber(value.latitude) ? value.latitude : null;
  const longitude = isFiniteNumber(value.longitude) ? value.longitude : null;
  const coordinatesAreValid = isValidSolarCoordinates(latitude, longitude);
  const timeZone = isValidTimeZone(value.timeZone) ? value.timeZone : null;

  return {
    enabled: value.enabled === true && coordinatesAreValid && timeZone !== null,
    latitude: coordinatesAreValid ? latitude : null,
    longitude: coordinatesAreValid ? longitude : null,
    accuracyMeters:
      isFiniteNumber(value.accuracyMeters) && value.accuracyMeters >= 0
        ? value.accuracyMeters
        : null,
    timeZone,
    capturedAt:
      typeof value.capturedAt === "string" && value.capturedAt.length > 0
        ? value.capturedAt
        : null,
    officeReadingsLeadMinutes: isValidLeadMinutes(
      value.officeReadingsLeadMinutes,
    )
      ? value.officeReadingsLeadMinutes
      : defaults.officeReadingsLeadMinutes,
  };
}

function getFallbackSolarStatus(
  preferences: HolyClockPreferences,
  timeZone: string,
): HolyClockSolarStatus {
  if (!preferences.solar.enabled) {
    return "off";
  }
  if (
    !isValidSolarCoordinates(
      preferences.solar.latitude,
      preferences.solar.longitude,
    ) ||
    !preferences.solar.timeZone
  ) {
    return "unconfigured";
  }
  if (preferences.solar.timeZone !== timeZone) {
    return "timezone-mismatch";
  }
  return "unconfigured";
}

function zonedDateTimeToDate(
  date: SolarCalendarDate,
  time: string,
  timeZone: string,
): Date {
  const [hour, minute] = time.split(":").map(Number);
  const desiredWallTime = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    hour,
    minute,
  );
  let instant = desiredWallTime;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = getZonedDateTimeParts(new Date(instant), timeZone);
    const actualWallTime = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const adjustment = desiredWallTime - actualWallTime;
    instant += adjustment;
    if (adjustment === 0) {
      break;
    }
  }

  return new Date(instant);
}

function getZonedDateTimeParts(date: Date, timeZone: string) {
  const parts = getTimePartsFormatter(timeZone).formatToParts(date);
  return {
    year: getNumericPart(parts, "year"),
    month: getNumericPart(parts, "month"),
    day: getNumericPart(parts, "day"),
    hour: getNumericPart(parts, "hour"),
    minute: getNumericPart(parts, "minute"),
    second: getNumericPart(parts, "second"),
  };
}

function formatDateAsTime(date: Date, timeZone: string): string {
  const parts = getZonedDateTimeParts(date, timeZone);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function getDatePartsFormatter(timeZone: string) {
  let formatter = DATE_PARTS_FORMATTERS.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    DATE_PARTS_FORMATTERS.set(timeZone, formatter);
  }
  return formatter;
}

function getTimePartsFormatter(timeZone: string) {
  let formatter = TIME_PARTS_FORMATTERS.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    TIME_PARTS_FORMATTERS.set(timeZone, formatter);
  }
  return formatter;
}

function getNumericPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) {
  const value = parts.find((part) => part.type === type)?.value;
  return Number(value);
}

function toPublicOccurrence(occurrence: {
  hour: HolyClockHour;
  time: string;
  dayOffset: -1 | 0 | 1;
  scheduledAt: Date;
}): HolyClockOccurrence {
  return {
    hour: occurrence.hour,
    time: occurrence.time,
    dayOffset: occurrence.dayOffset,
    scheduledAt: occurrence.scheduledAt,
  };
}

function getRuntimeTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHolyClockChimeId(value: unknown): value is HolyClockChimeId {
  return (
    typeof value === "string" &&
    HOLY_CLOCK_CHIME_IDS.some((chimeId) => chimeId === value)
  );
}

function isHolyClockVolume(value: unknown): value is number {
  return typeof value === "number" && value >= 0.1 && value <= 1;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidLeadMinutes(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 15 && Number(value) <= 120;
}

function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
