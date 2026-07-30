export const HOLY_CLOCK_STORAGE_KEY =
  "sanctum-council:holy-clock-preferences:v1";
export const HOLY_CLOCK_PREFERENCES_VERSION = 1 as const;

export const HOLY_CLOCK_HOUR_IDS = [
  "office_readings",
  "morning_prayer",
  "midmorning_prayer",
  "midday_prayer",
  "midafternoon_prayer",
  "evening_prayer",
  "night_prayer",
] as const;

export type HolyClockHourId = (typeof HOLY_CLOCK_HOUR_IDS)[number];

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
    canonicalWindow: "At any hour; here kept as the pre-dawn watch",
    anchor: "#office-office_readings",
  },
  {
    id: "morning_prayer",
    name: "Morning Prayer",
    traditionalName: "Lauds",
    defaultTime: "06:00",
    canonicalWindow: "In the morning, near daybreak",
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
    canonicalWindow: "In the evening, as the day closes",
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

export type HolyClockPreferences = {
  version: typeof HOLY_CLOCK_PREFERENCES_VERSION;
  remindersEnabled: boolean;
  times: HolyClockTimes;
};

export type HolyClockOccurrence = {
  hour: HolyClockHour;
  time: string;
  dayOffset: -1 | 0 | 1;
};

export type HolyClockState = {
  current: HolyClockOccurrence;
  next: HolyClockOccurrence;
  secondsToNext: number;
  intervalProgress: number;
  dayProgress: number;
};

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

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

export function getDefaultHolyClockPreferences(): HolyClockPreferences {
  return {
    version: HOLY_CLOCK_PREFERENCES_VERSION,
    remindersEnabled: false,
    times: getDefaultHolyClockTimes(),
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
    if (!isRecord(value) || value.version !== HOLY_CLOCK_PREFERENCES_VERSION) {
      return getDefaultHolyClockPreferences();
    }

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
      times,
    };
  } catch {
    return getDefaultHolyClockPreferences();
  }
}

export function isHolyClockTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function getHolyClockState(
  now: Date,
  times: HolyClockTimes,
): HolyClockState {
  const scheduled = HOLY_CLOCK_HOURS.map((hour, canonicalIndex) => ({
    hour,
    time: times[hour.id],
    minutes: timeToMinutes(times[hour.id]),
    canonicalIndex,
  })).sort(
    (left, right) =>
      left.minutes - right.minutes ||
      left.canonicalIndex - right.canonicalIndex,
  );

  const nowSeconds =
    now.getHours() * 3_600 + now.getMinutes() * 60 + now.getSeconds();
  const currentIndex = findCurrentIndex(scheduled, nowSeconds);
  const currentSchedule =
    currentIndex === -1 ? scheduled[scheduled.length - 1] : scheduled[currentIndex];
  const nextIndex =
    currentIndex === -1
      ? 0
      : currentIndex === scheduled.length - 1
        ? 0
        : currentIndex + 1;
  const nextSchedule = scheduled[nextIndex];
  const currentDayOffset = currentIndex === -1 ? -1 : 0;
  const nextDayOffset =
    currentIndex === scheduled.length - 1 ? 1 : 0;
  const currentStartSeconds =
    currentSchedule.minutes * 60 + currentDayOffset * 86_400;
  const nextStartSeconds =
    nextSchedule.minutes * 60 + nextDayOffset * 86_400;
  const intervalSeconds = Math.max(1, nextStartSeconds - currentStartSeconds);
  const elapsedSeconds = Math.max(0, nowSeconds - currentStartSeconds);

  return {
    current: {
      hour: currentSchedule.hour,
      time: currentSchedule.time,
      dayOffset: currentDayOffset,
    },
    next: {
      hour: nextSchedule.hour,
      time: nextSchedule.time,
      dayOffset: nextDayOffset,
    },
    secondsToNext: Math.max(0, nextStartSeconds - nowSeconds),
    intervalProgress: Math.min(1, elapsedSeconds / intervalSeconds),
    dayProgress: nowSeconds / 86_400,
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

export function getDueHolyClockHour(
  now: Date,
  times: HolyClockTimes,
): HolyClockHour | null {
  const localTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;

  return HOLY_CLOCK_HOURS.find((hour) => times[hour.id] === localTime) ?? null;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function findCurrentIndex(
  scheduled: Array<{ minutes: number }>,
  nowSeconds: number,
): number {
  for (let index = scheduled.length - 1; index >= 0; index -= 1) {
    if (scheduled[index].minutes * 60 <= nowSeconds) {
      return index;
    }
  }

  return -1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
