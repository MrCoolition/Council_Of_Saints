import { readFile } from "node:fs/promises";
import path from "node:path";
import { getLiturgicalDay } from "../src/lib/liturgical-calendar";
import { HOLY_CLOCK_HOURS } from "../src/lib/liturgy-hours-clock";
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
    `Validated the seven-hour Holy Clock, device alarms, 4 weeks × 7 days × 7 prayer stops, and the July 29, 2026 U.S. golden fixture (${anchorCount} anchors, ${segmentCount} local Scripture segments).`,
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
