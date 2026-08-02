import {
  devotionGuidePrayerSlugs,
  devotionGuides,
  formationGuideCategories,
  prayerCategories,
  prayers,
} from "../src/lib/prayers";

const requiredPrayerSlugs = [
  "sign-of-the-cross",
  "our-father",
  "hail-mary",
  "apostles-creed",
  "nicene-creed",
  "magnificat",
  "benedictus",
  "te-deum",
  "veni-creator-spiritus",
  "litany-holy-name",
  "litany-sacred-heart",
  "litany-precious-blood",
  "litany-loreto",
  "litany-saint-joseph",
  "litany-all-saints",
  "eternal-rest",
  "de-profundis",
  "prayer-before-mass",
  "prayer-after-communion-aquinas",
  "consecration-to-sacred-heart",
] as const;

const forbiddenCorpusPhrases = [
  "copyright notice",
  "all rights reserved",
  "used with permission",
  "magnificat magazine",
  "days indulgence",
  "years indulgence",
  "divine mercy chaplet",
  "major exorcism",
  "i command you, satan",
] as const;

function main() {
  assert(
    prayers.length >= 115,
    `The treasury needs at least 115 prayers; found ${prayers.length}`,
  );
  assert(
    devotionGuides.length >= 15,
    `The treasury needs at least 15 guided devotions; found ${devotionGuides.length}`,
  );

  assertUnique(
    prayers.map((prayer) => prayer.slug),
    "prayer slugs",
  );
  assertUnique(
    devotionGuides.map((guide) => guide.slug),
    "devotion guide slugs",
  );

  for (const prayer of prayers) {
    assert(
      prayerCategories.includes(prayer.category),
      `${prayer.slug} has an unknown prayer category`,
    );
    assert(prayer.title.trim().length > 0, `${prayer.slug} needs a title`);
    assert(
      prayer.summary.trim().length > 0 && prayer.whenToPray.trim().length > 0,
      `${prayer.slug} needs discovery metadata`,
    );
    assert(
      prayer.source.trim().length > 0,
      `${prayer.slug} needs internal provenance`,
    );
    assert(
      prayer.text.length > 0 &&
        prayer.text.every((paragraph) => paragraph.trim().length > 0),
      `${prayer.slug} needs complete prayable text`,
    );

    const corpus = [prayer.title, prayer.summary, ...prayer.text]
      .join(" ")
      .toLocaleLowerCase("en-US");
    for (const phrase of forbiddenCorpusPhrases) {
      assert(
        !corpus.includes(phrase),
        `${prayer.slug} contains non-prayer disclaimer or obsolete indulgence language`,
      );
    }
  }

  for (const category of prayerCategories) {
    assert(
      prayers.some((prayer) => prayer.category === category),
      `${category} must contain at least one prayer`,
    );
  }

  for (const guide of devotionGuides) {
    assert(
      formationGuideCategories.includes(guide.category),
      `${guide.slug} has an unknown guide category`,
    );
    assert(
      guide.steps.length >= 4 &&
        guide.steps.every(
          (step) =>
            step.title.trim().length > 0 && step.instruction.trim().length > 0,
        ),
      `${guide.slug} needs at least four complete prayer steps`,
    );

    const guideCorpus = [
      guide.title,
      guide.summary,
      guide.provenance,
      guide.pastoralNote ?? "",
      ...guide.steps.flatMap((step) => [
        step.title,
        step.instruction,
        step.scripture ?? "",
      ]),
    ]
      .join(" ")
      .toLocaleLowerCase("en-US");
    for (const phrase of forbiddenCorpusPhrases) {
      assert(
        !guideCorpus.includes(phrase),
        `${guide.slug} contains non-prayer disclaimer or prohibited text`,
      );
    }

    const relatedPrayerSlugs = devotionGuidePrayerSlugs[guide.slug];
    assert(
      relatedPrayerSlugs && relatedPrayerSlugs.length > 0,
      `${guide.slug} needs direct links to every named treasury prayer`,
    );
    for (const prayerSlug of relatedPrayerSlugs) {
      assert(
        prayers.some((prayer) => prayer.slug === prayerSlug),
        `${guide.slug} links to missing prayer ${prayerSlug}`,
      );
    }
  }

  for (const slug of requiredPrayerSlugs) {
    assert(
      prayers.some((prayer) => prayer.slug === slug),
      `The comprehensive treasury is missing ${slug}`,
    );
  }

  const formCounts = new Map<string, number>();
  for (const prayer of prayers) {
    const form = prayer.form ?? "Prayer";
    formCounts.set(form, (formCounts.get(form) ?? 0) + 1);
  }
  assert((formCounts.get("Litany") ?? 0) >= 6, "At least six litanies are required");
  assert((formCounts.get("Canticle") ?? 0) >= 3, "At least three canticles are required");
  assert((formCounts.get("Creed") ?? 0) >= 2, "Both principal creeds are required");
  assert((formCounts.get("Hymn") ?? 0) >= 6, "At least six sacred hymns are required");
  assert((formCounts.get("Psalm") ?? 0) >= 1, "At least one complete psalm is required");
  assert(
    (formCounts.get("Antiphon") ?? 0) >= 3,
    "At least three Marian antiphons are required",
  );

  console.log(
    `Validated ${prayers.length} Catholic prayers across ${prayerCategories.length} collections, ${formCounts.get("Litany") ?? 0} litanies, and ${devotionGuides.length} complete devotional guides.`,
  );
}

function assertUnique(values: string[], label: string) {
  assert(new Set(values).size === values.length, `Duplicate ${label} detected`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

main();
