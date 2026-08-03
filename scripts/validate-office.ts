import { readFile } from "node:fs/promises";
import path from "node:path";
import { getLiturgicalDay } from "../src/lib/liturgical-calendar";
import { createHolyClockCalendar } from "../src/lib/liturgy-hours-calendar";
import {
  getDueHolyClockHours,
  getDefaultHolyClockPreferences,
  getEffectiveHolyClockSchedule,
  getHolyClockState,
  HOLY_CLOCK_CHIMES,
  HOLY_CLOCK_HOURS,
  readHolyClockPreferences,
} from "../src/lib/liturgy-hours-clock";
import { getSolarTimes } from "../src/lib/solar-times";
import { getOfficeDevotionalTexts } from "../src/lib/office-devotional-texts";
import {
  getDailyOfficeGuides,
  OFFICE_HOUR_TYPES,
} from "../src/lib/office-psalter";
import { getScriptureBook } from "../src/lib/scripture";

const weekdayDates = [
  "2026-07-05",
  "2026-07-06",
  "2026-07-07",
  "2026-07-08",
  "2026-07-09",
  "2026-07-10",
  "2026-07-11",
];

async function main() {
  let anchorCount = 0;
  let segmentCount = 0;

  validateHolyClock();
  await validatePrayerChimes();
  await validateCalendarAlarms();

  for (let psalterWeek = 1; psalterWeek <= 4; psalterWeek += 1) {
    for (const localDate of weekdayDates) {
      const guides = getDailyOfficeGuides(localDate, psalterWeek, {
        season: "Ordinary Time",
      });

      assert(
        guides.length === OFFICE_HOUR_TYPES.length,
        `${localDate} must expose all seven prayer stops`,
      );
      assert(
        guides.every(
          (guide, index) => guide.hourType === OFFICE_HOUR_TYPES[index],
        ),
        `${localDate} prayer stops must remain in canonical order`,
      );

      for (const guide of guides) {
        const devotional = getOfficeDevotionalTexts(guide.hourType);
        assert(
          devotional.hymn.stanzas.length > 0,
          `${guide.hourType} requires a built-in hymn`,
        );
        assert(
          devotional.hymn.provenance.status === "public_domain",
          `${guide.hourType} hymn must carry public-domain provenance`,
        );
        assert(
          devotional.intercessions.provenance.officialStatus ===
            "not_official_icel",
          `${guide.hourType} devotional petitions must not be presented as ICEL text`,
        );
        assert(
          guide.scriptureAnchors.length >= 3,
          `${guide.hourType} cannot omit its psalmody on ${localDate}`,
        );

        for (const anchor of guide.scriptureAnchors) {
          anchorCount += 1;

          for (const scripturePassage of anchor.passages) {
            segmentCount += 1;
            await validatePassage(scripturePassage);
          }
        }
      }
    }
  }

  const july29 = await getLiturgicalDay("2026-07-29", "US");
  assert(
    july29.title === "Saints Martha, Mary and Lazarus",
    "July 29, 2026 must resolve to Saints Martha, Mary and Lazarus",
  );
  assert(
    july29.rankId === "MEMORIAL" &&
      july29.colorId === "WHITE" &&
      july29.weekOfSeason === 17 &&
      july29.psalterWeek === 1,
    "July 29, 2026 calendar rank, color, week, and Psalter must match the U.S. calendar",
  );

  const july29Guides = getDailyOfficeGuides(
    "2026-07-29",
    july29.psalterWeek,
    july29,
  );
  const readings = requireHour(july29Guides, "office_readings");
  const morning = requireHour(july29Guides, "morning_prayer");
  const terce = requireHour(july29Guides, "midmorning_prayer");
  const sext = requireHour(july29Guides, "midday_prayer");
  const none = requireHour(july29Guides, "midafternoon_prayer");
  const evening = requireHour(july29Guides, "evening_prayer");
  const night = requireHour(july29Guides, "night_prayer");

  assertCitations(readings, [
    "Psalm 18:2–7 · Douay Psalm 17",
    "Psalm 18:8–20 · Douay Psalm 17",
    "Psalm 18:21–30 · Douay Psalm 17",
    "2 Corinthians 10:1–11:6",
  ]);
  assertCitations(morning, [
    "Psalm 36 · Douay Psalm 35",
    "Canticle of Judith · Judith 16:2–3a, 13–15 · Douay 16:2–4, 15–19",
    "Psalm 47 · Douay Psalm 46",
    "Romans 12:1–2",
    "Luke 1:68–79",
  ]);
  assertCitations(terce, [
    "Psalm 120 · Douay Psalm 119",
    "Psalm 121 · Douay Psalm 120",
    "Psalm 122 · Douay Psalm 121",
    "1 Peter 1:13–14",
  ]);
  assertCitations(
    {
      ...terce,
      scriptureAnchors:
        terce.alternatePsalmody?.scriptureAnchors ?? [],
    },
    [
      "Psalm 119:9–16 · Douay Psalm 118",
      "Psalm 17:1–9a · Douay Psalm 16",
      "Psalm 17:9b–15 · Douay Psalm 16",
    ],
  );
  assertCitations(sext, [
    "Psalm 119:9–16 · Douay Psalm 118",
    "Psalm 17:1–9a · Douay Psalm 16",
    "Psalm 17:9b–15 · Douay Psalm 16",
    "1 Peter 1:15–16",
  ]);
  assertCitations(none, [
    "Psalm 126 · Douay Psalm 125",
    "Psalm 127 · Douay Psalm 126",
    "Psalm 128 · Douay Psalm 127",
    "James 4:7–8a, 10",
  ]);
  assertCitations(
    {
      ...none,
      scriptureAnchors:
        none.alternatePsalmody?.scriptureAnchors ?? [],
    },
    [
      "Psalm 119:9–16 · Douay Psalm 118",
      "Psalm 17:1–9a · Douay Psalm 16",
      "Psalm 17:9b–15 · Douay Psalm 16",
    ],
  );
  assertCitations(evening, [
    "Psalm 27:1–6 · Douay Psalm 26",
    "Psalm 27:7–14 · Douay Psalm 26",
    "Canticle of Christ · Colossians 1:12–20",
    "Romans 8:28–30",
    "Luke 1:46–55",
  ]);
  assertCitations(night, [
    "Psalm 31:2–6 · Douay Psalm 30",
    "Psalm 130 · Douay Psalm 129",
    "Ephesians 4:26–27",
    "Luke 2:29–32",
  ]);
  assert(
    readings.properNotice?.href.includes("usccb.org") &&
      morning.properNotice?.href.includes("usccb.org") &&
      evening.properNotice?.href.includes("usccb.org"),
    "The memorial proper must be linked at Office of Readings, Morning, and Evening Prayer",
  );
  assert(
    sext.scriptureAnchors
      .filter((anchor) => anchor.citation.startsWith("Psalm 17:"))
      .every((anchor) => anchor.verseTextOverrides?.length === 1),
    "Sext must render each half of Douay Psalm 16:9 only in its assigned section",
  );
  assert(
    none.scriptureAnchors.find(
      (anchor) => anchor.citation === "James 4:7–8a, 10",
    )?.verseTextOverrides?.some(
      (override) =>
        override.verseNumber === 8 &&
        !override.text.includes("Cleanse your hands"),
    ),
    "None must stop James 4:8 at the first Douay sentence",
  );

  console.log(
    `Validated the seven-hour Holy Clock, four prayer chimes, device alarms, 4 weeks × 7 days × 7 prayer stops, and the July 29, 2026 U.S. golden fixture (${anchorCount} anchors, ${segmentCount} local Scripture segments).`,
  );
}

function validateHolyClock() {
  const expected = [
    ["office_readings", "05:30", "#office-office_readings"],
    ["morning_prayer", "06:00", "#office-morning_prayer"],
    ["midmorning_prayer", "09:00", "#office-midmorning_prayer"],
    ["midday_prayer", "12:00", "#office-midday_prayer"],
    ["midafternoon_prayer", "15:00", "#office-midafternoon_prayer"],
    ["evening_prayer", "18:00", "#office-evening_prayer"],
    ["night_prayer", "21:00", "#office-night_prayer"],
  ] as const;

  assert(
    HOLY_CLOCK_HOURS.length === expected.length,
    "The Holy Clock must expose all seven Hours",
  );

  for (const [index, [id, defaultTime, anchor]] of expected.entries()) {
    const hour = HOLY_CLOCK_HOURS[index];
    assert(
      hour.id === id &&
        hour.defaultTime === defaultTime &&
        hour.anchor === anchor,
      `Holy Clock stop ${index + 1} must remain ${id} at ${defaultTime}`,
    );
  }

  const defaults = getDefaultHolyClockPreferences();
  assert(
    defaults.soundEnabled &&
      defaults.chimeId === HOLY_CLOCK_CHIMES[0].id &&
      defaults.soundVolume === 0.55,
    "The Holy Clock must begin with the gentle Sanctuary Chime at 55% volume",
  );

  const migrated = readHolyClockPreferences(
    JSON.stringify({
      version: 1,
      remindersEnabled: true,
      times: { ...defaults.times, morning_prayer: "07:15" },
    }),
  );
  assert(
    migrated.version === 3 &&
      migrated.remindersEnabled &&
      migrated.times.morning_prayer === "07:15" &&
      migrated.chimeId === defaults.chimeId &&
      !migrated.solar.enabled &&
      migrated.solar.officeReadingsLeadMinutes === 45,
    "Version-one Holy Clock settings must migrate without losing reminders or custom times",
  );

  const migratedV2 = readHolyClockPreferences(
    JSON.stringify({
      version: 2,
      remindersEnabled: false,
      soundEnabled: false,
      chimeId: "chime_04",
      soundVolume: 0.4,
      times: { ...defaults.times, evening_prayer: "19:10" },
    }),
  );
  assert(
    migratedV2.version === 3 &&
      !migratedV2.soundEnabled &&
      migratedV2.chimeId === "chime_04" &&
      migratedV2.times.evening_prayer === "19:10" &&
      !migratedV2.solar.enabled,
    "Version-two Holy Clock settings must migrate with fixed times intact",
  );

  const buffaloPreferences = getBuffaloSolarPreferences();
  const buffaloSchedule = getEffectiveHolyClockSchedule(
    { year: 2026, month: 8, day: 3 },
    buffaloPreferences,
    "America/New_York",
  );
  assert(
    buffaloSchedule.solarAligned &&
      buffaloSchedule.sunrise === "06:09" &&
      buffaloSchedule.sunset === "20:34" &&
      buffaloSchedule.times.office_readings === "05:24" &&
      buffaloSchedule.times.morning_prayer === "06:09" &&
      buffaloSchedule.times.evening_prayer === "20:34",
    "Buffalo on August 3, 2026 must ring Office 45 minutes before the 06:09 sunrise and Vespers at the 20:34 sunset",
  );

  const travelSchedule = getEffectiveHolyClockSchedule(
    { year: 2026, month: 8, day: 3 },
    buffaloPreferences,
    "Europe/Rome",
  );
  assert(
    !travelSchedule.solarAligned &&
      travelSchedule.solarStatus === "timezone-mismatch" &&
      travelSchedule.times.office_readings ===
        buffaloPreferences.times.office_readings,
    "Travel across time zones must retain safe fixed alarms until location is refreshed",
  );

  const polarPreferences = getDefaultHolyClockPreferences();
  polarPreferences.solar = {
    enabled: true,
    latitude: 68.36,
    longitude: 23.43,
    accuracyMeters: null,
    timeZone: "Europe/Helsinki",
    capturedAt: "2026-06-21T12:00:00.000Z",
    officeReadingsLeadMinutes: 45,
  };
  const polarSchedule = getEffectiveHolyClockSchedule(
    { year: 2026, month: 6, day: 21 },
    polarPreferences,
    "Europe/Helsinki",
  );
  assert(
    !polarSchedule.solarAligned &&
      polarSchedule.solarStatus === "polar-day" &&
      polarSchedule.times.morning_prayer ===
        polarPreferences.times.morning_prayer,
    "Midnight sun must preserve the saved fixed prayer schedule",
  );

  const postSunriseState = getHolyClockState(
    new Date("2026-08-03T10:10:00Z"),
    buffaloPreferences,
    "America/New_York",
  );
  assert(
    postSunriseState.current.hour.id === "morning_prayer" &&
      postSunriseState.next.hour.id === "midmorning_prayer",
    "The solar Holy Clock must advance from Lauds to Terce after sunrise",
  );

  const lateState = getHolyClockState(
    new Date("2026-08-04T03:00:00Z"),
    buffaloPreferences,
    "America/New_York",
  );
  const tomorrowSchedule = getEffectiveHolyClockSchedule(
    { year: 2026, month: 8, day: 4 },
    buffaloPreferences,
    "America/New_York",
  );
  assert(
    lateState.next.hour.id === "office_readings" &&
      lateState.next.time === tomorrowSchedule.times.office_readings &&
      lateState.next.dayOffset === 1,
    "The next pre-dawn bell must use tomorrow's changing sunrise",
  );

  const collisionPreferences = getDefaultHolyClockPreferences();
  collisionPreferences.times.office_readings = "06:00";
  collisionPreferences.times.morning_prayer = "06:00";
  assert(
    getDueHolyClockHours(
      new Date("2026-08-03T10:00:15Z"),
      collisionPreferences,
      "America/New_York",
    ).length === 2,
    "Two Hours assigned to the same minute must both ring",
  );

  validateSolarFixtures();
}

function getBuffaloSolarPreferences() {
  const preferences = getDefaultHolyClockPreferences();
  preferences.solar = {
    enabled: true,
    latitude: 42.886404,
    longitude: -78.878102,
    accuracyMeters: 50,
    timeZone: "America/New_York",
    capturedAt: "2026-08-03T12:00:00.000Z",
    officeReadingsLeadMinutes: 45,
  };
  return preferences;
}

function validateSolarFixtures() {
  const fixtures = [
    {
      date: { year: 2026, month: 8, day: 2 },
      latitude: 40.65,
      longitude: -73.7833,
      timeZone: "America/New_York",
      sunrise: "05:53",
      sunset: "20:09",
    },
    {
      date: { year: 2026, month: 6, day: 21 },
      latitude: 40.67999,
      longitude: 14.76998,
      timeZone: "Europe/Rome",
      sunrise: "05:30",
      sunset: "20:35",
    },
    {
      date: { year: 2026, month: 6, day: 21 },
      latitude: 59.33,
      longitude: 18.06,
      timeZone: "Europe/Stockholm",
      sunrise: "03:31",
      sunset: "22:08",
    },
  ] as const;

  for (const fixture of fixtures) {
    const solarTimes = getSolarTimes(
      fixture.date,
      fixture.latitude,
      fixture.longitude,
    );
    assert(
      solarTimes.status === "normal" &&
        formatFixtureTime(solarTimes.sunrise, fixture.timeZone) ===
          fixture.sunrise &&
        formatFixtureTime(solarTimes.sunset, fixture.timeZone) === fixture.sunset,
      `Solar calculation must match the official ${fixture.timeZone} fixture`,
    );
  }

  assert(
    getSolarTimes(
      { year: 2026, month: 6, day: 21 },
      68.36,
      23.43,
    ).status === "polar-day",
    "The solar clock must recognize midnight sun",
  );
  assert(
    getSolarTimes(
      { year: 2026, month: 2, day: 9 },
      78.05556,
      14.22111,
    ).status === "polar-night",
    "The solar clock must recognize polar night",
  );
}

function formatFixtureTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

async function validatePrayerChimes() {
  assert(
    HOLY_CLOCK_CHIMES.length === 4 &&
      new Set(HOLY_CLOCK_CHIMES.map((chime) => chime.id)).size === 4,
    "The Holy Clock must expose four distinct prayer chimes",
  );

  for (const chime of HOLY_CLOCK_CHIMES) {
    const audio = await readFile(
      path.join(process.cwd(), "public", ...chime.src.slice(1).split("/")),
    );
    assert(
      audio.length > 900_000 &&
        audio.subarray(0, 4).toString("ascii") === "RIFF" &&
        audio.subarray(8, 12).toString("ascii") === "WAVE",
      `${chime.label} must resolve to a complete PCM WAV asset`,
    );
  }

  assert(
    HOLY_CLOCK_CHIMES.find((chime) => chime.id === "chime_04")?.gain === 0.5,
    "The Great Bell must be attenuated to protect against its clipped source peak",
  );
}

async function validateCalendarAlarms() {
  const calendar = await readFile(
    path.join(process.cwd(), "public", "liturgy-hours.ics"),
    "utf8",
  );

  assert(
    calendar.match(/^BEGIN:VEVENT$/gm)?.length === HOLY_CLOCK_HOURS.length,
    "The device calendar must contain seven recurring prayer events",
  );
  assert(
    calendar.match(/^BEGIN:VALARM$/gm)?.length === HOLY_CLOCK_HOURS.length,
    "Every device-calendar prayer event must carry an alarm",
  );
  assert(
    calendar.match(/^RRULE:FREQ=DAILY$/gm)?.length ===
      HOLY_CLOCK_HOURS.length,
    "Every device-calendar prayer event must recur daily",
  );

  for (const hour of HOLY_CLOCK_HOURS) {
    assert(
      calendar.includes(
        `https://council-of-saints.vercel.app/${hour.anchor}`,
      ),
      `${hour.name} calendar alarm must open its exact prayer anchor`,
    );
  }

  const startDate = new Date("2026-08-03T12:00:00Z");
  const solarCalendar = createHolyClockCalendar(
    startDate,
    getBuffaloSolarPreferences(),
    "America/New_York",
    "https://council-of-saints.vercel.app",
  );
  const solarEventCount = solarCalendar.match(/BEGIN:VEVENT/g)?.length ?? 0;
  const solarAlarmCount = solarCalendar.match(/BEGIN:VALARM/g)?.length ?? 0;
  const solarRecurrenceCount =
    solarCalendar.match(/RRULE:FREQ=DAILY/g)?.length ?? 0;
  const solarUids = [...solarCalendar.matchAll(/^UID:(.+)\r$/gm)].map(
    (match) => match[1],
  );
  assert(
    solarEventCount === 1_102 &&
      solarAlarmCount === solarEventCount &&
      solarRecurrenceCount === 4 &&
      new Set(solarUids).size === solarEventCount,
    "The solar calendar must contain 366 dated dawn/sunset triplets, four recurring Hours, unique IDs, and an alarm for every event",
  );
  assert(
    solarCalendar.includes(
      "DTSTART;TZID=America/New_York:20260803T052400",
    ) &&
      solarCalendar.includes(
        "DTSTART;TZID=America/New_York:20260803T060900",
      ) &&
      solarCalendar.includes(
        "DTSTART;TZID=America/New_York:20260803T203400",
      ),
    "The exported Buffalo calendar must preserve the pre-dawn, sunrise, and sunset alarms",
  );
  assert(
    solarCalendar
      .split("\r\n")
      .every((line) => Buffer.byteLength(line, "utf8") <= 75),
    "Every physical calendar line must remain within the 75-octet RFC limit",
  );

  const fixedCalendar = createHolyClockCalendar(
    startDate,
    getDefaultHolyClockPreferences(),
    "America/New_York",
    "https://council-of-saints.vercel.app",
  );
  assert(
    (fixedCalendar.match(/BEGIN:VEVENT/g)?.length ?? 0) === 7 &&
      (fixedCalendar.match(/BEGIN:VALARM/g)?.length ?? 0) === 7 &&
      (fixedCalendar.match(/RRULE:FREQ=DAILY/g)?.length ?? 0) === 7,
    "Fixed-time calendar export must retain seven daily alarms",
  );
}

async function validatePassage(scripturePassage: {
  bookId: string;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
}) {
  const book = getScriptureBook(scripturePassage.bookId);
  assert(book, `Unknown book id: ${scripturePassage.bookId}`);

  const rawValue = await readFile(
    path.join(
      process.cwd(),
      "public",
      "data",
      "douay-rheims",
      book.fileName,
    ),
    "utf8",
  );
  const data = JSON.parse(rawValue) as Record<string, Record<string, string>>;
  const chapter = data[String(scripturePassage.chapter)];
  assert(chapter, `Missing ${book.name} ${scripturePassage.chapter}`);

  if (scripturePassage.verseStart !== null) {
    assert(
      chapter[String(scripturePassage.verseStart)],
      `Missing ${book.name} ${scripturePassage.chapter}:${scripturePassage.verseStart}`,
    );
  }

  if (scripturePassage.verseEnd !== null) {
    assert(
      chapter[String(scripturePassage.verseEnd)],
      `Missing ${book.name} ${scripturePassage.chapter}:${scripturePassage.verseEnd}`,
    );
  }
}

function requireHour(
  guides: ReturnType<typeof getDailyOfficeGuides>,
  hourType: (typeof OFFICE_HOUR_TYPES)[number],
) {
  const guide = guides.find((candidate) => candidate.hourType === hourType);
  assert(guide, `Missing ${hourType}`);
  return guide;
}

function assertCitations(
  guide: ReturnType<typeof getDailyOfficeGuides>[number],
  expected: string[],
) {
  const citations = guide.scriptureAnchors.map((anchor) => anchor.citation);
  for (const citation of expected) {
    assert(
      citations.includes(citation),
      `${guide.hourType} is missing ${citation}`,
    );
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
