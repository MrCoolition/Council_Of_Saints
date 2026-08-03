import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  buildRosarySteps,
  getRecommendedMysterySet,
  MYSTERY_SETS,
  ROSARY_PRAYERS,
  type MysterySetId,
  type RosaryPrayerId,
  type RosaryScripturePassage,
  type RosaryStep,
} from "../src/lib/rosary";
import {
  getScriptureBook,
  type ScriptureBookData,
} from "../src/lib/scripture";
import {
  DEFAULT_ROSARY_DESIGN_ID,
  getRosaryDesign,
  isRosaryDesignId,
  ROSARY_DESIGNS,
} from "../src/lib/rosary-designs";

type MysteryBaseline = readonly [
  id: string,
  title: string,
  scripture: string,
  fruit: string,
  passage: readonly [
    bookId: string,
    chapter: number,
    verseStart: number,
    verseEnd: number,
  ],
];

const requiredPrayerIds = [
  "sign_of_cross",
  "apostles_creed",
  "our_father",
  "hail_mary",
  "glory_be",
  "fatima_prayer",
  "hail_holy_queen",
  "rosary_conclusion",
] as const satisfies readonly RosaryPrayerId[];

const mysteryBaseline: Record<MysterySetId, readonly MysteryBaseline[]> = {
  joyful: [
    ["annunciation", "The Annunciation", "Luke 1:26–27", "Humility", ["luke", 1, 26, 27]],
    ["visitation", "The Visitation", "Luke 1:39–42", "Love of Neighbor", ["luke", 1, 39, 42]],
    ["nativity", "The Nativity of Our Lord", "Luke 2:1–7", "Poverty", ["luke", 2, 6, 7]],
    ["presentation", "The Presentation in the Temple", "Luke 2:21–24", "Purity of Heart and Body", ["luke", 2, 21, 24]],
    ["finding-in-temple", "The Finding of Jesus in the Temple", "Luke 2:41–47", "Devotion to Jesus", ["luke", 2, 46, 47]],
  ],
  luminous: [
    ["baptism", "The Baptism of Jesus in the Jordan", "Matthew 3:16–17", "Openness to the Holy Spirit", ["matthew", 3, 16, 17]],
    ["cana", "The Wedding Feast at Cana", "John 2:1–5", "To Jesus through Mary", ["john", 2, 3, 5]],
    ["kingdom", "The Proclamation of the Kingdom", "Mark 1:15", "Conversion", ["mark", 1, 15, 15]],
    ["transfiguration", "The Transfiguration", "Matthew 17:1–2", "Desire for Holiness", ["matthew", 17, 1, 2]],
    ["eucharist", "The Institution of the Eucharist", "Matthew 26:26", "Adoration", ["matthew", 26, 26, 26]],
  ],
  sorrowful: [
    ["agony", "The Agony in the Garden", "Matthew 26:36–39", "Obedience to God’s Will", ["matthew", 26, 36, 39]],
    ["scourging", "The Scourging at the Pillar", "Matthew 27:26", "Mortification", ["matthew", 27, 26, 26]],
    ["crowning-thorns", "The Crowning with Thorns", "Matthew 27:27–29", "Courage", ["matthew", 27, 27, 29]],
    ["carrying-cross", "The Carrying of the Cross", "Mark 15:21–22", "Patience", ["mark", 15, 21, 22]],
    ["crucifixion", "The Crucifixion and Death", "Luke 23:33–46", "Sorrow for our Sins", ["luke", 23, 44, 46]],
  ],
  glorious: [
    ["resurrection", "The Resurrection", "Luke 24:1–5", "Faith", ["luke", 24, 3, 5]],
    ["ascension", "The Ascension", "Mark 16:19", "Hope", ["mark", 16, 19, 19]],
    ["pentecost", "The Descent of the Holy Spirit", "Acts 2:1–4", "Wisdom", ["acts", 2, 1, 4]],
    ["assumption", "The Assumption of Mary", "Luke 1:48–49", "Devotion to Mary", ["luke", 1, 48, 49]],
    ["coronation", "The Coronation of Mary", "Revelation 12:1", "Grace of a Happy Death", ["revelation", 12, 1, 1]],
  ],
};

const scriptureCache = new Map<string, ScriptureBookData>();

async function main() {
  validateRequiredPrayers();
  await validateMysteries();
  validateWeekdayAndSeasonalSchedule();
  validateGeneratedStepsAndBeads();
  validateRosaryDesigns();

  console.log(
    "Validated 20 mysteries, traditional Rosary prayers, the U.S. weekday and seasonal schedule, 59 beads, eight distinct rosary designs, local Douay-Rheims anchors, and Fatima on/off prayer flows.",
  );
}

function validateRequiredPrayers() {
  assert(
    JSON.stringify(Object.keys(ROSARY_PRAYERS).sort()) ===
      JSON.stringify([...requiredPrayerIds].sort()),
    "The complete set of Rosary prayers must be present",
  );

  for (const prayerId of requiredPrayerIds) {
    const prayer = ROSARY_PRAYERS[prayerId];
    assert(prayer.id === prayerId, `${prayerId} must retain its canonical id`);
    assert(prayer.title.trim().length > 0, `${prayerId} needs a title`);
    assert(prayer.text.trim().endsWith("Amen."), `${prayerId} must end with Amen`);
  }

  assert(
    ROSARY_PRAYERS.our_father.text.includes("hallowed be thy name") &&
      ROSARY_PRAYERS.hail_mary.text.includes("the Lord is with thee") &&
      ROSARY_PRAYERS.hail_holy_queen.text.includes("To thee do we cry") &&
      ROSARY_PRAYERS.fatima_prayer.text.includes("thy mercy") &&
      ROSARY_PRAYERS.rosary_conclusion.text.includes("we beseech thee"),
    "The Rosary prayers must use one consistent traditional English register",
  );
}

async function validateMysteries() {
  assert(MYSTERY_SETS.length === 4, "The Rosary must contain four mystery sets");
  assert(
    JSON.stringify(MYSTERY_SETS.map((set) => set.id)) ===
      JSON.stringify(["joyful", "luminous", "sorrowful", "glorious"]),
    "The four mystery sets must retain their canonical ids",
  );

  const mysteryIds = new Set<string>();

  for (const mysterySet of MYSTERY_SETS) {
    assert(
      mysterySet.mysteries.length === 5,
      `${mysterySet.title} must contain five mysteries`,
    );

    const baseline = mysteryBaseline[mysterySet.id];
    for (const [index, mystery] of mysterySet.mysteries.entries()) {
      const expected = baseline[index];
      assert(expected, `${mysterySet.title} has an unexpected mystery`);
      assert(!mysteryIds.has(mystery.id), `Duplicate mystery id: ${mystery.id}`);
      mysteryIds.add(mystery.id);

      assert(
        JSON.stringify([
          mystery.id,
          mystery.title,
          mystery.scripture,
          mystery.fruit,
        ]) === JSON.stringify(expected.slice(0, 4)),
        `${mysterySet.id} mystery ${index + 1} differs from the U.S. Catholic baseline`,
      );
      assert(
        JSON.stringify([
          mystery.scripturePassage.bookId,
          mystery.scripturePassage.chapter,
          mystery.scripturePassage.verseStart,
          mystery.scripturePassage.verseEnd,
        ]) === JSON.stringify(expected[4]),
        `${mystery.id} has the wrong concise Scripture passage`,
      );
      assert(
        mystery.meditation.trim().length > 0,
        `${mystery.id} needs a prayerful meditation`,
      );
      assert(
        !/copyright|public domain|not a direct narrative|does not directly narrate/iu.test(
          mystery.meditation,
        ),
        `${mystery.id} must remain prayer text, not disclaimer text`,
      );

      validatePassageShape(mystery.scripturePassage, mystery.id);
      await validateLocalPassage(mystery.scripturePassage, mystery.id);
    }
  }

  assert(mysteryIds.size === 20, "All twenty mystery ids must be unique");
}

function validatePassageShape(
  passage: RosaryScripturePassage,
  mysteryId: string,
) {
  assert(
    JSON.stringify(Object.keys(passage).sort()) ===
      JSON.stringify(["bookId", "chapter", "verseEnd", "verseStart"]),
    `${mysteryId} must use the canonical Scripture passage shape`,
  );
  assert(passage.bookId.trim().length > 0, `${mysteryId} needs a book id`);
  assert(
    Number.isSafeInteger(passage.chapter) && passage.chapter > 0,
    `${mysteryId} needs a valid chapter`,
  );
  assert(
    Number.isSafeInteger(passage.verseStart) && passage.verseStart > 0,
    `${mysteryId} needs a valid first verse`,
  );
  assert(
    Number.isSafeInteger(passage.verseEnd) &&
      passage.verseEnd >= passage.verseStart,
    `${mysteryId} needs a valid final verse`,
  );
  assert(
    passage.verseEnd - passage.verseStart + 1 <= 4,
    `${mysteryId} must keep its primary excerpt to four verses or fewer`,
  );
}

async function validateLocalPassage(
  passage: RosaryScripturePassage,
  mysteryId: string,
) {
  const book = getScriptureBook(passage.bookId);
  assert(book, `${mysteryId} uses an unknown local book id: ${passage.bookId}`);

  let data = scriptureCache.get(book.id);
  if (!data) {
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
    data = JSON.parse(rawValue) as ScriptureBookData;
    scriptureCache.set(book.id, data);
  }

  const chapter = data[String(passage.chapter)];
  assert(chapter, `${mysteryId} is missing local ${book.name} ${passage.chapter}`);

  for (
    let verseNumber = passage.verseStart;
    verseNumber <= passage.verseEnd;
    verseNumber += 1
  ) {
    assert(
      chapter[String(verseNumber)]?.trim(),
      `${mysteryId} is missing local ${book.name} ${passage.chapter}:${verseNumber}`,
    );
  }
}

function validateWeekdayAndSeasonalSchedule() {
  const expectedByWeekday: readonly MysterySetId[] = [
    "glorious",
    "joyful",
    "sorrowful",
    "glorious",
    "luminous",
    "sorrowful",
    "joyful",
  ];

  for (let weekday = 0; weekday < expectedByWeekday.length; weekday += 1) {
    const date = new Date(2026, 7, 2 + weekday, 12);
    assert(date.getDay() === weekday, `Invalid schedule fixture for weekday ${weekday}`);
    assert(
      getRecommendedMysterySet(date).id === expectedByWeekday[weekday],
      `Weekday ${weekday} has the wrong mystery set`,
    );
  }

  const sunday = new Date(2026, 7, 2, 12);
  assert(
    getRecommendedMysterySet(sunday, "Season of Advent").id === "joyful",
    "Sundays of Advent must use the Joyful Mysteries in the U.S. schedule",
  );
  assert(
    getRecommendedMysterySet(sunday, "Lenten Season").id === "sorrowful",
    "Sundays of Lent must use the Sorrowful Mysteries in the U.S. schedule",
  );
  assert(
    getRecommendedMysterySet(sunday, "Easter").id === "glorious" &&
      getRecommendedMysterySet(sunday, "Ordinary Time").id === "glorious",
    "Sundays outside Advent and Lent must use the Glorious Mysteries",
  );

  const thursday = new Date(2026, 7, 6, 12);
  assert(
    getRecommendedMysterySet(thursday, "Lent").id === "luminous",
    "Seasonal Sunday customs must not replace the weekday schedule",
  );
}

function validateGeneratedStepsAndBeads() {
  for (const mysterySet of MYSTERY_SETS) {
    validateFlow(mysterySet.id, false);
    validateFlow(mysterySet.id, true);
  }
}

function validateRosaryDesigns() {
  const expectedIds = [
    "immaculate-pearl",
    "lourdes-blue",
    "sacred-hearts",
    "guadalupe-rose",
    "saint-benedict",
    "eucharistic-crystal",
    "bethlehem-olivewood",
    "fatima-starlight",
  ];

  assert(
    ROSARY_DESIGNS.length === expectedIds.length,
    "The rosary treasury must contain eight designs",
  );
  assert(
    JSON.stringify(ROSARY_DESIGNS.map((design) => design.id)) ===
      JSON.stringify(expectedIds),
    "The rosary treasury must retain its canonical design ids",
  );
  assert(
    isRosaryDesignId(DEFAULT_ROSARY_DESIGN_ID) &&
      getRosaryDesign(DEFAULT_ROSARY_DESIGN_ID).id ===
        DEFAULT_ROSARY_DESIGN_ID,
    "The default rosary design must resolve from the catalog",
  );

  const visualSignatures = new Set<string>();

  for (const design of ROSARY_DESIGNS) {
    assert(design.name.trim(), `${design.id} needs a name`);
    assert(design.dedication.trim(), `${design.id} needs a dedication`);
    assert(design.materials.trim(), `${design.id} needs materials`);
    assert(design.finish.trim(), `${design.id} needs a finish`);

    const visualSignature = JSON.stringify([
      design.beadShape,
      design.ourFatherShape,
      design.texture,
      design.centerpieceStyle,
      design.crucifixStyle,
    ]);
    assert(
      !visualSignatures.has(visualSignature),
      `${design.id} must have a distinct visual construction`,
    );
    visualSignatures.add(visualSignature);

    for (const [token, color] of Object.entries(design.palette)) {
      assert(
        /^#[\dA-F]{6}$/u.test(color),
        `${design.id} ${token} must be a six-digit hex color`,
      );
    }
  }
}

function validateFlow(setId: MysterySetId, includeFatimaPrayer: boolean) {
  const steps = buildRosarySteps(setId, includeFatimaPrayer);
  const expectedStepCount = includeFatimaPrayer ? 33 : 28;
  const expectedPrayerStepCount = includeFatimaPrayer ? 28 : 23;
  const expectedExpandedPrayerCount = includeFatimaPrayer ? 75 : 70;

  assert(
    steps.length === expectedStepCount,
    `${setId} must generate ${expectedStepCount} guided steps`,
  );
  assert(
    new Set(steps.map((step) => step.id)).size === steps.length,
    `${setId} generated duplicate step ids`,
  );
  assert(
    steps.filter((step) => step.kind === "mystery").length === 5,
    `${setId} must announce five mysteries`,
  );

  const prayerSteps = steps.filter(
    (step): step is RosaryStep & { prayerId: RosaryPrayerId } =>
      step.kind === "prayer" && Boolean(step.prayerId),
  );
  assert(
    prayerSteps.length === expectedPrayerStepCount,
    `${setId} must generate ${expectedPrayerStepCount} prayer steps`,
  );

  const prayerCounts = countPrayerRepetitions(prayerSteps);
  const expandedPrayerCount = Object.values(prayerCounts).reduce(
    (total, count) => total + count,
    0,
  );
  assert(
    expandedPrayerCount === expectedExpandedPrayerCount,
    `${setId} must generate ${expectedExpandedPrayerCount} spoken prayers`,
  );
  assert(
    prayerCounts.our_father === 6 && prayerCounts.hail_mary === 53,
    `${setId} must map exactly 6 Our Father beads and 53 Hail Mary beads`,
  );
  assert(
    prayerCounts.our_father + prayerCounts.hail_mary === 59,
    `${setId} must preserve the 59-bead Rosary`,
  );
  assert(
    prayerCounts.sign_of_cross === 2 &&
      prayerCounts.apostles_creed === 1 &&
      prayerCounts.glory_be === 6 &&
      prayerCounts.hail_holy_queen === 1 &&
      prayerCounts.rosary_conclusion === 1,
    `${setId} must preserve the complete opening, decades, and conclusion`,
  );
  assert(
    prayerCounts.fatima_prayer === (includeFatimaPrayer ? 5 : 0),
    `${setId} has the wrong Fatima prayer count`,
  );
}

function countPrayerRepetitions(
  prayerSteps: readonly (RosaryStep & { prayerId: RosaryPrayerId })[],
) {
  const counts = Object.fromEntries(
    requiredPrayerIds.map((prayerId) => [prayerId, 0]),
  ) as Record<RosaryPrayerId, number>;

  for (const step of prayerSteps) {
    assert(
      Number.isSafeInteger(step.repeatTotal) && step.repeatTotal > 0,
      `${step.id} must have a positive repetition count`,
    );
    counts[step.prayerId] += step.repeatTotal;
  }

  return counts;
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
