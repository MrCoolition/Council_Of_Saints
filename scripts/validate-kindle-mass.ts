import {
  getKindleMassResponseHeaders,
  type KindleMassExplicitForm,
  type KindleMassForm,
  renderKindleMassCacheManifest,
  renderKindleMassHtml,
  renderKindleMassUnavailable,
  resolveKindleMassView,
} from "../src/lib/kindle-mass-html";
import { MASS_ORDER_SECTIONS } from "../src/lib/mass-order";

type KindleMassData = Parameters<typeof renderKindleMassHtml>[0];
type Celebration = KindleMassData["daytime"];
type Requirements = Celebration["profile"]["requirements"];
type LectionaryItem = NonNullable<Celebration["massLectionary"]>;
type ReadingSet = Celebration["readingSets"][number];
type LoadedOption = Celebration["options"][number];
type LoadedSelection = LoadedOption["firstReading"];

const AUTO = "auto" satisfies KindleMassForm;
const DAYTIME = "daytime" satisfies KindleMassExplicitForm;
const ANTICIPATED = "anticipated" satisfies KindleMassExplicitForm;
const MAX_DOCUMENT_BYTES = 512 * 1024;
const KINDLE_PATH = "/mass/kindle";

const WEEKDAY_REQUIREMENTS: Requirements = {
  gloria: false,
  creed: false,
  secondReading: false,
  sprinklingRite: false,
  sequence: "none",
  gospelAcclamation: "alleluia",
};

const SUNDAY_REQUIREMENTS: Requirements = {
  gloria: true,
  creed: true,
  secondReading: true,
  sprinklingRite: true,
  sequence: "none",
  gospelAcclamation: "alleluia",
};

const SPECIAL_RITE_EXPECTATIONS = {
  "good-friday": [
    "Silent Entrance",
    "Entrance and Prostration",
    "Opening Prayer",
    "Liturgy of the Word",
    "The Passion of the Lord",
    "Homily and Sacred Silence",
    "Solemn Intercessions",
    "Adoration of the Holy Cross",
    "Showing of the Cross",
    "Veneration of the Cross",
    "Holy Communion",
    "The Lord’s Prayer",
    "Invitation to Communion",
    "Departure in Silence",
    "Prayer over the People",
    "Depart in Silence",
  ],
  "holy-saturday": [
    "At the Lord’s Tomb",
    "Sacred Silence",
    "Liturgy of the Hours",
    "The Church Waits",
    "Prayer and Fasting",
    "Easter Vigil",
    "In the Holy Night",
  ],
  "easter-vigil": [
    "The Solemn Beginning of the Vigil",
    "Blessing of the Fire and Paschal Candle",
    "Procession of the Paschal Candle",
    "Thanks be to God.",
    "Easter Proclamation — Exsultet",
    "Gloria",
    "Baptismal Liturgy",
    "Litany of the Saints and Blessing of Water",
    "Baptism and Renewal of Baptismal Promises",
    "Liturgy of the Eucharist",
    "Easter Dismissal",
    "Thanks be to God, alleluia, alleluia.",
  ],
} as const;

function main() {
  validateWeekdayAndSunday();
  validateCanonicalSingleFlow();
  validateSingleReadingSet();
  validateSaturdayResolution();
  validateHolySaturdayResolution();
  validateOrdinaryRiteVariations();
  validateSpecialRites();
  validateEscaping();
  validatePreparedCacheMode();
  validateHeadersAndUnavailablePage();

  console.log("Kindle Mass validation passed.");
}


function validateWeekdayAndSunday() {
  const weekday = makePageData({
    daytime: makeCelebration({
      id: "weekday-mass",
      localDate: "2026-08-03",
      title: "Monday of the Eighteenth Week in Ordinary Time",
      requirements: WEEKDAY_REQUIREMENTS,
    }),
  });
  const weekdayHtml = render(weekday);
  assertText(
    weekdayHtml,
    "Monday of the Eighteenth Week in Ordinary Time",
    "The weekday title must render",
  );
  assertText(weekdayHtml, "Reading 1", "The weekday first reading must render");
  assertText(weekdayHtml, "Responsorial Psalm", "The weekday psalm must render");
  assertText(weekdayHtml, "Gospel", "The weekday Gospel must render");
  assert(
    !documentText(weekdayHtml).includes("SUNDAY SECOND READING SENTINEL"),
    "A weekday must not render a second reading when its profile omits it",
  );
  assertSingleMass(weekdayHtml, "weekday Mass");
  assertLegacySafe(weekdayHtml, "weekday Mass");
  assertAnchorIntegrity(weekdayHtml, "weekday Mass");

  const sunday = makePageData({
    daytime: makeCelebration({
      id: "sunday-mass",
      localDate: "2026-08-02",
      title: "Eighteenth Sunday in Ordinary Time",
      rank: "Sunday",
      requirements: SUNDAY_REQUIREMENTS,
    }),
  });
  const sundayHtml = render(sunday);
  assertText(sundayHtml, "Glory to God in the highest", "Sunday must include the Gloria");
  assertText(sundayHtml, "I believe in one God", "Sunday must include the Nicene Creed");
  assertText(
    sundayHtml,
    "SUNDAY SECOND READING SENTINEL",
    "Sunday must include its appointed second reading",
  );
  assert(
    !documentText(sundayHtml).includes("Sprinkling Rite"),
    "The Sunday page must not stack the optional Sprinkling Rite",
  );
  assert(
    !documentText(sundayHtml).includes("Apostles' Creed"),
    "The Sunday page must not stack a second profession of faith",
  );
  assertSingleMass(sundayHtml, "Sunday Mass");
  assertLegacySafe(sundayHtml, "Sunday Mass");
  assertAnchorIntegrity(sundayHtml, "Sunday Mass");
  assertSize(sundayHtml, "Sunday Mass");
}


function validateCanonicalSingleFlow() {
  const html = render(
    makePageData({
      daytime: makeCelebration({
        id: "dialogue-coverage",
        localDate: "2026-08-02",
        requirements: SUNDAY_REQUIREMENTS,
      }),
    }),
  );

  const selectedTexts = new Set<string>();
  for (const section of MASS_ORDER_SECTIONS) {
    for (const item of section.items) {
      if (item.id !== "kyrie") {
        for (const line of item.lines ?? []) {
          selectedTexts.add(line.text);
        }
      }
      const selected =
        item.variants?.find((variant) => variant.id === item.defaultVariantId) ??
        item.variants?.[0];
      for (const line of selected?.lines ?? []) {
        selectedTexts.add(line.text);
      }
    }
  }

  for (const section of MASS_ORDER_SECTIONS) {
    assertText(html, section.title, `Missing canonical section ${section.id}`);
    for (const item of section.items) {
      if (item.id !== "kyrie") {
        assertText(html, item.title, `Missing canonical item ${item.id}`);
        for (const line of item.lines ?? []) {
          assertText(html, line.text, `Missing base line from ${item.id}`);
        }
      }

      const selected =
        item.variants?.find((variant) => variant.id === item.defaultVariantId) ??
        item.variants?.[0];
      for (const line of selected?.lines ?? []) {
        assertText(html, line.text, `Missing selected line from ${item.id}`);
      }

      for (const variant of item.variants ?? []) {
        if (variant === selected) {
          continue;
        }
        for (const line of variant.lines) {
          if (!selectedTexts.has(line.text)) {
            assert(
              !documentText(html).includes(normalizeText(line.text)),
              `Non-selected form leaked into the Mass: ${item.id}/${variant.id}`,
            );
          }
        }
      }
    }
  }

  assertText(
    html,
    "Penitential Act and Kyrie",
    "The opening rites should read as one smooth sequence",
  );
  assertSingleMass(html, "canonical dialogue flow");
}



function validateSingleReadingSet() {
  const requirements: Requirements = {
    ...SUNDAY_REQUIREMENTS,
    sequence: "required",
  };
  const celebration = makeCelebration({
    id: "reading-coverage",
    localDate: "2026-08-02",
    requirements,
  });
  const html = render(makePageData({ daytime: celebration }));
  const text = documentText(html);

  for (const expected of [
    "U.S. LECTIONARY FIRST READING SENTINEL",
    "U.S. LECTIONARY PSALM SENTINEL",
    "SUNDAY SECOND READING SENTINEL",
    "U.S. LECTIONARY GOSPEL SENTINEL",
    "R. Test refrain for all the earth.",
  ]) {
    assertText(html, expected, `Missing appointed daily reading content: ${expected}`);
  }
  for (const rejected of [
    "PROPER FIRST READING SENTINEL",
    "PROPER PSALM SENTINEL",
    "PROPER SECOND READING SENTINEL",
    "PROPER GOSPEL SENTINEL",
    "DOUAY FIRST READING SENTINEL",
    "DOUAY GOSPEL SENTINEL",
    "ALTERNATE GOSPEL SENTINEL",
    "U.S. LECTIONARY ALTERNATE GOSPEL SENTINEL",
    "U.S. LECTIONARY READING OPTION SENTINEL",
    "Douay-Rheims",
  ]) {
    assert(
      !text.includes(normalizeText(rejected)),
      `A second reading set, alternate form, or edition leaked into the Mass: ${rejected}`,
    );
  }
  assert(
    (html.match(/class="reading-set\b/gu) ?? []).length === 1,
    "Exactly one appointed reading set must render",
  );
  assert(html.includes('id="appointed-readings"'), "The appointed readings need one stable anchor");

  const withoutPrimary = {
    ...celebration,
    id: "reading-daily-set-fallback",
    massLectionary: null,
  } satisfies Celebration;
  const withoutPrimaryHtml = render(makePageData({ daytime: withoutPrimary }));
  assertText(
    withoutPrimaryHtml,
    "U.S. LECTIONARY FIRST READING SENTINEL",
    "The daily reading set must win even when optional proper sets precede it",
  );
  assert(
    !documentText(withoutPrimaryHtml).includes("PROPER FIRST READING SENTINEL"),
    "An optional proper set must not replace the daily Mass by array position",
  );

  const withoutSets = {
    ...celebration,
    id: "reading-primary-fallback",
    readingSets: [],
  } satisfies Celebration;
  const withoutSetsHtml = render(makePageData({ daytime: withoutSets }));
  assertText(
    withoutSetsHtml,
    "U.S. LECTIONARY FIRST READING SENTINEL",
    "The primary daily lectionary must render when no reading sets are supplied",
  );
  assertSingleMass(html, "single appointed reading set");
  assertSingleMass(withoutPrimaryHtml, "single daily reading-set fallback");
  assertSingleMass(withoutSetsHtml, "single primary reading fallback");
  assertLegacySafe(html, "single appointed reading set");
  assertSize(html, "single appointed reading set");
}

function validateSaturdayResolution() {
  const daytime = makeCelebration({
    id: "saturday-daytime",
    localDate: "2026-08-01",
    title: "Saturday Memorial",
    requirements: WEEKDAY_REQUIREMENTS,
  });
  const anticipated = makeCelebration({
    id: "anticipated-sunday",
    localDate: "2026-08-02",
    mode: "anticipated",
    title: "Anticipated Sunday",
    rank: "Sunday",
    requirements: SUNDAY_REQUIREMENTS,
  });
  const before = makePageData({
    civilDate: "2026-08-01",
    civilTime: "15:59",
    daytime,
    anticipated,
  });
  const after = makePageData({
    civilDate: "2026-08-01",
    civilTime: "16:00",
    daytime,
    anticipated,
  });

  assert(
    resolveKindleMassView(before, AUTO).id === daytime.id,
    "Saturday auto mode must retain the daytime Mass before 16:00",
  );
  assert(
    resolveKindleMassView(after, AUTO).id === anticipated.id,
    "Saturday auto mode must use the anticipated Mass at 16:00",
  );
  assert(
    resolveKindleMassView(after, DAYTIME).id === daytime.id,
    "Prepared daytime Masses must stay pinned after the cutoff",
  );
  assert(
    resolveKindleMassView(before, ANTICIPATED).id === anticipated.id,
    "Prepared anticipated Masses must stay pinned before the cutoff",
  );

  const beforeHtml = render(before, AUTO);
  const afterHtml = render(after, AUTO);
  assertText(beforeHtml, "Saturday Memorial", "Auto Saturday daytime render is wrong");
  assertText(afterHtml, "Anticipated Sunday", "Auto Saturday evening render is wrong");
  assertSingleMass(beforeHtml, "Saturday daytime Mass");
  assertSingleMass(afterHtml, "Saturday anticipated Mass");
}

function validateHolySaturdayResolution() {
  const daytime = makeCelebration({
    id: "holy-saturday-daytime",
    localDate: "2026-04-04",
    title: "Holy Saturday",
    rank: "Paschal Triduum",
    riteKind: "holy-saturday",
    requirements: WEEKDAY_REQUIREMENTS,
  });
  const vigil = makeCelebration({
    id: "easter-vigil",
    localDate: "2026-04-05",
    mode: "anticipated",
    title: "Easter Vigil in the Holy Night",
    rank: "Paschal Triduum",
    riteKind: "easter-vigil",
    requirements: {
      ...SUNDAY_REQUIREMENTS,
      creed: false,
      sprinklingRite: false,
    },
  });
  const data = makePageData({
    civilDate: "2026-04-04",
    civilTime: "09:00",
    daytime,
    anticipated: vigil,
  });

  for (const form of [AUTO, DAYTIME, ANTICIPATED] as const) {
    assert(
      resolveKindleMassView(data, form).id === vigil.id,
      `Holy Saturday ${form} mode must resolve to its one Mass, the Easter Vigil`,
    );
  }
  assert(
    resolveKindleMassView({ ...data, anticipated: null }, AUTO).id === daytime.id,
    "Missing Vigil data must fall back safely instead of crashing",
  );
  assertText(
    render(data, AUTO),
    "Easter Vigil in the Holy Night",
    "Holy Saturday must automatically render the Easter Vigil",
  );
}


function validateOrdinaryRiteVariations() {
  const palmHtml = render(
    makePageData({
      civilDate: "2026-03-29",
      daytime: makeCelebration({
        id: "palm-sunday",
        localDate: "2026-03-29",
        title: "Palm Sunday of the Passion of the Lord",
        riteKind: "palm-sunday",
        requirements: {
          ...SUNDAY_REQUIREMENTS,
          gloria: false,
          gospelAcclamation: "verse-before-gospel",
        },
      }),
    }),
  );
  assertText(
    palmHtml,
    "Commemoration of the Lord's Entrance",
    "Palm Sunday needs its entrance rite",
  );
  assertText(
    palmHtml,
    "Gather at the appointed place with palms",
    "Palm Sunday should follow one procession path",
  );
  for (const rejected of ["Solemn Entrance", "Simple Entrance"]) {
    assert(
      !documentText(palmHtml).includes(rejected),
      `Palm Sunday must not stack the unused ${rejected} form`,
    );
  }

  const holyThursdayHtml = render(
    makePageData({
      civilDate: "2026-04-02",
      daytime: makeCelebration({
        id: "holy-thursday",
        localDate: "2026-04-02",
        title: "Evening Mass of the Lord's Supper",
        riteKind: "holy-thursday",
        requirements: {
          ...SUNDAY_REQUIREMENTS,
          creed: false,
          sprinklingRite: false,
          gospelAcclamation: "verse-before-gospel",
        },
      }),
    }),
  );
  for (const expected of [
    "Washing of Feet",
    "Transfer of the Most Blessed Sacrament",
    "Adoration at the Place of Repose",
  ]) {
    assertText(holyThursdayHtml, expected, `Holy Thursday is missing ${expected}`);
  }
  assertSingleMass(palmHtml, "Palm Sunday");
  assertSingleMass(holyThursdayHtml, "Holy Thursday");
  assertLegacySafe(palmHtml, "Palm Sunday");
  assertLegacySafe(holyThursdayHtml, "Holy Thursday");
}


function validateSpecialRites() {
  const goodFriday = makePageData({
    civilDate: "2026-04-03",
    daytime: makeCelebration({
      id: "good-friday",
      localDate: "2026-04-03",
      title: "Friday of the Passion of the Lord",
      rank: "Paschal Triduum",
      riteKind: "good-friday",
      requirements: WEEKDAY_REQUIREMENTS,
    }),
  });
  const holySaturday = makePageData({
    civilDate: "2026-04-04",
    daytime: makeCelebration({
      id: "holy-saturday",
      localDate: "2026-04-04",
      title: "Holy Saturday",
      rank: "Paschal Triduum",
      riteKind: "holy-saturday",
      requirements: WEEKDAY_REQUIREMENTS,
    }),
  });
  const easterVigil = makePageData({
    civilDate: "2026-04-04",
    daytime: makeCelebration({
      id: "holy-saturday-for-vigil",
      localDate: "2026-04-04",
      title: "Holy Saturday",
      riteKind: "holy-saturday",
      requirements: WEEKDAY_REQUIREMENTS,
    }),
    anticipated: makeCelebration({
      id: "easter-vigil-special",
      localDate: "2026-04-05",
      mode: "anticipated",
      title: "Easter Vigil in the Holy Night",
      rank: "Paschal Triduum",
      riteKind: "easter-vigil",
      requirements: {
        ...SUNDAY_REQUIREMENTS,
        creed: false,
        sprinklingRite: false,
      },
    }),
  });

  const cases: readonly [
    keyof typeof SPECIAL_RITE_EXPECTATIONS,
    string,
    KindleMassData,
    KindleMassForm,
  ][] = [
    ["good-friday", "Good Friday", goodFriday, AUTO],
    ["holy-saturday", "Holy Saturday fallback", holySaturday, AUTO],
    ["easter-vigil", "Easter Vigil", easterVigil, AUTO],
  ];

  for (const [kind, label, data, form] of cases) {
    const html = render(data, form);
    for (const expected of SPECIAL_RITE_EXPECTATIONS[kind]) {
      assertText(html, expected, `${label} is missing ${expected}`);
    }
    if (kind === "easter-vigil") {
      for (const duplicate of [
        "Old Testament Readings and Psalms",
        "Solemn Alleluia and Gospel",
      ]) {
        assert(
          !documentText(html).includes(duplicate),
          `Easter Vigil must not repeat the ${duplicate} placeholder`,
        );
      }
    }
    assertSingleMass(html, label);
    assertLegacySafe(html, label);
    assertAnchorIntegrity(html, label);
    assertSize(html, label);
  }
}

function validateEscaping() {
  const payload = `<script>alert("x")</script><img src=x onerror="alert(1)">& Saint`;
  const celebration = makeCelebration({
    id: "escaping",
    localDate: "2026-08-03",
    title: payload,
    requirements: WEEKDAY_REQUIREMENTS,
    officialReadingsUrl: "javascript:alert(1)",
  });
  if (celebration.massLectionary) {
    celebration.massLectionary.title = payload;
    celebration.massLectionary.link = "javascript:alert(2)";
    celebration.massLectionary.copyright = payload;
    celebration.massLectionary.sections[0].title = payload;
    celebration.massLectionary.sections[0].citation = payload;
    celebration.massLectionary.sections[0].lines = [payload];
    celebration.massLectionary.sections[0].officialUrl = "javascript:alert(3)";
  }
  celebration.readingSets[0].label = payload;
  celebration.readingSets[0].description = payload;
  celebration.readingSets[0].officialUrl = "javascript:alert(4)";
  celebration.options[0].label = payload;
  celebration.options[0].description = payload;

  const html = render(makePageData({ daytime: celebration }));
  assert(html.includes("&lt;script&gt;"), "Untrusted text must be HTML escaped");
  assert(html.includes("&amp; Saint"), "Ampersands must be HTML escaped");
  assert(!/<script\b/iu.test(html), "Escaped data must not create a script element");
  assert(!/<img\b/iu.test(html), "Escaped data must not create an image element");
  assert(
    !/<[^>]+\sonerror\s*=/iu.test(html),
    "Escaped data must not create an event handler",
  );
  assert(!/href\s*=\s*["']javascript:/iu.test(html), "Unsafe links must be rejected");
  assertLegacySafe(html, "malicious fixture");
}

function validatePreparedCacheMode() {
  const data = makePageData({
    civilDate: "2026-08-02",
    daytime: makeCelebration({
      id: "prepared-cache",
      localDate: "2026-08-02",
      title: "Prepared Sunday Mass",
      requirements: SUNDAY_REQUIREMENTS,
    }),
  });
  const live = renderKindleMassHtml(data, { form: AUTO, basePath: KINDLE_PATH });
  const prepared = renderKindleMassHtml(data, {
    form: DAYTIME,
    preparedDate: "2026-08-02",
    basePath: KINDLE_PATH,
  });
  const decodedLive = decodeEntities(live);
  const decodedPrepared = decodeEntities(prepared);

  assertText(live, "Prepare for Mass", "The live page needs the browser-cache action");
  assert(
    decodedLive.includes("/mass/kindle?form=daytime&offline=2026-08-02"),
    "The prepared URL must use explicit form then the civil date",
  );
  assert(
    /class\s*=\s*["'][^"']*\bprepared-copy\b/iu.test(prepared),
    "Prepared HTML needs its stable prepared-copy marker",
  );
  assert(
    decodedPrepared.includes(
      "/mass/kindle/offline.appcache?date=2026-08-02&form=daytime",
    ),
    "Prepared HTML must attach the date-and-form cache manifest",
  );
  assertText(prepared, "Prepared Sunday Mass", "The cached copy needs the full Mass");
  assert(
    !/\bdownload(?:ed|ing)?\b/iu.test(documentText(live + prepared)),
    "The Kindle flow must never describe a file download",
  );

  for (const form of [DAYTIME, ANTICIPATED] as const) {
    const manifest = renderKindleMassCacheManifest("2026-08-02", form);
    assert(
      manifest.startsWith("CACHE MANIFEST"),
      `${form} cache manifest needs the AppCache signature`,
    );
    assert(
      manifest.includes(`/mass/kindle?form=${form}&offline=2026-08-02`),
      `${form} cache manifest must pin the canonical prepared page`,
    );
    assert(!manifest.includes("/_next/"), "The cache manifest must not pull Next assets");
    assert(!/https?:\/\//iu.test(manifest), "The cache manifest must stay same-origin");
    assert(
      Buffer.byteLength(manifest, "utf8") < 8 * 1024,
      "The cache manifest must remain tiny",
    );
  }

  assertLegacySafe(live, "live preparation page");
  assertLegacySafe(prepared, "prepared browser-cached Mass");
  assertAnchorIntegrity(prepared, "prepared browser-cached Mass");
  assertSize(prepared, "prepared browser-cached Mass");
}

function validateHeadersAndUnavailablePage() {
  const liveHeaders = getKindleMassResponseHeaders({ prepared: false });
  const preparedHeaders = getKindleMassResponseHeaders({ prepared: true });
  assertHeaderIncludes(liveHeaders, "content-type", "text/html");
  assertHeaderIncludes(liveHeaders, "content-type", "charset=utf-8");
  assertHeaderEquals(liveHeaders, "cache-control", "private,no-store,max-age=0");
  assertHeaderEquals(
    preparedHeaders,
    "cache-control",
    "private,max-age=86400,immutable",
  );
  for (const headers of [liveHeaders, preparedHeaders]) {
    assert(
      getHeader(headers, "content-disposition") === null,
      "Kindle Mass responses must never force a file download",
    );
  }

  const unavailable = renderKindleMassUnavailable();
  assert(/<!doctype\s+html/iu.test(unavailable), "The 503 body must be complete HTML");
  assert(
    /unavailable|try again|retry/iu.test(documentText(unavailable)),
    "The 503 body must provide a human-readable recovery message",
  );
  assertLegacySafe(unavailable, "503 page");
  assertAnchorIntegrity(unavailable, "503 page");
  assertSize(unavailable, "503 page");
}

function makePageData({
  anticipated = null,
  civilDate,
  civilTime = "09:00",
  daytime = makeCelebration(),
}: {
  anticipated?: Celebration | null;
  civilDate?: string;
  civilTime?: string;
  daytime?: Celebration;
} = {}): KindleMassData {
  return {
    civilDate: civilDate ?? daytime.localDate,
    civilTime,
    timezone: "America/New_York",
    daytime,
    anticipated,
  };
}

function makeCelebration({
  id = "weekday",
  liturgicalColor = "Green",
  localDate = "2026-08-03",
  mode = "daytime",
  officialReadingsUrl = "https://bible.usccb.org/bible/readings/080326",
  rank = "Weekday",
  requirements = WEEKDAY_REQUIREMENTS,
  riteKind = "ordinary-mass",
  title = "Test Celebration",
}: {
  id?: string;
  liturgicalColor?: string;
  localDate?: string;
  mode?: Celebration["mode"];
  officialReadingsUrl?: string;
  rank?: string;
  requirements?: Requirements;
  riteKind?: Celebration["riteKind"];
  title?: string;
} = {}): Celebration {
  const dailyItem = makeLectionaryItem(
    localDate,
    false,
    requirements.secondReading,
  );
  const properItem = makeLectionaryItem(
    localDate,
    true,
    requirements.secondReading,
  );
  const appointed = makeOption("appointed", false);
  const proper = makeOption("proper", true);
  const readingSets: ReadingSet[] = [
    {
      id: "set-appointed",
      sourceKind: "daily",
      label: "Appointed Readings",
      description: "The appointed readings for this celebration.",
      officialUrl: officialReadingsUrl,
      lectionaryNumber: 999,
      firstReadingCitation: "Genesis 1:1–2",
      gospelCitations: ["Matthew 5:1–2", "Luke 6:20–21"],
      item: dailyItem,
      douayOptionId: appointed.id,
    },
    {
      id: "set-proper",
      sourceKind: "proper",
      label: "Proper Readings for the Test Saint",
      description: "An alternate proper set proclaimed by the parish.",
      officialUrl: "https://bible.usccb.org/bible/readings/test-proper",
      lectionaryNumber: 1000,
      firstReadingCitation: "Wisdom 3:1–2",
      gospelCitations: ["John 15:9–12"],
      item: properItem,
      douayOptionId: proper.id,
    },
  ];
  readingSets.reverse();

  return {
    id,
    mode,
    localDate,
    dateLabel: `${localDate} fixture`,
    title,
    rank,
    season: riteKind === "ordinary-mass" ? "Ordinary Time" : "Holy Week",
    liturgicalColor,
    cycleLabel: rank === "Sunday" ? "Year A" : null,
    lectionaryNumbers: [999],
    profile: {
      id: `${id}-profile`,
      label: rank,
      requirements,
    },
    officialReadingsUrl,
    massLectionary: dailyItem,
    readingSets,
    options: [appointed, proper],
    riteKind,
  };
}

function makeLectionaryItem(
  localDate: string,
  proper: boolean,
  secondReading: boolean,
): LectionaryItem {
  const prefix = proper ? "PROPER" : "U.S. LECTIONARY";
  const sections: LectionaryItem["sections"] = [
    {
      id: `${proper ? "proper" : "daily"}-reading-one`,
      title: "Reading 1",
      citation: proper ? "Wisdom 3:1–2" : "Genesis 1:1–2",
      lines: [`${prefix} FIRST READING SENTINEL`],
      officialUrl: "https://bible.usccb.org/bible/test/1",
    },
    {
      id: `${proper ? "proper" : "daily"}-psalm`,
      title: "Responsorial Psalm",
      citation: "Psalm 145:1–2",
      lines: [`${prefix} PSALM SENTINEL`, "R. Test refrain for all the earth."],
      officialUrl: "https://bible.usccb.org/bible/test/psalm",
    },
  ];
  if (secondReading) {
    sections.push({
      id: `${proper ? "proper" : "daily"}-second-reading`,
      title: "Reading 2",
      citation: "Romans 8:1–2",
      lines: [
        proper ? "PROPER SECOND READING SENTINEL" : "SUNDAY SECOND READING SENTINEL",
      ],
      officialUrl: "https://bible.usccb.org/bible/test/2",
    });
  }
  sections.push(
    {
      id: `${proper ? "proper" : "daily"}-acclamation`,
      title: "Alleluia",
      citation: "Matthew 4:4",
      lines: ["ALLELUIA SENTINEL"],
      officialUrl: "https://bible.usccb.org/bible/test/acclamation",
    },
    {
      id: `${proper ? "proper" : "daily"}-gospel`,
      title: "Gospel",
      citation: proper ? "John 15:9–12" : "Matthew 5:1–2",
      lines: [proper ? "PROPER GOSPEL SENTINEL" : "U.S. LECTIONARY GOSPEL SENTINEL"],
      officialUrl: "https://bible.usccb.org/bible/test/gospel",
    },
    {
      id: `${proper ? "proper" : "daily"}-alternate-gospel`,
      title: "Alternate Gospel",
      citation: "Luke 6:20–21",
      lines: [`${prefix} ALTERNATE GOSPEL SENTINEL`],
      officialUrl: "https://bible.usccb.org/bible/test/alternate-gospel",
    },
    {
      id: `${proper ? "proper" : "daily"}-reading-option`,
      title: "Reading 1 option 2",
      citation: "Exodus 3:1–2",
      lines: [`${prefix} READING OPTION SENTINEL`],
      officialUrl: "https://bible.usccb.org/bible/test/reading-option",
    },
  );

  return {
    localDate,
    title: proper ? "Proper Reading Fixture" : "Daily Reading Fixture",
    link: proper
      ? "https://bible.usccb.org/bible/readings/test-proper"
      : "https://bible.usccb.org/bible/readings/test-daily",
    publishedAt: null,
    sections,
    copyright: "TEST USCCB COPYRIGHT SENTINEL",
  };
}

function makeOption(id: string, proper: boolean): LoadedOption {
  const firstReading = makeSelection({
    title: "First Reading",
    citation: proper ? "Wisdom 3:1–2" : "Genesis 1:1–2",
    bookId: proper ? "wisdom" : "genesis",
    text: proper ? "PROPER READING SENTINEL" : "DOUAY FIRST READING SENTINEL",
  });
  const responsorialPsalm = {
    ...makeSelection({
      title: "Responsorial Psalm",
      citation: "Psalm 144:1–2",
      bookId: "psalms",
      text: proper ? "PROPER PSALM SENTINEL" : "DOUAY PSALM SENTINEL",
    }),
    refrains: ["Test refrain for all the earth."],
  };
  const secondReading = makeSelection({
    title: "Second Reading",
    citation: "Romans 8:1–2",
    bookId: "romans",
    text: proper ? "PROPER SECOND READING SENTINEL" : "SUNDAY SECOND READING SENTINEL",
  });
  const gospelAcclamation = makeSelection({
    title: "Gospel Acclamation",
    citation: "Matthew 4:4",
    bookId: "matthew",
    text: proper ? "PROPER ACCLAMATION SENTINEL" : "DOUAY ACCLAMATION SENTINEL",
  });
  const gospelChoices = [
    makeSelection({
      title: "Gospel",
      citation: proper ? "John 15:9–12" : "Matthew 5:1–2",
      bookId: proper ? "john" : "matthew",
      text: proper ? "PROPER GOSPEL SENTINEL" : "DOUAY GOSPEL SENTINEL",
    }),
    makeSelection({
      title: "Gospel",
      citation: "Luke 6:20–21",
      bookId: "luke",
      text: "ALTERNATE GOSPEL SENTINEL",
    }),
  ];

  return {
    id,
    label: proper ? "Proper Douay Option" : "Appointed Douay Option",
    description: proper
      ? "The proper Douay reading alternative."
      : "The appointed Douay reading set.",
    officialUrl: proper
      ? "https://bible.usccb.org/bible/readings/test-proper"
      : "https://bible.usccb.org/bible/readings/test-daily",
    firstReading,
    responsorialPsalm,
    secondReading,
    gospelAcclamation,
    gospelChoices,
  };
}

function makeSelection({
  bookId,
  citation,
  text,
  title,
}: {
  bookId: string;
  citation: string;
  text: string;
  title: string;
}): LoadedSelection {
  const passage = {
    bookId,
    chapter: 1,
    verseStart: 1,
    verseEnd: 2,
  };
  return {
    title,
    lectionaryCitation: citation,
    displayCitation: citation,
    passages: [passage],
    segments: [
      {
        passage,
        reference: citation,
        verses: [
          { number: 1, label: "1", text },
          { number: 2, label: "2", text: `${text} CONTINUED` },
        ],
      },
    ],
  };
}

function render(data: KindleMassData, form: KindleMassForm = AUTO) {
  return renderKindleMassHtml(data, { form, basePath: KINDLE_PATH });
}

function assertText(html: string, expected: string, message: string) {
  assert(documentText(html).includes(normalizeText(expected)), message);
}

function documentText(html: string) {
  return normalizeText(
    decodeEntities(
      html
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
        .replace(/<[^>]+>/gu, " "),
    ),
  );
}

function normalizeText(value: string) {
  return value
    .replace(/[\u2018\u2019]/gu, "'")
    .replace(/[\u2013\u2014]/gu, "-")
    .replace(/\s+/gu, " ")
    .trim();
}

function decodeEntities(value: string) {
  return value
    .replace(/&#39;|&apos;/giu, "'")
    .replace(/&quot;/giu, '"')
    .replace(/&gt;/giu, ">")
    .replace(/&lt;/giu, "<")
    .replace(/&amp;/giu, "&");
}


function assertSingleMass(html: string, label: string) {
  const text = documentText(html);
  for (const rejected of [
    "Forms that may be heard",
    "Usual form",
    "Saturday Mass:",
    "Douay-Rheims",
  ]) {
    assert(!text.includes(rejected), `${label} must not contain ${rejected}`);
  }
  assert(
    !/class\s*=\s*["'][^"']*\bvariants?\b/iu.test(html),
    `${label} must not contain a variant gallery`,
  );
  assert(
    (html.match(/class="reading-set\b/gu) ?? []).length <= 1,
    `${label} must not contain multiple reading sets`,
  );
}

function assertLegacySafe(html: string, label: string) {
  const forbiddenMarkup: readonly [RegExp, string][] = [
    [/<script\b/iu, "script elements"],
    [/(?:\/|%2f)_next(?:\/|%2f)/iu, "Next.js client assets"],
    [/<svg\b/iu, "inline SVG"],
    [/<img\b/iu, "images"],
    [/<(?:iframe|object|embed|video|audio|source)\b/iu, "embedded resources"],
    [/<link\b[^>]*\brel\s*=\s*["']?stylesheet/iu, "external stylesheets"],
    [/<details\b/iu, "details disclosures"],
    [/<[^>]+\son[a-z]+\s*=/iu, "JavaScript event attributes"],
    [/href\s*=\s*["']javascript\s*:/iu, "javascript URLs"],
    [/@import\b/iu, "CSS imports"],
    [/url\s*\(/iu, "CSS resource URLs"],
  ];
  for (const [pattern, description] of forbiddenMarkup) {
    assert(!pattern.test(html), `${label} must not contain ${description}`);
  }

  const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/giu)]
    .map((match) => match[1])
    .join("\n");
  const forbiddenCss: readonly [RegExp, string][] = [
    [/display\s*:\s*(?:flex|inline-flex|grid|inline-grid)/iu, "flex/grid layout"],
    [/(?:^|[^-])var\s*\(/iu, "CSS custom properties"],
    [/color-mix\s*\(/iu, "color-mix"],
    [/(?:clamp|min|max)\s*\(/iu, "modern sizing functions"],
    [/\b\d*\.?\d+(?:dvh|svh|lvh|vh|vw|rem)\b/iu, "modern viewport/root units"],
    [/\baspect-ratio\s*:/iu, "aspect-ratio"],
    [/\b(?:backdrop-)?filter\s*:/iu, "CSS filters"],
    [/\bposition\s*:\s*(?:sticky|fixed)/iu, "sticky/fixed positioning"],
    [/\btranslate\s*:/iu, "individual transform properties"],
    [/(?:^|[;{])\s*(?:transform|transition|animation)\s*:/iu, "motion/transforms"],
    [/(?:linear|radial)-gradient\s*\(/iu, "gradients"],
    [/@(?:container|supports)\b/iu, "modern conditional CSS"],
    [/:\s*(?:has|is|where)\s*\(/iu, "modern selector functions"],
  ];
  for (const [pattern, description] of forbiddenCss) {
    assert(!pattern.test(styles), `${label} must not use ${description}`);
  }
}

function assertAnchorIntegrity(html: string, label: string) {
  const ids = [...html.matchAll(/\sid\s*=\s*["']([^"']+)["']/giu)].map(
    (match) => decodeEntities(match[1]),
  );
  assert(ids.length === new Set(ids).size, `${label} contains duplicate element IDs`);
  const idSet = new Set(ids);
  const hashTargets = [
    ...html.matchAll(/\shref\s*=\s*["']#([^"']+)["']/giu),
  ].map((match) => decodeEntities(match[1]));
  for (const target of hashTargets) {
    assert(idSet.has(target), `${label} links to the missing #${target} anchor`);
  }
}

function assertSize(html: string, label: string) {
  const bytes = Buffer.byteLength(html, "utf8");
  assert(
    bytes <= MAX_DOCUMENT_BYTES,
    `${label} is ${bytes} bytes; the Kindle ceiling is ${MAX_DOCUMENT_BYTES}`,
  );
}

function assertHeaderIncludes(headers: unknown, name: string, expected: string) {
  const value = getHeader(headers, name);
  assert(
    value?.toLowerCase().includes(expected.toLowerCase()),
    `Header ${name} must include ${expected}; found ${value ?? "nothing"}`,
  );
}

function assertHeaderEquals(headers: unknown, name: string, expected: string) {
  const value = getHeader(headers, name)?.replace(/\s+/gu, "").toLowerCase();
  assert(
    value === expected.toLowerCase(),
    `Header ${name} must equal ${expected}; found ${value ?? "nothing"}`,
  );
}

function getHeader(headers: unknown, name: string) {
  if (headers instanceof Headers) {
    return headers.get(name);
  }
  if (!headers || typeof headers !== "object") {
    return null;
  }
  const entry = Object.entries(headers as Record<string, unknown>).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  );
  return typeof entry?.[1] === "string" ? entry[1] : null;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

main();
