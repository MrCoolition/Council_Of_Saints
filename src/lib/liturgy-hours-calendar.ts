import {
  HOLY_CLOCK_HOURS,
  HOLY_CLOCK_SOLAR_HOUR_IDS,
  getEffectiveHolyClockSchedule,
  type HolyClockHour,
  type HolyClockHourId,
  type HolyClockPreferences,
} from "@/lib/liturgy-hours-clock";

const DEFAULT_CALENDAR_DAYS = 366;
const MAX_CALENDAR_DAYS = 3_660;
const CALENDAR_UID_DOMAIN = "sanctum-council";
const UTF8_ENCODER = new TextEncoder();

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

type CalendarDaySchedule = {
  compactDate: string;
  times: HolyClockPreferences["times"];
  solarAligned: boolean;
};

const SOLAR_HOUR_IDS = new Set<HolyClockHourId>(
  HOLY_CLOCK_SOLAR_HOUR_IDS,
);

/**
 * Creates a device-calendar alarm file for the canonical Hours.
 *
 * Solar-aligned Hours are emitted as dated events because their wall-clock
 * times change each day. The remaining Hours use daily recurrences. When no
 * day in the requested range can use the solar schedule, all seven Hours use
 * the saved recurring times instead.
 */
export function createHolyClockCalendar(
  date: Date,
  preferences: HolyClockPreferences,
  timeZone: string,
  origin: string,
  days = DEFAULT_CALENDAR_DAYS,
): string {
  assertCalendarArguments(date, timeZone, days);

  const dayCount = Math.trunc(days);
  const firstCalendarDate = getCalendarDateInTimeZone(date, timeZone);
  const schedules = Array.from({ length: dayCount }, (_, dayOffset) => {
    const calendarDate = addCalendarDays(firstCalendarDate, dayOffset);
    const schedule = getEffectiveHolyClockSchedule(
      calendarDate,
      preferences,
      timeZone,
    );

    return {
      compactDate: formatCompactCalendarDate(calendarDate),
      times: schedule.times,
      solarAligned: schedule.solarAligned,
    } satisfies CalendarDaySchedule;
  });
  const firstSchedule = schedules[0];
  const hasUsableSolarSchedule = schedules.some(
    (schedule) => schedule.solarAligned,
  );
  const generatedAt = formatUtcCalendarTimestamp(date);
  const normalizedOrigin = origin.replace(/\/+$/, "");
  const recurringHours = hasUsableSolarSchedule
    ? HOLY_CLOCK_HOURS.filter((hour) => !SOLAR_HOUR_IDS.has(hour.id))
    : HOLY_CLOCK_HOURS;
  const recurringEvents = recurringHours.flatMap((hour) =>
    createCalendarEvent({
      calendarDate: firstSchedule.compactDate,
      generatedAt,
      hour,
      origin: normalizedOrigin,
      recurring: true,
      time: firstSchedule.times[hour.id],
      timeZone,
      uidSuffix: "daily",
    }),
  );
  const solarEvents = hasUsableSolarSchedule
    ? schedules.flatMap((schedule) =>
        HOLY_CLOCK_HOURS.filter((hour) => SOLAR_HOUR_IDS.has(hour.id)).flatMap(
          (hour) =>
            createCalendarEvent({
              calendarDate: schedule.compactDate,
              generatedAt,
              hour,
              origin: normalizedOrigin,
              recurring: false,
              time: schedule.times[hour.id],
              timeZone,
              uidSuffix: schedule.compactDate,
            }),
        ),
      )
    : [];

  return serializeCalendar([
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "PRODID:-//Sanctum Council//Holy Clock//EN",
    `X-WR-CALNAME:${escapeCalendarText("Sanctum Council · Holy Clock")}`,
    `X-WR-TIMEZONE:${escapeCalendarText(timeZone)}`,
    ...recurringEvents,
    ...solarEvents,
    "END:VCALENDAR",
    "",
  ]);
}

function createCalendarEvent({
  calendarDate,
  generatedAt,
  hour,
  origin,
  recurring,
  time,
  timeZone,
  uidSuffix,
}: {
  calendarDate: string;
  generatedAt: string;
  hour: HolyClockHour;
  origin: string;
  recurring: boolean;
  time: string;
  timeZone: string;
  uidSuffix: string;
}) {
  const start = `${calendarDate}T${time.replace(":", "")}00`;
  const summary = escapeCalendarText(
    `${hour.traditionalName} · ${hour.name}`,
  );
  const description = escapeCalendarText(
    `Open Sanctum Council and pray ${hour.name}.`,
  );
  const url = `${origin}/${hour.anchor}`;

  return [
    "BEGIN:VEVENT",
    `UID:sanctum-council-${hour.id}-${uidSuffix}@${CALENDAR_UID_DOMAIN}`,
    `DTSTAMP:${generatedAt}`,
    `DTSTART;TZID=${timeZone}:${start}`,
    "DURATION:PT15M",
    ...(recurring ? ["RRULE:FREQ=DAILY"] : []),
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `URL:${url}`,
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${summary}`,
    "END:VALARM",
    "END:VEVENT",
  ];
}

function assertCalendarArguments(date: Date, timeZone: string, days: number) {
  if (!Number.isFinite(date.getTime())) {
    throw new RangeError("A valid calendar start date is required.");
  }
  if (!Number.isInteger(days) || days < 1 || days > MAX_CALENDAR_DAYS) {
    throw new RangeError(
      `Calendar days must be an integer between 1 and ${MAX_CALENDAR_DAYS}.`,
    );
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(date);
  } catch {
    throw new RangeError("A valid IANA calendar time zone is required.");
  }
}

function getCalendarDateInTimeZone(date: Date, timeZone: string): CalendarDate {
  const parts = getDateTimeParts(date, timeZone);

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
}

function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const nextDate = new Date(
    Date.UTC(date.year, date.month - 1, date.day + days, 12),
  );

  return {
    year: nextDate.getUTCFullYear(),
    month: nextDate.getUTCMonth() + 1,
    day: nextDate.getUTCDate(),
  };
}

function getDateTimeParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = new Map(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.get("year") ?? 0,
    month: values.get("month") ?? 0,
    day: values.get("day") ?? 0,
    hour: values.get("hour") ?? 0,
    minute: values.get("minute") ?? 0,
    second: values.get("second") ?? 0,
  };
}

function formatCompactCalendarDate(date: CalendarDate) {
  return [
    String(date.year).padStart(4, "0"),
    String(date.month).padStart(2, "0"),
    String(date.day).padStart(2, "0"),
  ].join("");
}

function formatUtcCalendarTimestamp(date: Date) {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replaceAll(/[-:]/g, "");
}

function serializeCalendar(lines: string[]) {
  return lines.flatMap(foldCalendarLine).join("\r\n");
}

function foldCalendarLine(line: string) {
  if (line === "") {
    return [line];
  }

  const segments: string[] = [];
  let segment = "";
  let segmentBytes = 0;
  let byteLimit = 75;

  for (const character of line) {
    const characterBytes = UTF8_ENCODER.encode(character).length;

    if (segment && segmentBytes + characterBytes > byteLimit) {
      segments.push(segments.length === 0 ? segment : ` ${segment}`);
      segment = character;
      segmentBytes = characterBytes;
      byteLimit = 74;
      continue;
    }

    segment += character;
    segmentBytes += characterBytes;
  }

  if (segment || segments.length === 0) {
    segments.push(segments.length === 0 ? segment : ` ${segment}`);
  }

  return segments;
}

export function escapeCalendarText(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll(/\r\n|\r|\n/g, "\\n");
}
