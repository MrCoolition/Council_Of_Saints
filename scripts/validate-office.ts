import { readFile } from "node:fs/promises";
import path from "node:path";
import { getDemoTodayPayload } from "../src/lib/demo-data";
import { getDailyOfficeGuides } from "../src/lib/office-psalter";
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

  const fourteenthSunday = getDemoTodayPayload("2026-07-05").liturgicalDay;
  assert(
    fourteenthSunday.weekOfSeason === 14 && fourteenthSunday.psalterWeek === 2,
    "The Psalter week must advance on Sunday, not Monday",
  );

for (let psalterWeek = 1; psalterWeek <= 4; psalterWeek += 1) {
  for (const localDate of weekdayDates) {
    const guides = getDailyOfficeGuides(localDate, psalterWeek);

    assert(guides.length === 3, `${localDate} must expose three prayer hours`);

    for (const guide of guides) {
      assert(
        guide.scriptureAnchors.length > 0,
        `${guide.hourType} cannot be empty on ${localDate}`,
      );

      for (const anchor of guide.scriptureAnchors) {
        anchorCount += 1;

        for (const scripturePassage of anchor.passages) {
          segmentCount += 1;
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
          const data = JSON.parse(rawValue) as Record<
            string,
            Record<string, string>
          >;
          const chapter = data[String(scripturePassage.chapter)];

          assert(
            chapter,
            `Missing ${book.name} ${scripturePassage.chapter}`,
          );

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
      }
    }
  }
}

const fridayWeekTwo = getDailyOfficeGuides("2026-07-10", 2);
const fridayCitations = fridayWeekTwo.flatMap((guide) =>
  guide.scriptureAnchors.map((anchor) => anchor.citation),
);

for (const expectedCitation of [
  "Psalm 51 · Douay Psalm 50",
  "Canticle of Habakkuk · Habakkuk 3:2–4, 13, 15–19",
  "Psalm 147:12–20 · Douay Psalm 147",
  "Ephesians 2:13–16",
  "1 Corinthians 2:7–10a",
  "Psalm 88 · Douay Psalm 87",
  "Jeremiah 14:9",
]) {
  assert(
    fridayCitations.includes(expectedCitation),
    `Friday Week II is missing ${expectedCitation}`,
  );
}

const saturdayWeekTwo = getDailyOfficeGuides("2026-07-11", 2).find(
  (guide) => guide.hourType === "evening_prayer",
);
assert(saturdayWeekTwo, "Saturday Evening Prayer is missing");
assert(
  saturdayWeekTwo.psalterWeek === 3 &&
    saturdayWeekTwo.scriptureAnchors.some((anchor) =>
      anchor.citation.startsWith("Psalm 113"),
    ),
  "Saturday Evening Prayer must advance to the following Sunday",
);

  console.log(
    `Validated 4 weeks × 7 days × 3 hours (${anchorCount} anchors, ${segmentCount} local Scripture segments).`,
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
