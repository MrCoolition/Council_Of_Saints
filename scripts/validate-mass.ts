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
  findMassSpeechMatch,
  normalizeMassSpeech,
  splitMassSpeechText,
  type MassSpeechCandidate,
} from "../src/lib/mass-speech-following";
import {
  AUGUST_1_2026_US_MASS_READINGS,
  AUGUST_2_2026_US_MASS_READINGS,
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
import {
  buildUsccbLectionaryReadingSets,
  parseUsccbReadingPage,
} from "../src/lib/usccb-reading-page";

async function main() {
  validateOfficialUrls();
  validateProfiles();
  validateMassOrderSchema();
  validateMassSpeechFollowing();
  validateGoldenFixtures();
  validateUsccbFeedParser();
  validateUsccbRelatedReadingResolver();
  validateSaturdayResolver();
  await validateLiturgicalCalendarEdges();
  await validateLocalScriptureCoverage();

  console.log(
    "Validated the complete Order of Mass dialogue, curated Douay fixtures, official USCCB daily/Proper discovery, local Scripture passages, liturgical profiles, ordinary Saturday resolution, and Paschal calendar edge dates.",
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

function validateMassSpeechFollowing() {
  assert(
    normalizeMassSpeech("  GLÓRIA—Lord’s! & “Peace.”  ") ===
      "gloria lords and peace",
    "Speech normalization must ignore accents, punctuation, case, and spacing",
  );

  const displayText = Array.from({ length: 41 }, (_, index) => {
    if (index === 40) {
      return `Word${index + 1}!`;
    }
    if (index === 10) {
      return `Word${index + 1},\n`;
    }
    if (index === 20) {
      return `Word${index + 1}.  `;
    }
    return `Word${index + 1} `;
  }).join("");
  const displayChunks = splitMassSpeechText(displayText);
  assert(
    displayChunks.join("") === displayText,
    "Speech chunks must preserve the exact visible text when rejoined",
  );
  assert(
    displayChunks.length === 3 &&
      displayChunks.every((chunk) => {
        const count = normalizeMassSpeech(chunk).split(" ").length;
        return count >= 8 && count <= 20;
      }),
    "Default speech chunks must be balanced within the 8–20 word bounds",
  );
  assert(
    JSON.stringify(splitMassSpeechText("  Amen.\n")) ===
      JSON.stringify(["  Amen.\n"]) &&
      JSON.stringify(splitMassSpeechText("…")) === JSON.stringify(["…"]) &&
      splitMassSpeechText("").length === 0,
    "Short, punctuation-only, and empty display text must split losslessly",
  );
  expectRangeError(() => splitMassSpeechText("one two three", 4, 3));

  const responseCandidates: MassSpeechCandidate[] = [
    {
      id: "opening",
      order: 1_000,
      text: "Brothers and sisters let us acknowledge our sins and prepare ourselves to celebrate the sacred mysteries.",
    },
    { id: "amen-immediate", order: 2_000, text: "Amen." },
    {
      id: "intervening-prayer",
      order: 3_000,
      text: "May the Lord guide our hearts with mercy and strengthen our faithful witness throughout this holy celebration.",
    },
    { id: "amen-later", order: 9_000, text: "Amen." },
  ];
  let match = findMassSpeechMatch({
    transcript: "room noise ... Amen!",
    candidates: responseCandidates,
    currentOrder: 1_000,
  });
  assert(
    match?.candidate.id === "amen-immediate" && match.scope === "forward",
    "A short repeated response must advance only to the immediate next target",
  );
  match = findMassSpeechMatch({
    transcript: "Amen.",
    candidates: responseCandidates,
    currentOrder: 2_000,
  });
  assert(
    match === null,
    "A repeated short response must not match the current or a later non-immediate target",
  );

  const sparseCandidates: MassSpeechCandidate[] = [
    {
      id: "sparse-current",
      order: 1_000,
      text: "The opening procession approaches the sanctuary while the assembly gathers in reverent silence.",
    },
    ...Array.from({ length: 15 }, (_, index) => ({
      id: `sparse-filler-${index + 1}`,
      order: (index + 2) * 1_000,
      text: "Amen.",
    })),
    {
      id: "sixteenth-forward-target",
      order: 17_000,
      text: "Cedar branches shimmer beside quiet Jordan waters while faithful pilgrims carry golden lamps toward dawn.",
    },
    {
      id: "seventeenth-forward-target",
      order: 18_000,
      text: "Astronomers measure distant galaxies through polished lenses as winter satellites transmit numerical signals across laboratories.",
    },
  ];
  match = findMassSpeechMatch({
    transcript: "Cedar branches shimmer beside quiet Jordan waters while faithful pilgrims carry golden lamps toward dawn.",
    candidates: sparseCandidates,
    currentOrder: 1_000,
  });
  assert(
    match?.candidate.id === "sixteenth-forward-target",
    "The forward window must count sixteen distinct sparse target orders",
  );
  match = findMassSpeechMatch({
    transcript: "Astronomers measure distant galaxies through polished lenses as winter satellites transmit numerical signals across laboratories.",
    candidates: sparseCandidates,
    currentOrder: 1_000,
  });
  assert(
    match === null,
    "The seventeenth distinct order must remain outside the forward window",
  );
  match = findMassSpeechMatch({
    transcript: "Astronomers measure distant galaxies through polished lenses as winter satellites transmit numerical signals across laboratories.",
    candidates: sparseCandidates,
    currentOrder: 1_000,
    allowGlobal: true,
  });
  assert(
    match?.candidate.id === "seventeenth-forward-target" &&
      match.scope === "global",
    "Global reacquisition must recover a distinctive future phrase beyond the forward window",
  );

  const readingCandidates: MassSpeechCandidate[] = [
    {
      id: "first-reading",
      order: 10_000,
      label: "First Reading",
      text: "Beloved, let us love one another, because love is of God; everyone who loves is begotten by God and knows God.",
    },
    {
      id: "gospel-reading",
      order: 20_000,
      label: "Gospel",
      text: "Jesus entered the boat and his disciples followed him. Suddenly a violent storm came up on the sea, so that the boat was being swamped by waves.",
    },
  ];
  match = findMassSpeechMatch({
    transcript: "organ crackle — JESUS entered the boat, and His disciples followed Him; suddenly a violent storm came up on the sea",
    candidates: readingCandidates,
  });
  assert(
    match?.candidate.id === "gospel-reading" &&
      match.candidate.label === "Gospel" &&
      match.scope === "global" &&
      match.score >= 0.75,
    "Global acquisition must tolerate punctuation, casing, and a noisy rolling prefix",
  );
  const firstInterimHypothesis = findMassSpeechMatch({
    transcript:
      "Beloved let us love one another because love is of God everyone who loves is begotten by God",
    candidates: readingCandidates,
  });
  const correctedInterimHypothesis = findMassSpeechMatch({
    transcript:
      "Jesus entered the boat and his disciples followed him suddenly a violent storm came up on the sea",
    candidates: readingCandidates,
  });
  assert(
    firstInterimHypothesis?.candidate.id === "first-reading" &&
      correctedInterimHypothesis?.candidate.id === "gospel-reading",
    "Corrected interim hypotheses must be rescored against the latest spoken wording",
  );
  assert(
    findMassSpeechMatch({
      transcript: "Jesus boat disciples storm",
      candidates: readingCandidates,
    }) === null,
    "Global acquisition must require at least five informative words",
  );
  assert(
    findMassSpeechMatch({
      transcript:
        "unrelated ventilation footsteps coughing traffic outside the building",
      candidates: readingCandidates,
    }) === null,
    "Unrelated background speech must leave the current position unchanged",
  );
  assert(
    findMassSpeechMatch({
      transcript: "Jesus entered the boat and his disciples followed him suddenly a violent storm came up on the sea",
      candidates: readingCandidates,
      allowGlobal: false,
    }) === null,
    "Callers must be able to disable global acquisition",
  );

  const repeatedLongText =
    "May almighty God bless you the Father and the Son and the Holy Spirit and keep you in peace.";
  assert(
    findMassSpeechMatch({
      transcript: repeatedLongText,
      candidates: [
        { id: "repeat-a", order: 1_000, text: repeatedLongText },
        { id: "repeat-b", order: 2_000, text: repeatedLongText },
      ],
    }) === null,
    "Global acquisition must reject a winner without a fifteen-point margin",
  );

  const pastText =
    "Martha welcomed Jesus into her home and listened quietly while he taught the gathered disciples.";
  assert(
    findMassSpeechMatch({
      transcript: pastText,
      candidates: [
        { id: "past-reading", order: 1_000, text: pastText },
        {
          id: "future-reading",
          order: 9_000,
          text: "Copper engines calculate orbital pressure beneath frozen titanium chambers during remote laboratory calibration.",
        },
      ],
      currentOrder: 5_000,
      allowGlobal: true,
    }) === null,
    "Forward and global recovery must never move to a previous order",
  );

  const variantCandidates: MassSpeechCandidate[] = [
    {
      id: "creed-introduction",
      order: 1_000,
      text: "Together with the whole Church let us now profess the faith handed down to us.",
    },
    {
      id: "nicene-creed",
      order: 5_000,
      label: "Nicene Creed",
      text: "I believe in one God the Father almighty maker of heaven and earth of all things visible and invisible.",
    },
    {
      id: "apostles-creed",
      order: 5_000,
      label: "Apostles’ Creed",
      text: "I believe in God the Father almighty creator of heaven and earth and in Jesus Christ his only Son our Lord.",
    },
  ];
  match = findMassSpeechMatch({
    transcript: "I believe in God, the Father almighty, creator of heaven and earth, and in Jesus Christ, his only Son, our Lord.",
    candidates: variantCandidates,
    currentOrder: 1_000,
  });
  assert(
    match?.candidate.id === "apostles-creed" &&
      match.candidate.order === 5_000,
    "Candidates sharing one order must remain independently matchable variants",
  );

  const orderedText =
    "Merciful Father gather your scattered children into one faithful family beneath the light of truth.";
  assert(
    findMassSpeechMatch({
      transcript: normalizeMassSpeech(orderedText).split(" ").reverse().join(" "),
      candidates: [
        { id: "ordered-target", order: 1_000, text: orderedText },
        {
          id: "ordered-decoy",
          order: 2_000,
          text: "Bright morning bells awaken distant villages beside the valley orchard and flowing river.",
        },
      ],
    }) === null,
    "Token similarity must preserve spoken order rather than use a word bag",
  );

  const rollingTarget =
    "The Lord remembers his covenant forever and feeds the gathered people with wisdom mercy justice and peace.";
  match = findMassSpeechMatch({
    transcript: `${Array.from({ length: 30 }, (_, index) => `noise${index}`).join(" ")} ${rollingTarget}`,
    candidates: [
      {
        id: "rolling-current",
        order: 1_000,
        text: "The choir completes the entrance chant as the ministers approach the altar in procession.",
      },
      { id: "rolling-target", order: 8_000, text: rollingTarget },
    ],
    currentOrder: 1_000,
  });
  assert(
    match?.candidate.id === "rolling-target",
    "Matching must use the relevant suffix of a growing rolling transcript",
  );
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

function validateUsccbRelatedReadingResolver() {
  const cases = [
    {
      localDate: "2026-08-04",
      dailyUrl: "https://bible.usccb.org/bible/readings/080426.cfm",
      dailyTitle: "Tuesday of the Eighteenth Week in Ordinary Time",
      dailyLectionary: 408,
      dailyFirst: "Jeremiah 30:1-2, 12-15, 18-22",
      dailyGospel: "Matthew 14:22-36",
      properUrl:
        "https://bible.usccb.org/bible/readings/memorial-saint-john-vianney-priest",
      properTitle: "Memorial of Saint John Vianney, Priest",
      properLectionary: 612,
      properFirst: "Ezekiel 3:17-21",
      properGospel: "Matthew 9:35-10:1",
      note:
        "The readings are proper. The Common of Pastors, Lectionary 719-724, may also be used.",
    },
    {
      localDate: "2026-07-11",
      dailyUrl: "https://bible.usccb.org/bible/readings/071126.cfm",
      dailyTitle: "Saturday of the Fourteenth Week in Ordinary Time",
      dailyLectionary: 388,
      dailyFirst: "Isaiah 6:1-8",
      dailyGospel: "Matthew 10:24-33",
      properUrl:
        "https://bible.usccb.org/bible/readings/0711-memorial-benedict.cfm",
      properTitle: "Memorial of Saint Benedict, Abbot",
      properLectionary: 597,
      properFirst: "Proverbs 2:1-9",
      properGospel: "Matthew 19:27-29",
      note:
        "The Common of Holy Men and Women: For Religious, Lectionary 737-742, may also be used.",
    },
  ] as const;

  for (const fixture of cases) {
    const daily = parseUsccbReadingPage(
      makeUsccbReaderFixture({
        title: fixture.dailyTitle,
        lectionary: fixture.dailyLectionary,
        firstReading: fixture.dailyFirst,
        gospel: fixture.dailyGospel,
        relatedTitle: fixture.properTitle,
        relatedUrl: fixture.properUrl,
      }),
      { localDate: fixture.localDate, officialUrl: fixture.dailyUrl },
    );
    const proper = parseUsccbReadingPage(
      makeUsccbReaderFixture({
        title: fixture.properTitle,
        lectionary: fixture.properLectionary,
        firstReading: fixture.properFirst,
        gospel: fixture.properGospel,
        note: fixture.note,
      }),
      { localDate: fixture.localDate, officialUrl: fixture.properUrl },
    );

    assert(daily && proper, `${fixture.properTitle} pages must parse`);
    assert(
      daily.relatedReadingPages[0]?.url === fixture.properUrl,
      `${fixture.properTitle} must be discovered from its daily page`,
    );

    const sets = buildUsccbLectionaryReadingSets(daily, [proper]);
    assert(
      sets.length === 2 &&
        sets[0]?.sourceKind === "proper" &&
        sets[1]?.sourceKind === "daily",
      `${fixture.properTitle} must expose the Proper first and daily set second`,
    );
    assert(
      sets[0]?.lectionaryNumber === fixture.properLectionary &&
        sets[0]?.firstReadingCitation === fixture.properFirst &&
        sets[0]?.gospelCitations[0] === fixture.properGospel &&
        sets[0]?.description.includes(fixture.note),
      `${fixture.properTitle} must retain its official lectionary, citations, and Common note`,
    );
  }
}

function makeUsccbReaderFixture(input: {
  title: string;
  lectionary: number;
  firstReading: string;
  gospel: string;
  note?: string;
  relatedTitle?: string;
  relatedUrl?: string;
}) {
  const related = input.relatedTitle && input.relatedUrl
    ? `Readings for the [${input.relatedTitle}](${input.relatedUrl})`
    : "";

  return `Markdown Content:
# Daily Readings
${related}
## ${input.title}
Lectionary: ${input.lectionary}
${input.note ?? ""}
### Reading 1
[${input.firstReading}](https://bible.usccb.org/bible/test/1)
The first reading text.
### Gospel
[${input.gospel}](https://bible.usccb.org/bible/test/2)
The Gospel text.
Lectionary for Mass copyright United States Conference of Catholic Bishops`;
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
