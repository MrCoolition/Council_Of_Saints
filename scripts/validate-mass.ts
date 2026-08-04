import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_ANTICIPATED_MASS_CUTOFF,
  getHolyMassRiteKind,
  resolveSaturdayMassContext,
} from "../src/lib/holy-mass";
import {
  MASS_ORDER_SECTIONS,
  type MassDialogueLine,
} from "../src/lib/mass-order";
import {
  AUGUST_1_2026_US_MASS_READINGS,
  AUGUST_2_2026_US_MASS_READINGS,
  AUGUST_4_2026_US_MASS_READINGS,
  getCuratedUsMassReadingsEntries,
  getDouayDisplayCitation,
  getUsMassReadingsForDate,
  getUsccbDailyReadingsUrl,
  JULY_29_2026_US_MASS_READINGS,
  type MassScriptureSelection,
} from "../src/lib/mass-readings";
import { getLiturgicalDay } from "../src/lib/liturgical-calendar";
import { getScriptureBook, type ScripturePassage } from "../src/lib/scripture";
import { parseUsccbLectionaryFeed } from "../src/lib/usccb-lectionary";

async function main() {
  validateOfficialUrls();
  validateProfiles();
  validateMassOrderSchema();
  validateGoldenFixtures();
  validateUsccbFeedParser();
  validateSaturdayResolver();
  await validateLiturgicalCalendarEdges();
  await validateLocalScriptureCoverage();

  console.log(
    "Validated the complete Order of Mass dialogue, curated U.S. Mass fixtures, local Douay passages, liturgical profiles, USCCB links and RSS parsing, ordinary Saturday resolution, and Paschal calendar edge dates.",
  );
}

function validateMassOrderSchema() {
  assert(
    JSON.stringify(MASS_ORDER_SECTIONS.map((section) => section.id)) ===
      JSON.stringify(["entrance", "word", "eucharist", "dismissal"]),
    "The ordinary Mass must retain its four canonical major rites",
  );

  const itemIds = new Set<string>();
  const requiredItems = new Set([
    "sign-of-the-cross",
    "greeting",
    "penitential-act",
    "kyrie",
    "collect",
    "homily",
    "universal-prayer",
    "pray-brethren",
    "preface-dialogue",
    "sanctus",
    "eucharistic-prayer",
    "mystery-of-faith",
    "great-amen",
    "our-father",
    "sign-of-peace",
    "fraction",
    "invitation-to-communion",
    "holy-communion",
    "prayer-after-communion",
    "final-blessing",
    "dismissal",
  ]);

  for (const section of MASS_ORDER_SECTIONS) {
    assert(section.items.length > 0, `${section.title} must contain Mass moments`);

    for (const item of section.items) {
      assert(!itemIds.has(item.id), `Duplicate Order of Mass item id: ${item.id}`);
      itemIds.add(item.id);
      assert(item.title.trim().length > 0, `${item.id} needs a title`);
      validateDialogueLines(item.lines ?? [], item.id);

      if (item.variants) {
        assert(item.variants.length > 1, `${item.id} choices need multiple forms`);
        const variantIds = new Set<string>();
        for (const variant of item.variants) {
          assert(
            !variantIds.has(variant.id),
            `${item.id} has duplicate variant ${variant.id}`,
          );
          variantIds.add(variant.id);
          assert(variant.label.trim().length > 0, `${item.id} variant needs a label`);
          validateDialogueLines(variant.lines, `${item.id}:${variant.id}`);
        }
        assert(
          !item.defaultVariantId || variantIds.has(item.defaultVariantId),
          `${item.id} has an invalid default variant`,
        );
      }

      requiredItems.delete(item.id);
    }
  }

  assert(
    requiredItems.size === 0,
    `Order of Mass is missing: ${Array.from(requiredItems).join(", ")}`,
  );

  const greeting = MASS_ORDER_SECTIONS[0].items.find(
    (item) => item.id === "greeting",
  );
  const penitentialAct = MASS_ORDER_SECTIONS[0].items.find(
    (item) => item.id === "penitential-act",
  );
  const mystery = MASS_ORDER_SECTIONS[2].items.find(
    (item) => item.id === "mystery-of-faith",
  );
  const eucharisticPrayer = MASS_ORDER_SECTIONS[2].items.find(
    (item) => item.id === "eucharistic-prayer",
  );
  const dismissal = MASS_ORDER_SECTIONS[3].items.find(
    (item) => item.id === "dismissal",
  );

  assert(greeting?.variants?.length === 3, "All three greetings are required");
  assert(
    penitentialAct?.variants?.length === 3,
    "All three Penitential Acts are required",
  );
  assert(
    mystery?.variants?.length === 3,
    "All three Memorial Acclamations are required",
  );
  assert(
    eucharisticPrayer?.variants?.length === 4,
    "All four principal Eucharistic Prayers are required",
  );
  assert(dismissal?.variants?.length === 4, "All four dismissals are required");
}

function validateDialogueLines(
  lines: readonly MassDialogueLine[],
  context: string,
) {
  for (const line of lines) {
    assert(line.text.trim().length > 0, `${context} contains an empty dialogue line`);
  }
}

async function validateLiturgicalCalendarEdges() {
  const expected = [
    ["2026-03-29", "palm_sunday_of_the_passion_of_the_lord", "Red"],
    ["2026-04-02", "thursday_of_the_lords_supper", "White"],
    ["2026-04-03", "friday_of_the_passion_of_the_lord", "Red"],
    ["2026-04-04", "holy_saturday", "White"],
    ["2026-04-05", "easter_sunday", "White"],
    ["2026-05-24", "pentecost_sunday", "Red"],
  ] as const;

  for (const [localDate, observanceId, color] of expected) {
    const day = await getLiturgicalDay(localDate, "US");
    assert(
      day.observanceId === observanceId && day.color === color,
      `${localDate} must resolve to ${observanceId} in ${color}`,
    );
  }

  assert(
    getHolyMassRiteKind(
      "friday_of_the_passion_of_the_lord",
      "daytime",
    ) === "good-friday",
    "Good Friday must never use the ordinary Mass flow",
  );
  assert(
    getHolyMassRiteKind("holy_saturday", "daytime") === "holy-saturday" &&
      getHolyMassRiteKind("holy_saturday", "anticipated") ===
        "easter-vigil",
    "Holy Saturday daytime and Easter Vigil must remain distinct rites",
  );
  assert(
    getHolyMassRiteKind("thursday_of_the_lords_supper", "daytime") ===
      "holy-thursday",
    "The Evening Mass of the Lord's Supper needs its proper flow",
  );
}

function validateOfficialUrls() {
  assert(
    getUsccbDailyReadingsUrl("2026-08-01") ===
      "https://bible.usccb.org/bible/readings/080126",
    "The August 1 USCCB URL must be extensionless",
  );
  assert(
    getUsccbDailyReadingsUrl("2026-08-02") ===
      "https://bible.usccb.org/bible/readings/080226",
    "The August 2 USCCB URL must be extensionless",
  );
  assert(
    getUsccbDailyReadingsUrl("2026-08-04") ===
      "https://bible.usccb.org/bible/readings/080426",
    "The August 4 USCCB URL must be extensionless",
  );
  assert(
    !getUsccbDailyReadingsUrl("2026-07-29").endsWith(".cfm"),
    "Generated USCCB daily-reading URLs must never append .cfm",
  );

  const fallback = getUsMassReadingsForDate("2026-08-03");
  assert(fallback.status === "metadata-only", "August 3 must remain metadata-only");
  assert(
    fallback.officialSources[0]?.url.endsWith("/080326"),
    "Metadata-only dates must use the extensionless daily URL",
  );
}

function validateUsccbFeedParser() {
  const syntheticFeed = `Reader wrapper
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<copyright>Copyright Test Owner. All rights reserved.</copyright>
<item>
<title>Test Memorial</title>
<link>https://bible.usccb.org/bible/readings/080126</link>
<description>
&lt;h4&gt;Reading 1 &lt;a href="https://bible.usccb.org/bible/test/1?1 "&gt;Test 1:1&lt;/a&gt;&lt;/h4&gt;
&lt;div class="poetry"&gt;&lt;p&gt;&lt;span&gt;Line one.&lt;/span&gt;&lt;br&gt;&lt;span&gt;Line &amp;amp; two.&lt;/span&gt;&lt;/p&gt;&lt;/div&gt;
&lt;h4&gt;Gospel &lt;a href="https://bible.usccb.org/bible/test/2?1 "&gt;Test 2:1&lt;/a&gt;&lt;/h4&gt;
&lt;div class="poetry"&gt;&lt;p&gt;Gospel line.&lt;/p&gt;&lt;/div&gt;
</description>
<pubDate>Sat, 01 Aug 2026 04:30:00 EDT</pubDate>
</item>
</channel></rss>
Reader footer`;
  const items = parseUsccbLectionaryFeed(syntheticFeed);
  const item = items[0];

  assert(items.length === 1 && item, "The USCCB RSS parser must load one item");
  assert(
    item.localDate === "2026-08-01" && item.title === "Test Memorial",
    "The USCCB RSS parser must derive the civil date and title",
  );
  assert(
    item.sections.length === 2 &&
      item.sections[0]?.title === "Reading 1" &&
      item.sections[0]?.citation === "Test 1:1" &&
      JSON.stringify(item.sections[0]?.lines) ===
        JSON.stringify(["Line one.", "Line & two."]),
    "The USCCB RSS parser must preserve headings, citations, and line breaks",
  );
  assert(
    item.sections.every(
      (section) =>
        section.officialUrl?.startsWith("https://bible.usccb.org/") &&
        section.lines.every((line) => !line.includes("<")),
    ),
    "The USCCB RSS parser must emit safe text and official links only",
  );
  assert(
    parseUsccbLectionaryFeed(
      syntheticFeed.replace(
        "<copyright>Copyright Test Owner. All rights reserved.</copyright>",
        "",
      ),
    ).length === 0,
    "The USCCB RSS parser must fail closed without attribution",
  );
}

function validateProfiles() {
  const august1 = AUGUST_1_2026_US_MASS_READINGS.observance;
  assert(
    august1.title ===
      "Memorial of Saint Alphonsus Liguori, Bishop and Doctor of the Church" &&
      august1.rank === "memorial" &&
      august1.liturgicalColor === "white" &&
      august1.obligatory &&
      JSON.stringify(august1.lectionaryNumbers) === "[406]",
    "August 1 must be the obligatory white Memorial",
  );
  assert(
    !august1.profile.requirements.gloria &&
      !august1.profile.requirements.creed &&
      !august1.profile.requirements.secondReading &&
      august1.profile.requirements.gospelAcclamation === "alleluia",
    "The Saint Alphonsus profile must omit Gloria, Creed, and second reading",
  );

  const august2 = AUGUST_2_2026_US_MASS_READINGS.observance;
  assert(
    august2.title === "Eighteenth Sunday in Ordinary Time" &&
      august2.rank === "sunday" &&
      august2.liturgicalColor === "green" &&
      august2.obligatory &&
      JSON.stringify(august2.lectionaryNumbers) === "[112]",
    "August 2 must be the green Eighteenth Sunday in Ordinary Time",
  );
  assert(
    august2.profile.requirements.gloria &&
      august2.profile.requirements.creed &&
      august2.profile.requirements.secondReading &&
      august2.profile.requirements.gospelAcclamation === "alleluia",
    "The Ordinary Time Sunday profile must include Gloria, Creed, and second reading",
  );

  for (const entry of getCuratedUsMassReadingsEntries()) {
    assert(entry.options.length > 0, `${entry.localDate} needs a reading option`);
    for (const option of entry.options) {
      assert(
        Boolean(option.secondReading) ===
          entry.observance.profile.requirements.secondReading,
        `${entry.localDate} second-reading data must match its Mass profile`,
      );
    }
  }
}

function validateGoldenFixtures() {
  const july29 = getUsMassReadingsForDate("2026-07-29");
  assert(july29.status === "curated", "The July 29 fixture must remain curated");
  assert(
    july29 === JULY_29_2026_US_MASS_READINGS && july29.options.length === 2,
    "The existing July 29 weekday and saint-proper choices must remain intact",
  );

  const august1 = AUGUST_1_2026_US_MASS_READINGS.options[0];
  assert(august1, "August 1 must have an appointed reading set");
  assertSelection(
    august1.firstReading,
    "Jeremiah 26:11–16, 24",
    [
      scripturePassage("jeremiah", 26, 11, 16),
      scripturePassage("jeremiah", 26, 24, 24),
    ],
  );
  assertPsalm(
    august1.responsorialPsalm,
    "Psalm 69:15–16, 30–31, 33–34",
    "Douay Psalm 68:15–16, 30–31, 33–34",
    [
      scripturePassage("psalms", 68, 15, 16),
      scripturePassage("psalms", 68, 30, 31),
      scripturePassage("psalms", 68, 33, 34),
    ],
  );
  assert(
    august1.responsorialPsalm.refrains[0] ===
      "Lord, in your great love, answer me." &&
      JSON.stringify(august1.responsorialPsalm.refrainDisplayCitations) ===
      JSON.stringify(["Psalm 69:14c"]) &&
      august1.responsorialPsalm.refrainDouaySources[0]?.citation ===
        "Douay Psalm 68:14",
    "The August 1 response must map Psalm 69:14c to Douay Psalm 68:14",
  );
  assertSelection(august1.gospelAcclamation, "Matthew 5:10", [
    scripturePassage("matthew", 5, 10, 10),
  ]);
  assertSelection(august1.gospelChoices[0], "Matthew 14:1–12", [
    scripturePassage("matthew", 14, 1, 12),
  ]);

  const august2 = AUGUST_2_2026_US_MASS_READINGS.options[0];
  assert(august2, "August 2 must have an appointed reading set");
  assertSelection(august2.firstReading, "Isaiah 55:1–3", [
    scripturePassage("isaiah", 55, 1, 3),
  ]);
  assertPsalm(
    august2.responsorialPsalm,
    "Psalm 145:8–9, 15–16, 17–18",
    "Douay Psalm 144:8–9, 15–18",
    [
      scripturePassage("psalms", 144, 8, 9),
      scripturePassage("psalms", 144, 15, 16),
      scripturePassage("psalms", 144, 17, 18),
    ],
  );
  assert(
    august2.responsorialPsalm.refrains[0] ===
      "The hand of the Lord feeds us; he answers all our needs." &&
      JSON.stringify(august2.responsorialPsalm.refrainDisplayCitations) ===
      JSON.stringify(["Psalm 145:16"]) &&
      august2.responsorialPsalm.refrainDouaySources[0]?.citation ===
        "Douay Psalm 144:16",
    "The August 2 response must map Psalm 145:16 to Douay Psalm 144:16",
  );
  assert(august2.secondReading, "August 2 requires a second reading");
  assertSelection(august2.secondReading, "Romans 8:35, 37–39", [
    scripturePassage("romans", 8, 35, 35),
    scripturePassage("romans", 8, 37, 39),
  ]);
  assertSelection(august2.gospelAcclamation, "Matthew 4:4b", [
    scripturePassage("matthew", 4, 4, 4),
  ]);
  assertSelection(august2.gospelChoices[0], "Matthew 14:13–21", [
    scripturePassage("matthew", 14, 13, 21),
  ]);

  const august4 = getUsMassReadingsForDate("2026-08-04");
  assert(
    august4 === AUGUST_4_2026_US_MASS_READINGS &&
      august4.status === "curated" &&
      august4.options.length === 2,
    "August 4 must expose both the Saint John Vianney proper and weekday sets",
  );
  const johnVianneyProper = AUGUST_4_2026_US_MASS_READINGS.options[0];
  assert(
    johnVianneyProper.id === "saint-proper",
    "The Saint John Vianney proper must be the default set",
  );
  assertSelection(johnVianneyProper.firstReading, "Ezekiel 3:17–21", [
    scripturePassage("ezekiel", 3, 17, 21),
  ]);
  assertSelection(johnVianneyProper.gospelChoices[0], "Matthew 9:35–10:1", [
    scripturePassage("matthew", 9, 35, 38),
    scripturePassage("matthew", 10, 1, 1),
  ]);
}

function validateSaturdayResolver() {
  const daytime = AUGUST_1_2026_US_MASS_READINGS;
  const anticipated = AUGUST_2_2026_US_MASS_READINGS;

  const beforeCutoff = resolveSaturdayMassContext({
    civilDate: "2026-08-01",
    civilTime: "15:59:59",
    daytime,
    anticipated,
  });
  assert(
    beforeCutoff.mode === "daytime" &&
      beforeCutoff.context === daytime &&
      beforeCutoff.selectedBy === "civil-day",
    "The default resolver must retain the daytime Memorial before 16:00",
  );

  const atCutoff = resolveSaturdayMassContext({
    civilDate: "2026-08-01",
    civilTime: DEFAULT_ANTICIPATED_MASS_CUTOFF,
    daytime,
    anticipated,
  });
  assert(
    atCutoff.mode === "anticipated" &&
      atCutoff.context === anticipated &&
      atCutoff.liturgicalDate === "2026-08-02" &&
      atCutoff.selectedBy === "anticipated-cutoff",
    "The default resolver must select the Sunday context at 16:00",
  );

  const explicitDaytime = resolveSaturdayMassContext({
    civilDate: "2026-08-01",
    civilTime: "20:00",
    daytime,
    anticipated,
    override: "daytime",
  });
  assert(
    explicitDaytime.context === daytime &&
      explicitDaytime.selectedBy === "explicit-override",
    "An explicit daytime override must win after the cutoff",
  );

  const explicitAnticipated = resolveSaturdayMassContext({
    civilDate: "2026-08-01",
    civilTime: "09:00",
    daytime,
    anticipated,
    override: "anticipated",
  });
  assert(
    explicitAnticipated.context === anticipated &&
      explicitAnticipated.selectedBy === "explicit-override",
    "An explicit anticipated override must win before the cutoff",
  );

  const customCutoff = resolveSaturdayMassContext({
    civilDate: "2026-08-01",
    civilTime: "18:29",
    daytime,
    anticipated,
    anticipatedCutoff: "18:30",
  });
  assert(
    customCutoff.mode === "daytime",
    "The resolver must honor a caller-supplied parish cutoff",
  );

  expectRangeError(() =>
    resolveSaturdayMassContext({
      civilDate: "2026-08-02",
      civilTime: "16:00",
      daytime: anticipated,
      anticipated: { ...anticipated, localDate: "2026-08-03" },
    }),
  );
}

async function validateLocalScriptureCoverage() {
  for (const entry of getCuratedUsMassReadingsEntries()) {
    for (const option of entry.options) {
      const selections = [
        option.firstReading,
        option.responsorialPsalm,
        option.secondReading,
        option.gospelAcclamation,
        ...option.gospelChoices,
      ].filter(
        (selection): selection is MassScriptureSelection =>
          selection !== undefined,
      );

      for (const selection of selections) {
        for (const passage of selection.douaySource.passages) {
          await validatePassage(passage);
        }
      }

      for (const source of option.responsorialPsalm.refrainDouaySources) {
        for (const passage of source.passages) {
          await validatePassage(passage);
        }
      }
    }
  }
}

async function validatePassage(passage: ScripturePassage) {
  const book = getScriptureBook(passage.bookId);
  assert(book, `Unknown Scripture book: ${passage.bookId}`);

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
  const chapter = data[String(passage.chapter)];
  assert(chapter, `Missing ${book.name} ${passage.chapter}`);

  if (passage.verseStart === null || passage.verseEnd === null) {
    return;
  }

  for (
    let verseNumber = passage.verseStart;
    verseNumber <= passage.verseEnd;
    verseNumber += 1
  ) {
    assert(
      chapter[String(verseNumber)],
      `Missing ${book.name} ${passage.chapter}:${verseNumber}`,
    );
  }
}

function assertSelection(
  selection: MassScriptureSelection | undefined,
  displayCitation: string,
  passages: readonly ScripturePassage[],
) {
  assert(selection, `Missing ${displayCitation}`);
  assert(
    selection.displayCitation === displayCitation,
    `Expected ${displayCitation}, found ${selection.displayCitation}`,
  );
  assertPassages(selection.douaySource.passages, passages, displayCitation);
}

function assertPsalm(
  selection: MassScriptureSelection,
  displayCitation: string,
  douayCitation: string,
  passages: readonly ScripturePassage[],
) {
  assertSelection(selection, displayCitation, passages);
  assert(
    selection.douaySource.citation === douayCitation,
    `${displayCitation} must map to ${douayCitation}`,
  );
  assert(
    getDouayDisplayCitation(selection) ===
      douayCitation.replace(/^Douay\s+/u, ""),
    `${displayCitation} must show its Douay citation with Douay numbering`,
  );
}

function assertPassages(
  actual: readonly ScripturePassage[],
  expected: readonly ScripturePassage[],
  label: string,
) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} has an incorrect local Douay passage map`,
  );
}

function scripturePassage(
  bookId: string,
  chapter: number,
  verseStart: number,
  verseEnd: number,
): ScripturePassage {
  return { bookId, chapter, verseStart, verseEnd };
}

function expectRangeError(callback: () => unknown) {
  try {
    callback();
  } catch (error) {
    assert(error instanceof RangeError, "Expected a RangeError");
    return;
  }

  throw new Error("Expected callback to throw a RangeError");
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
