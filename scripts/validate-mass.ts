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
  advanceMassSpeechEvidence,
  createMassSpeechBridgeText,
  createMassSpeechEvidenceState,
  findMassSpeechMatch,
  findPreparedMassSpeechMatch,
  normalizeMassSpeech,
  prepareMassSpeechCandidates,
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
import {
  getCompatibleMassProperTitleAliases,
  getMassProperFormKind,
  getMassPropersForReadingSet,
  type MassCelebrationPropers,
} from "../src/lib/mass-propers";
import {
  getOrdinaryTimeWeekNumber,
  parseNamedMassPrefaceSourceDocument,
  parseMassPrefaceSourceDocument,
  parseMassPrefaceSourceReferences,
  parseMassPropersDocument,
} from "../src/lib/mass-propers-parser";
import {
  canonicalTrustedIndexedHtmlUrl,
  discoverIndexedMassProperSource,
  listIndexedMassProperSources,
  planIndexedMassProperResolution,
  sourceDocumentTitleSimilarity,
  sourceTitleSimilarity,
} from "../src/lib/mass-propers-source";
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
  validateMassPropersParser();
  validateMassProperSourceTrust();
  validateMassProperReadingSetSelection();
  validateMassSpeechFollowing();
  validateMassSpeechEvidence();
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

function validateMassPropersParser() {
  assert(
    getOrdinaryTimeWeekNumber("Ninth Sunday in Ordinary Time") === 9 &&
      getOrdinaryTimeWeekNumber("12th Sunday in Ordinary Time") === 12 &&
      getOrdinaryTimeWeekNumber(
        "Wednesday of the Thirty-fourth Week in Ordinary Time",
      ) === 34,
    "Ordinary Time titles must resolve both word and numeric week ordinals",
  );
  assert(
    getOrdinaryTimeWeekNumber("35th Sunday in Ordinary Time") === null &&
      getOrdinaryTimeWeekNumber("A Celebration Outside Ordinary Time") ===
        null,
    "Ordinary Time week parsing must reject impossible or unrelated titles",
  );

  const fixture = [
    makeSyntheticProperWeek(8, "earlier"),
    makeSyntheticProperWeek(9, "selected"),
    makeSyntheticProperWeek(10, "later"),
  ].join("\n");
  const propers = parseMassPropersDocument({
    html: fixture,
    localDate: "fixture-date",
    sourceLabel: "Synthetic source",
    sourceUrl: "https://example.test/synthetic-missal",
    title: "Ninth Sunday in Ordinary Time",
    titleAliases: ["9th Sunday in Ordinary Time"],
  });

  assert(propers, "A complete synthetic proper document must parse");
  assert(
    propers.id === "fixture-date-ninth-sunday-in-ordinary-time" &&
      propers.sourceLabel === "Synthetic source" &&
      propers.sourceUrl === "https://example.test/synthetic-missal",
    "Parsed propers must preserve dynamic celebration and source metadata",
  );
  assert(
    propers.entranceAntiphons.length === 1 &&
      propers.entranceAntiphons[0]?.citation === "Example 9:1" &&
      propers.entranceAntiphons[0]?.text.includes("selected") &&
      !propers.entranceAntiphons[0]?.text.includes("earlier") &&
      !propers.entranceAntiphons[0]?.text.includes("later"),
    "The parser must scope content to the dynamically selected week anchor",
  );
  assert(
    propers.collects.length === 1 &&
      propers.collects[0]?.includes("selected") &&
      propers.collects[0]?.endsWith("God, for ever and ever.") &&
      !propers.collects[0]?.includes("one God"),
    "The parser must collect a complete prayer and normalize its current conclusion",
  );
  assert(
    propers.prayersOverOfferings.length === 1 &&
      propers.communionAntiphons.length === 2 &&
      propers.prayersAfterCommunion.length === 1 &&
      JSON.stringify(propers.prefaceOptions) ===
        JSON.stringify([{ label: "PREFACE IX", text: null }]),
    "The parser must retain every synthetic proper slot and selectable option in sequence",
  );
  const prefaceReferences = parseMassPrefaceSourceReferences({
    html: fixture,
    prefaceOptions: propers.prefaceOptions,
    sourceUrl: "https://example.test/synthetic-missal",
  });
  assert(
    prefaceReferences.length === 1 &&
      prefaceReferences[0]?.label === "PREFACE IX" &&
      prefaceReferences[0]?.sourceUrl ===
        "https://example.test/prefaces#fixture-sundays",
    "The parser must retain one unambiguous source-provided Preface category reference",
  );
  const prefaceSource = makeSyntheticPrefaceSource();
  const expandedPrefaces = parseMassPrefaceSourceDocument({
    html: prefaceSource,
    reference: prefaceReferences[0],
  });
  assert(
    expandedPrefaces.length === 2 &&
      expandedPrefaces[0]?.label ===
        "PREFACE I OF FIXTURE SUNDAYS · First invented theme" &&
      expandedPrefaces[1]?.label ===
        "PREFACE II OF FIXTURE SUNDAYS · Second invented theme" &&
      expandedPrefaces.every(
        (option) =>
          option.text &&
          !option.text.includes("discarded synthetic latin") &&
          !option.text.includes("Holy, Holy, Holy"),
      ),
    "A source category must expand into ordered labels and spoken Preface bodies without Latin or the Sanctus",
  );
  const directPreface = parseMassPrefaceSourceDocument({
    html: prefaceSource,
    reference: {
      label: "Direct synthetic option",
      sourceUrl: "https://example.test/prefaces#fixture-sundays2",
    },
  });
  assert(
    directPreface.length === 1 &&
      directPreface[0]?.label.startsWith("PREFACE II"),
    "A numbered source fragment must resolve only its exact Preface option",
  );
  assert(
    parseMassPrefaceSourceDocument({
      html: prefaceSource.replaceAll("Holy, Holy, Holy", "OMITTED ACCLAMATION"),
      reference: prefaceReferences[0],
    }).length === 0,
    "Preface enrichment must fail closed when spoken option boundaries are incomplete",
  );
  const namedPreface = parseNamedMassPrefaceSourceDocument({
    html: prefaceSource,
    label: "PREFACE II OF FIXTURE SUNDAYS",
  });
  const canonicallyNamedPreface = parseNamedMassPrefaceSourceDocument({
    html: prefaceSource,
    label: "PREFACE OF THE FIXTURE SUNDAYS II OF THE LORD",
  });
  assert(
    namedPreface.length === 1 &&
      namedPreface[0]?.label ===
        "PREFACE II OF FIXTURE SUNDAYS · Second invented theme" &&
      Boolean(namedPreface[0]?.text?.includes("second invented Preface body")) &&
      canonicallyNamedPreface.length === 1 &&
      canonicallyNamedPreface[0]?.label === namedPreface[0]?.label &&
      parseNamedMassPrefaceSourceDocument({
        html: `${prefaceSource}\n${prefaceSource}`,
        label: "PREFACE II OF FIXTURE SUNDAYS",
      }).length === 0,
    "An unlinked appointed Preface must resolve by one canonical central heading despite structural word order and fail closed when that identity is duplicated",
  );

  const inlineFixture = makeSyntheticInlineProperWeek();
  const inlinePropers = parseMassPropersDocument({
    html: inlineFixture,
    localDate: "inline-fixture-date",
    sourceLabel: "Synthetic inline source",
    sourceUrl: "https://example.test/synthetic-inline-missal",
    title: "12th Sunday in Ordinary Time",
  });
  const expectedInlineText =
    "The inline invented Preface body preserves every source word and punctuation mark while providing enough synthetic language for bounded extraction. Its second entirely fictional sentence completes the source body before inviting the separate assembly acclamation:";
  assert(
    inlinePropers?.prefaceOptions.length === 1 &&
      inlinePropers.prefaceOptions[0]?.label ===
        "PREFACE · Invented inline theme" &&
      inlinePropers.prefaceOptions[0]?.text === expectedInlineText &&
      !JSON.stringify(inlinePropers.prefaceOptions).includes(
        "discarded inline latin",
      ) &&
      !JSON.stringify(inlinePropers.prefaceOptions).includes(
        "The Lord be with you",
      ) &&
      !JSON.stringify(inlinePropers.prefaceOptions).includes(
        "Holy, Holy, Holy",
      ),
    "A complete inline Preface must preserve only its exact English body between the source dialogue and Sanctus",
  );
  const malformedInline = parseMassPropersDocument({
    html: inlineFixture.replace(
      "R. It is right and just.",
      "MALFORMED FINAL RESPONSE",
    ),
    localDate: "inline-fixture-date",
    sourceLabel: "Synthetic inline source",
    sourceUrl: "https://example.test/synthetic-inline-missal",
    title: "12th Sunday in Ordinary Time",
  });
  assert(
    malformedInline?.prefaceOptions.length === 1 &&
      malformedInline.prefaceOptions[0]?.text === null,
    "A malformed inline Preface dialogue must remain unresolved instead of exposing a partial body",
  );
  const ambiguousInline = parseMassPropersDocument({
    html: inlineFixture.replace(
      "<p>Holy, Holy, Holy synthetic assembly acclamation.</p>",
      "<p>Holy, Holy, Holy synthetic assembly acclamation.</p><p>Holy, Holy, Holy duplicate boundary.</p>",
    ),
    localDate: "inline-fixture-date",
    sourceLabel: "Synthetic inline source",
    sourceUrl: "https://example.test/synthetic-inline-missal",
    title: "12th Sunday in Ordinary Time",
  });
  assert(
    ambiguousInline?.prefaceOptions.length === 1 &&
      ambiguousInline.prefaceOptions[0]?.text === null,
    "An ambiguous inline Preface boundary must fail closed",
  );

  const splitHeadingFixture = [
    makeSyntheticCelebrationBlock(
      "split-monday",
      `<a name="split-monday"></a><h2>MONDAY</h2><p>In the Second Week of the Invented Season</p>`,
      "Split 1",
    ),
    makeSyntheticCelebrationBlock(
      "split-tuesday",
      `<a name="split-tuesday"></a><h2>TUESDAY</h2><p>In the Second Week of the Invented Season</p>`,
      "Split 2",
    ),
  ].join("\n");
  const splitHeadingPropers = parseMassPropersDocument({
    html: splitHeadingFixture,
    localDate: "fixture-date",
    sourceLabel: "Synthetic split-heading source",
    sourceUrl: "https://example.test/synthetic-split-headings",
    title: "Seasonal Weekday",
    titleAliases: ["Tuesday of the Second Week of the Invented Season"],
  });
  assert(
    splitHeadingPropers?.collects[0]?.includes("split-tuesday") &&
      !JSON.stringify(splitHeadingPropers).includes("split-monday"),
    "Accumulated source heading lines and a preserved calendar alias must uniquely select the appointed weekday",
  );

  const multiFormFixture = makeSyntheticMultiFormCelebration();
  const daytimeForm = parseMassPropersDocument({
    html: multiFormFixture,
    localDate: "2030-04-12",
    massForm: "daytime",
    sourceLabel: "Synthetic multi-form source",
    sourceUrl: "https://example.test/synthetic-multi-form",
    title: "The Festival of the Radiant Promise (Invented Observance)",
  });
  const anticipatedForm = parseMassPropersDocument({
    html: multiFormFixture,
    localDate: "2030-04-12",
    massForm: "anticipated",
    sourceLabel: "Synthetic multi-form source",
    sourceUrl: "https://example.test/synthetic-multi-form",
    title: "The Festival of the Radiant Promise (Invented Observance)",
  });
  const nightForm = parseMassPropersDocument({
    html: multiFormFixture,
    localDate: "2030-04-12",
    massForm: "daytime",
    sourceLabel: "Synthetic multi-form source",
    sourceUrl: "https://example.test/synthetic-multi-form",
    title: "The Festival of the Radiant Promise — Mass during the Night",
    titleAliases: [
      "The Festival of the Radiant Promise (Invented Observance)",
    ],
  });
  assert(
    daytimeForm?.collects[0]?.includes("festival-day") &&
      anticipatedForm?.collects[0]?.includes("festival-vigil") &&
      nightForm?.collects[0]?.includes("festival-night") &&
      !JSON.stringify(daytimeForm).includes("later-similar") &&
      !JSON.stringify(anticipatedForm).includes("later-similar") &&
      !JSON.stringify(nightForm).includes("later-similar"),
    "A parent celebration must carry its identity into its selected form without drifting into a later similarly titled celebration",
  );
  assert(
    parseMassPropersDocument({
      html: multiFormFixture,
      localDate: "2030-04-12",
      sourceLabel: "Synthetic multi-form source",
      sourceUrl: "https://example.test/synthetic-multi-form",
      title: "The Festival of the Radiant Promise (Invented Observance)",
    }) === null &&
      parseMassPropersDocument({
        html: multiFormFixture.replace(
          "At the Mass during the Night",
          "At the Vigil Mass — Alternate Form",
        ),
        localDate: "2030-04-12",
        massForm: "anticipated",
        sourceLabel: "Synthetic ambiguous-form source",
        sourceUrl: "https://example.test/synthetic-ambiguous-form",
        title: "The Festival of the Radiant Promise (Invented Observance)",
      }) === null,
    "A multi-form celebration must fail closed when the requested form is absent or ambiguous",
  );
  const fragmentScopedForm = parseMassPropersDocument({
    html: multiFormFixture,
    localDate: "2030-04-12",
    massForm: "daytime",
    sourceLabel: "Synthetic fragment source",
    sourceUrl: "https://example.test/synthetic-multi-form#festival",
    title: "The Festival of the Radiant Promise (Invented Observance)",
  });
  assert(
    fragmentScopedForm?.collects[0]?.includes("festival-day") &&
      !JSON.stringify(fragmentScopedForm).includes("later-similar") &&
      parseMassPropersDocument({
        html: multiFormFixture,
        localDate: "2030-04-12",
        massForm: "daytime",
        sourceLabel: "Synthetic missing-fragment source",
        sourceUrl: "https://example.test/synthetic-multi-form#missing",
        title: "The Festival of the Radiant Promise (Invented Observance)",
      }) === null &&
      parseMassPropersDocument({
        html: multiFormFixture.replace(
          '<a name="festival"></a>',
          '<a name="festival"></a><a name="festival"></a>',
        ),
        localDate: "2030-04-12",
        massForm: "daytime",
        sourceLabel: "Synthetic duplicate-fragment source",
        sourceUrl: "https://example.test/synthetic-multi-form#festival",
        title: "The Festival of the Radiant Promise (Invented Observance)",
      }) === null,
    "A source fragment must resolve one named parent section, retain its child forms, and fail closed when the anchor is missing or duplicated",
  );

  const numberedCategoryFixture = makeSyntheticNumberedCategoryCelebration();
  const numberedCategoryPropers = parseMassPropersDocument({
    html: numberedCategoryFixture,
    localDate: "2030-04-13",
    massForm: "daytime",
    sourceLabel: "Synthetic numbered category source",
    sourceUrl: "https://example.test/synthetic-category#sacred-week",
    title: "Sunday of the Invented Procession",
    titleAliases: ["Sacred Week Sunday"],
  });
  assert(
    numberedCategoryPropers?.entranceAntiphons.length === 2 &&
      numberedCategoryPropers.entranceAntiphons[1]?.citation ===
        "1 Cor 10:16" &&
      numberedCategoryPropers.collects.length === 1 &&
      numberedCategoryPropers.prayersOverOfferings.length === 1 &&
      numberedCategoryPropers.communionAntiphons.length === 1 &&
      numberedCategoryPropers.communionAntiphons[0]?.citation ===
        "1 Cor 11:24-25" &&
      numberedCategoryPropers.prayersAfterCommunion.length === 1 &&
      numberedCategoryPropers.prefaceOptions[0]?.label === "PREFACE" &&
      Boolean(numberedCategoryPropers.prefaceOptions[0]?.text) &&
      !JSON.stringify(numberedCategoryPropers).includes(
        "discarded procession rubric",
      ) &&
      !JSON.stringify(numberedCategoryPropers).includes(
        "discarded numbered preface rubric",
      ) &&
      !JSON.stringify(numberedCategoryPropers).includes("later-child"),
    "A category fragment must retain nested celebrations, group repeated Entrance forms around their shared Collect, preserve numbered-book citations, and stop appointed slots at numbered rubrics",
  );

  const appointedDateFixture = [
    makeSyntheticCelebrationBlock(
      "appointed-seventeenth",
      `<a name="appointed-17"></a><h2>APRIL 17</h2>`,
      "Date 17",
    ),
    makeSyntheticCelebrationBlock(
      "appointed-eighteenth",
      `<a name="appointed-18"></a><h2>APRIL 18</h2>`,
      "Date 18",
    ),
  ].join("\n");
  const appointedDate = parseMassPropersDocument({
    html: appointedDateFixture,
    localDate: "2030-04-18",
    sourceLabel: "Synthetic appointed-date source",
    sourceUrl: "https://example.test/synthetic-appointed-dates",
    title: "Seasonal Weekday",
  });
  assert(
    appointedDate?.collects[0]?.includes("appointed-eighteenth") &&
      !JSON.stringify(appointedDate).includes("appointed-seventeenth"),
    "An exact local date must uniquely select a date-appointed source block when the display title is generic",
  );

  const finalWeekFixture = `${makeSyntheticProperWeek(34, "final-week")}\n<footer>${makeSyntheticCelebrationBlock(
    "footer-decoy",
    "<h2>34th Sunday in Ordinary Time</h2>",
    "Footer 34",
  )}</footer>`;
  const finalWeekPropers = parseMassPropersDocument({
    html: finalWeekFixture,
    localDate: "fixture-date",
    sourceLabel: "Synthetic final-week source",
    sourceUrl: "https://example.test/synthetic-final-week",
    title: "34th Sunday in Ordinary Time",
  });
  assert(
    finalWeekPropers?.collects[0]?.includes("final-week") &&
      !JSON.stringify(finalWeekPropers).includes("footer-decoy"),
    "The final Ordinary Time week must end at the structural document footer instead of absorbing trailing content",
  );
  const collectOnlyFixture = `<h1>MEMORIAL OF THE INVENTED WITNESS</h1>
<b>COLLECT</b>
<p>Gather the invented witnesses in steadfast hope through Christ our Lord.</p>`;
  const collectOnlyPropers = parseMassPropersDocument({
    html: collectOnlyFixture,
    localDate: "fixture-date",
    sourceLabel: "Synthetic Collect-only source",
    sourceUrl: "https://example.test/synthetic-collect-only",
    title: "Memorial of the Invented Witness",
  });
  assert(
    collectOnlyPropers?.entranceAntiphons.length === 0 &&
      collectOnlyPropers.collects.length === 1 &&
      collectOnlyPropers.prayersOverOfferings.length === 0 &&
      parseMassPropersDocument({
        html: `${collectOnlyFixture}\n${collectOnlyFixture.replace("WITNESS", "HERALD")}`,
        localDate: "fixture-date",
        sourceLabel: "Synthetic ambiguous Collect-only source",
        sourceUrl: "https://example.test/synthetic-collect-only-ambiguous",
        title: "Memorial of the Invented Witness",
      }) === null,
    "A uniquely identified Collect-only document may return that appointed slot, while multiple unbounded Collects fail closed",
  );
  assert(
    !JSON.stringify(propers).includes("discarded lowercase translation"),
    "Hidden translation spans must not leak into parsed spoken content",
  );
  const partialPropers = parseMassPropersDocument({
    html: fixture.replace(
      /<b>PRAYER AFTER COMMUNION<\/b>\s*<p>Send the [^<]+<\/p>/gu,
      "",
    ),
    localDate: "fixture-date",
    sourceLabel: "Synthetic source",
    sourceUrl: "https://example.test/incomplete",
    title: "Ninth Sunday in Ordinary Time",
    titleAliases: ["9th Sunday in Ordinary Time"],
  });
  assert(
    partialPropers !== null &&
      partialPropers.collects.length === 1 &&
      partialPropers.prayersAfterCommunion.length === 0,
    "An incomplete proper source may retain appointed slots but must leave the absent slot empty instead of inventing content",
  );
}

function validateMassProperSourceTrust() {
  const indexUrl =
    "https://www.liturgies.net/Liturgies/Catholic/roman_missal/index.htm";
  const seasonalDocument =
    "https://www.liturgies.net/Liturgies/Catholic/roman_missal/inventedseason.htm";
  const seasonalFragment = `${seasonalDocument}#invented-festival`;
  const syntheticIndex = `<a href="http://www.liturgies.net/Liturgies/Catholic/roman_missal/inventedseason.htm"><img alt="Invented Season"></a>
<a href="http://www.liturgies.net/Liturgies/Catholic/roman_missal/inventedseason.htm#invented-festival"><img alt="Invented Festival"></a>
<a href="/Liturgies/Catholic/roman_missal/invented-hidden-festival-mass.htm"><img src="https://untrusted.example/deceptive-label/logo.png"></a>
<a href="/saints/invented-witness/mass.htm">Invented Witness of the Azure Lantern</a>
<a href="/saints/witness/mass.htm">Witness</a>
<a href="https://untrusted.example/invented.htm">Invented Festival</a>`;
  const indexedSources = listIndexedMassProperSources({
    indexHtml: syntheticIndex,
    indexUrl,
  });
  assert(
    indexedSources.some(
      (candidate) =>
        candidate.label === "Invented Festival" &&
        candidate.sourceUrl === seasonalFragment,
    ) &&
      indexedSources.some(
        (candidate) =>
          candidate.label === "Invented Hidden Festival Mass" &&
          candidate.sourceUrl ===
            "https://www.liturgies.net/Liturgies/Catholic/roman_missal/invented-hidden-festival-mass.htm",
    ) &&
      !indexedSources.some((candidate) =>
        candidate.sourceUrl.includes("untrusted.example"),
      ),
    "Trusted index parsing must retain image-alt labels, recover an image-only link label from generic URL path metadata, and reject a different host",
  );
  const fragmentCandidate = discoverIndexedMassProperSource({
    excludedSourceUrls: [seasonalDocument],
    indexHtml: syntheticIndex,
    indexUrl,
    titles: ["Invented Festival"],
  });
  assert(
    fragmentCandidate?.sourceUrl === seasonalFragment,
    "Excluding a generic no-fragment hub link must not discard a strong exact fragment from that trusted document",
  );
  const hiddenImageCandidate = discoverIndexedMassProperSource({
    indexHtml: syntheticIndex,
    indexUrl,
    titles: ["Invented Hidden Festival"],
  });
  assert(
    hiddenImageCandidate?.sourceUrl ===
      "https://www.liturgies.net/Liturgies/Catholic/roman_missal/invented-hidden-festival-mass.htm" &&
      hiddenImageCandidate.label === "Invented Hidden Festival Mass",
    "An image-only trusted index link must remain dynamically discoverable from its trusted href path without accepting image-host identity metadata or a celebration-specific source mapping",
  );
  const preferredPentecost = {
    label: "Invented Pentecost",
    score: 1,
    sourceUrl:
      "https://www.liturgies.net/Liturgies/Catholic/roman_missal/invented-pentecost.htm",
  };
  const unrelatedFallback = {
    label: "Invented Easter hub",
    score: 0,
    sourceUrl:
      "https://www.liturgies.net/Liturgies/Catholic/roman_missal/invented-easter.htm",
  };
  const preferredPlan = planIndexedMassProperResolution({
    contextFallbackCandidates: [unrelatedFallback],
    preferredCandidates: [preferredPentecost],
  });
  const unknownPlan = planIndexedMassProperResolution({
    contextFallbackCandidates: [unrelatedFallback],
    preferredCandidates: [],
  });
  assert(
    preferredPlan.candidates.length === 1 &&
      preferredPlan.candidates[0]?.sourceUrl ===
        preferredPentecost.sourceUrl &&
      !preferredPlan.requireFragmentContext &&
      unknownPlan.candidates.length === 1 &&
      unknownPlan.candidates[0]?.sourceUrl === unrelatedFallback.sourceUrl &&
      unknownPlan.requireFragmentContext,
    "A failed direct or seasonal candidate must never fall through to another celebration; only a no-preference lookup may attempt a fragment-verified context source",
  );
  assert(
    canonicalTrustedIndexedHtmlUrl(
      "http://www.liturgies.net/saints/invented/mass.htm#proper",
      indexUrl,
    ) === "https://www.liturgies.net/saints/invented/mass.htm#proper" &&
      canonicalTrustedIndexedHtmlUrl(
        "https://www.liturgies.net:444/saints/invented/mass.htm",
        indexUrl,
      ) === null &&
      canonicalTrustedIndexedHtmlUrl(
        "https://www.liturgies.net/saints/invented/mass.htm?variant=wrong",
        indexUrl,
      ) === null &&
      canonicalTrustedIndexedHtmlUrl(
        "https://untrusted.example/saints/invented/mass.htm",
        indexUrl,
      ) === null &&
      canonicalTrustedIndexedHtmlUrl(
        "https://www.liturgies.net/saints/invented/audio.mp3",
        indexUrl,
      ) === null,
    "Indexed source trust must enforce HTTPS upgrade, exact host, no port/query, and an HTML path",
  );
  const ambiguous = discoverIndexedMassProperSource({
    indexHtml: `<a href="/saints/first/mass.htm">Invented Herald</a><a href="/saints/second/mass.htm">Invented Herald</a>`,
    indexUrl,
    titles: ["Invented Herald"],
  });
  assert(
    ambiguous === null,
    "Two equally strong indexed sources must fail closed instead of selecting by link order",
  );
  const requestedTitle = "Invented Witness of the Azure Lantern";
  assert(
    sourceTitleSimilarity(requestedTitle, "Witness") < 0.6 &&
      sourceDocumentTitleSimilarity({
        html: "<title>Witness - Roman Missal</title>",
        titles: [requestedTitle],
      }) < 0.6 &&
      sourceDocumentTitleSimilarity({
        html: "<title>Invented Witness of the Azure Lantern - Roman Missal</title>",
        titles: [requestedTitle],
      }) >= 0.99,
    "A one-token subset must not pass strong source identity, while one unique exact-ish document title must pass",
  );
}

function validateMassProperReadingSetSelection() {
  const fallback = {
    id: "synthetic-fallback",
    entranceAntiphons: [],
    collects: [],
    prayersOverOfferings: [],
    communionAntiphons: [],
    prayersAfterCommunion: [],
    prefaceOptions: [],
    rightsNotice: "Synthetic fixture rights",
    sourceLabel: "Synthetic fixture source",
    sourceUrl: "https://example.test/synthetic-fallback",
  } satisfies MassCelebrationPropers;
  const forms = [
    {
      form: "vigil",
      id: "vigil",
      title: "The Synthetic Festival — At the Vigil Mass",
    },
    {
      form: "night",
      id: "night",
      title: "The Synthetic Festival — At the Mass during the Night",
    },
    {
      form: "dawn",
      id: "dawn",
      title: "The Synthetic Festival — At the Mass at Dawn",
    },
    {
      form: "day",
      id: "day",
      title: "The Synthetic Festival — At the Mass during the Day",
    },
  ] as const;
  const titles = forms.map(({ title }) => title);
  const propersByReadingSetId = Object.fromEntries(
    forms.map(({ id }) => [
      id,
      { ...fallback, id: `synthetic-${id}` },
    ]),
  );

  for (const { form, id, title } of forms) {
    const aliases = getCompatibleMassProperTitleAliases(title, [
      "The Synthetic Festival",
      ...titles,
    ]);
    const selected = getMassPropersForReadingSet({
      fallback,
      propersByReadingSetId,
      readingSetId: id,
    });
    assert(
      getMassProperFormKind(title) === form &&
        aliases.length === 1 &&
        aliases[0] === "The Synthetic Festival" &&
        selected?.id === `synthetic-${id}`,
      `The ${form} reading set must retain only its own explicit Mass form and select its coordinated propers`,
    );
  }

  assert(
    getMassPropersForReadingSet({
      fallback,
      propersByReadingSetId: { ...propersByReadingSetId, unavailable: null },
      readingSetId: "unavailable",
    }) === null &&
      getMassPropersForReadingSet({
        fallback,
        propersByReadingSetId,
        readingSetId: "legacy-missing-key",
      }) === fallback,
    "An explicit missing proper must not leak another set's text, while an absent legacy key keeps the single-set fallback",
  );
}

function makeSyntheticProperWeek(week: number, marker: string) {
  return `<a name="week${week}"></a>
<h2>${week}${getNumericOrdinalSuffix(week)} Sunday in Ordinary Time</h2>
${makeSyntheticProperBody(marker, `Example ${week}`)}`;
}

function makeSyntheticCelebrationBlock(
  marker: string,
  heading: string,
  citationPrefix: string,
) {
  return `${heading}
${makeSyntheticProperBody(marker, citationPrefix)}`;
}

function makeSyntheticProperBody(marker: string, citationPrefix: string) {
  return `<b><font size="-1">ENTRANCE</font> ANTIPHON</b>
<p><i>${citationPrefix}:1</i></p>
<p>The ${marker} entrance passage carries clear synthetic words.</p>
<font size="-1">discarded lowercase translation</font>
<b>COLLECT</b>
<p>Gather the ${marker} assembly in wisdom, one God, for ever and ever.</p>
<b>READINGS</b>
<b>PRAYER OVER THE OFFERINGS</b>
<p>Receive the ${marker} symbolic gifts through Christ our Lord.</p>
<p><a href="http://example.test/prefaces#fixture-sundays">PREFACE IX</a></p>
<b>COMMUNION ANTIPHON</b>
<p><i>${citationPrefix}:2</i></p>
<p>The ${marker} first table passage uses invented fixture language.</p>
<p>Or:</p>
<p><i>${citationPrefix}:3</i></p>
<p>The ${marker} second table passage is another fixture option.</p>
<b>PRAYER AFTER COMMUNION</b>
<p>Send the ${marker} assembly to serve through Christ our Lord.</p>`;
}

function getNumericOrdinalSuffix(value: number) {
  const remainder100 = value % 100;
  if (remainder100 >= 11 && remainder100 <= 13) {
    return "th";
  }
  return value % 10 === 1
    ? "st"
    : value % 10 === 2
      ? "nd"
      : value % 10 === 3
        ? "rd"
        : "th";
}

function makeSyntheticInlineProperWeek() {
  return makeSyntheticProperWeek(12, "inline").replace(
    '<p><a href="http://example.test/prefaces#fixture-sundays">PREFACE IX</a></p>',
    `<b>P<font size="-1">REFACE</font></b>&nbsp;<i>Invented inline theme</i>
<font size="-1">discarded inline latin words</font>
<p>V. The synthetic leader opens the dialogue.</p>
<p>R. The synthetic assembly answers.</p>
<p>V. The synthetic leader continues.</p>
<p>R. The synthetic assembly responds.</p>
<p>V. The synthetic leader offers thanks.</p>
<p>R. It is right and just.</p>
<p>The inline invented Preface body preserves every source word and punctuation mark while providing enough synthetic language for bounded extraction.</p>
<p>Its second entirely fictional sentence completes the source body before inviting the separate assembly acclamation:</p>
<p>Holy, Holy, Holy synthetic assembly acclamation.</p>
<i>When the invented option is used, the proper synthetic insert is said.</i>`,
  );
}

function makeSyntheticMultiFormCelebration() {
  return `<a name="festival"></a>
<p>APRIL 12</p>
<h1>THE FESTIVAL OF THE RADIANT PROMISE</h1>
<h2>(INVENTED OBSERVANCE)</h2>
${makeSyntheticCelebrationBlock("festival-vigil", `<a name="festival-vigil"></a><h3>At the Vigil Mass</h3>`, "Form 1")}
${makeSyntheticCelebrationBlock("festival-night", `<a name="festival-night"></a><h3>At the Mass during the Night</h3>`, "Form 2")}
${makeSyntheticCelebrationBlock("festival-dawn", `<a name="festival-dawn"></a><h3>At the Mass at Dawn</h3>`, "Form 3")}
${makeSyntheticCelebrationBlock("festival-day", `<a name="festival-day"></a><h3>At the Mass during the Day</h3>`, "Form 4")}
<a name="later-festival"></a>
<p>APRIL 19</p>
<p>Octave Day of the Festival of the Radiant Promise (Invented Observance)</p>
<h1>THE FESTIVAL OF THE LATER GUARDIAN</h1>
${makeSyntheticCelebrationBlock("later-similar", "", "Later 1")}`;
}

function makeSyntheticNumberedCategoryCelebration() {
  const processionRubrics = Array.from(
    { length: 48 },
    (_, index) => `<p>Invented procession direction ${index + 1}.</p>`,
  ).join("\n");
  return `<a name="sacred-week"></a>
<h1>THE INVENTED SACRED WEEK</h1>
<a name="procession-sunday"></a>
<h2>SUNDAY OF THE INVENTED PROCESSION</h2>
<a name="cycle-a"></a>
${processionRubrics}
<b>1. ENTRANCE ANTIPHON</b>
<p>Ps 1:1</p>
<p>The first invented entrance option announces a joyful procession.</p>
<b>2. ENTRANCE ANTIPHON</b>
<p>1 Cor 10:16</p>
<p>The second invented entrance option accompanies the same celebration.</p>
<h3>At the Mass</h3>
<p>3. This discarded procession rubric must not become antiphon text.</p>
<b>4. COLLECT</b>
<p>Gather the processional assembly in wisdom, through Christ our Lord.</p>
<b>READINGS</b>
<b>5. PRAYER OVER THE OFFERINGS</b>
<p>Receive the processional symbolic gifts through Christ our Lord.</p>
<b>6. PREFACE</b>
<p>V. The synthetic leader opens the dialogue.</p>
<p>R. The synthetic assembly answers.</p>
<p>V. The synthetic leader continues.</p>
<p>R. The synthetic assembly responds.</p>
<p>V. The synthetic leader offers thanks.</p>
<p>R. It is right and just.</p>
<p>This numbered synthetic Preface body contains enough entirely invented words to verify that its exact source boundary remains intact before the following numbered rubric begins.</p>
<p>Holy, Holy, Holy synthetic assembly acclamation.</p>
<p>7. This discarded numbered preface rubric must not become Preface text.</p>
<b>8. COMMUNION ANTIPHON</b>
<p>1 Cor 11:24-25</p>
<p>The numbered-book citation remains attached to this invented table passage.</p>
<p>9. This discarded Communion rubric must not become antiphon text.</p>
<b>10. PRAYER AFTER COMMUNION</b>
<p>Send the processional assembly to serve through Christ our Lord.</p>
<p>11. This discarded post-Communion rubric ends the proper.</p>
<a name="later-child"></a>
<h2>SACRED WEEK SUNDAY</h2>
${makeSyntheticProperBody("later-child", "Later child")}`;
}

function makeSyntheticPrefaceSource() {
  return `<html><body>
<a name="fixture-sundays"></a>
<a name="fixture-sundays1"></a>
<b>P<font size="-1">REFACE</font> I <font size="-1">OF FIXTURE SUNDAYS</font></b>
<i>First invented theme</i>
<font size="-1">discarded synthetic latin words</font>
<p>The first invented Preface body contains enough distinct fixture words to verify complete spoken extraction from a linked source document.</p>
<p>Its second sentence continues the entirely synthetic example and invites the assembly to offer the concluding acclamation:</p>
<p>Holy, Holy, Holy fixture acclamation.</p>
<a name="fixture-sundays2"></a>
<b>P<font size="-1">REFACE</font> II <font size="-1">OF FIXTURE SUNDAYS</font></b>
<i>Second invented theme</i>
<font size="-1">discarded synthetic latin words</font>
<p>The second invented Preface body also contains sufficient fixture language to prove that category options retain source order.</p>
<p>Another wholly synthetic sentence completes this option before the separate assembly acclamation begins:</p>
<p>Holy, Holy, Holy fixture acclamation.</p>
<a name="another-category1"></a>
</body></html>`;
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
    displayChunks.length === 4 &&
      displayChunks.every((chunk) => {
        const count = normalizeMassSpeech(chunk).split(" ").length;
        return count >= 8 && count <= 12;
      }),
    "Default speech chunks must be balanced within the 8–12 word bounds",
  );
  const indivisibleChunk = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen";
  assert(
    JSON.stringify(splitMassSpeechText(indivisibleChunk)) ===
      JSON.stringify([indivisibleChunk]),
    "A 13–15 word passage must stay whole instead of creating undersized chunks",
  );
  assert(
    JSON.stringify(splitMassSpeechText("  Amen.\n")) ===
      JSON.stringify(["  Amen.\n"]) &&
      JSON.stringify(splitMassSpeechText("…")) === JSON.stringify(["…"]) &&
      splitMassSpeechText("").length === 0,
    "Short, punctuation-only, and empty display text must split losslessly",
  );
  expectRangeError(() => splitMassSpeechText("one two three", 4, 3));
  assert(
    createMassSpeechBridgeText(
      "First second third fourth fifth.",
      "Sixth seventh eighth.",
      3,
    ) === "third fourth fifth sixth seventh eighth" &&
      createMassSpeechBridgeText(null, "Sixth seventh eighth.") === null,
    "Matcher bridge text must overlap a normalized previous tail with current prose",
  );
  expectRangeError(() =>
    createMassSpeechBridgeText("previous words", "current words", 0),
  );

  const responseCandidates: MassSpeechCandidate[] = [
    {
      id: "opening",
      order: 1_000,
      text: "Brothers and sisters let us acknowledge our sins and prepare ourselves to celebrate the sacred mysteries.",
    },
    {
      id: "amen-immediate",
      mode: "response",
      order: 2_000,
      text: "Amen.",
    },
    {
      id: "intervening-prayer",
      order: 3_000,
      text: "May the Lord guide our hearts with mercy and strengthen our faithful witness throughout this holy celebration.",
    },
    {
      id: "amen-later",
      mode: "response",
      order: 9_000,
      text: "Amen.",
    },
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

  const longResponse =
    "Lord I am not worthy that you should enter under my roof but only say the word and my soul shall be healed.";
  const explicitResponseCandidates: MassSpeechCandidate[] = [
    {
      id: "response-current-prose",
      order: 1_000,
      text: "The priest raises the sacred host before the gathered faithful.",
    },
    {
      id: "long-response",
      matchTexts: [
        "Lord I am not worthy that you should come under my roof but only say the word and my soul shall be healed.",
      ],
      mode: "response",
      order: 2_000,
      text: longResponse,
    },
  ];
  assert(
    findMassSpeechMatch({
      candidates: explicitResponseCandidates,
      transcript: longResponse,
    }) === null,
    "Even a long response must never cause initial or global acquisition",
  );
  match = findMassSpeechMatch({
    candidates: explicitResponseCandidates,
    currentOrder: 1_000,
    transcript:
      "background words Lord I am not worthy that you should come under my roof but only say the word and my soul shall be healed",
  });
  assert(
    match?.candidate.id === "long-response" &&
      match.scope === "forward" &&
      match.orderDistance === 1,
    "A response alternative may match only when it is the immediate expected target",
  );
  assert(
    findMassSpeechMatch({
      candidates: [
        {
          id: "response-blocker",
          order: 1_500,
          text: "Distinctive bronze trumpets sound beside the eastern gate at dawn.",
        },
        ...explicitResponseCandidates,
      ],
      currentOrder: 1_000,
      transcript: longResponse,
    }) === null,
    "A response must not skip over an intervening target order",
  );

  const bridgeCurrent =
    "Merciful shepherd gathers wandering pilgrims beside the river before dawn.";
  const bridgeText = createMassSpeechBridgeText(
    "Bronze lanterns crossed silent valleys.",
    bridgeCurrent,
  );
  const bridgeTranscript =
    "bronze lanterns crossed silent valleys merciful shepherd";
  assert(
    findMassSpeechMatch({
      candidates: [
        {
          id: "without-bridge",
          order: 2_000,
          text: bridgeCurrent,
        },
      ],
      currentOrder: 1_000,
      transcript: bridgeTranscript,
    }) === null,
    "A prose boundary with too little current-chunk evidence must not match accidentally",
  );
  match = findMassSpeechMatch({
    candidates: [
      {
        id: "with-bridge",
        matchTexts: bridgeText ? [bridgeText] : [],
        order: 2_000,
        text: bridgeCurrent,
      },
    ],
    currentOrder: 1_000,
    transcript: bridgeTranscript,
  });
  assert(
    match?.candidate.id === "with-bridge" &&
      match.matchedInformativeWords >= 4,
    "Previous-tail/current prose bridge text must acquire across a chunk boundary",
  );

  const sparseCandidates: MassSpeechCandidate[] = [
    {
      id: "sparse-current",
      order: 1_000,
      text: "The opening procession approaches the sanctuary while the assembly gathers in reverent silence.",
    },
    ...Array.from({ length: 15 }, (_, index) => ({
      id: `sparse-filler-${index + 1}`,
      mode: "response" as const,
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

  const preparedCandidates: MassSpeechCandidate[] = [
    {
      id: "prepared-winner",
      order: 2_000,
      text: "Merciful Father gather your scattered children into one faithful family beneath the radiant light of truth.",
    },
    {
      id: "prepared-runner-up",
      order: 3_000,
      text: "Merciful Father guide your scattered children into one faithful family beneath the gentle light of peace.",
    },
  ];
  const preparedIndex = prepareMassSpeechCandidates(preparedCandidates);
  match = findPreparedMassSpeechMatch({
    currentOrder: 1_000,
    prepared: preparedIndex,
    transcript:
      "Merciful Father gather your scattered children into one faithful family beneath the radiant light of truth",
  });
  assert(
    match?.candidate.id === "prepared-winner" &&
      match.runnerUp?.candidate.id === "prepared-runner-up" &&
      match.margin > 0 &&
      match.orderDistance === 1,
    "Prepared matching must return the winner, runner-up, margin, and distinct-order distance in one pass",
  );
  const strictFutureMatch = findPreparedMassSpeechMatch({
    allowGlobal: true,
    currentOrder: 2_000,
    prepared: preparedIndex,
    transcript: preparedCandidates[0]?.text ?? "",
  });
  assert(
    strictFutureMatch?.candidate.id !== "prepared-winner",
    "Prepared forward and global matching must never return the current order after acquisition",
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

function validateMassSpeechEvidence() {
  const confirmationWindowMs = 1_500;
  let state = createMassSpeechEvidenceState();
  let decision = advanceMassSpeechEvidence({
    acceptImmediately: false,
    confirmationWindowMs,
    final: false,
    fingerprint: "alpha-short",
    now: 100,
    state,
    targetKey: "alpha",
  });
  assert(
    !decision.accepted &&
      decision.state.pending?.count === 1 &&
      decision.state.pending.fingerprint === "alpha-short",
    "The first interim hypothesis must remain pending",
  );
  const firstPendingState = decision.state;
  decision = advanceMassSpeechEvidence({
    acceptImmediately: false,
    confirmationWindowMs,
    final: false,
    fingerprint: "alpha-short",
    now: 300,
    state: firstPendingState,
    targetKey: "alpha",
  });
  assert(
    !decision.accepted &&
      decision.state === firstPendingState &&
      decision.state.pending?.count === 1 &&
      decision.state.pending.observedAt === 100,
    "An identical interim event must not count as independent confirmation",
  );

  decision = advanceMassSpeechEvidence({
    acceptImmediately: false,
    confirmationWindowMs,
    final: false,
    fingerprint: "beta-correction",
    now: 500,
    state: decision.state,
    targetKey: "beta",
  });
  assert(
    !decision.accepted &&
      decision.state.pending?.targetKey === "beta" &&
      decision.state.pending.count === 1,
    "An interim correction to another target must discard prior target evidence",
  );

  state = createMassSpeechEvidenceState();
  decision = advanceMassSpeechEvidence({
    acceptImmediately: false,
    confirmationWindowMs,
    final: false,
    fingerprint: "gamma-opening",
    now: 1_000,
    state,
    targetKey: "gamma",
  });
  decision = advanceMassSpeechEvidence({
    acceptImmediately: false,
    confirmationWindowMs,
    final: false,
    fingerprint: "gamma-opening-extended",
    now: 1_200,
    state: decision.state,
    targetKey: "gamma",
  });
  assert(
    decision.accepted &&
      decision.state.pending === null &&
      decision.state.acceptedFingerprint === "gamma-opening-extended",
    "A distinct extension for the same target must provide second-pass confirmation",
  );

  const acceptedState = decision.state;
  decision = advanceMassSpeechEvidence({
    acceptImmediately: false,
    confirmationWindowMs,
    final: true,
    fingerprint: "gamma-opening-extended",
    now: 1_300,
    state: acceptedState,
    targetKey: "delta",
  });
  assert(
    !decision.accepted && decision.state === acceptedState,
    "Accepted transcript evidence must not be replayed to advance another target",
  );

  state = createMassSpeechEvidenceState();
  decision = advanceMassSpeechEvidence({
    acceptImmediately: false,
    confirmationWindowMs,
    final: false,
    fingerprint: "epsilon-interim",
    now: 2_000,
    state,
    targetKey: "epsilon",
  });
  decision = advanceMassSpeechEvidence({
    acceptImmediately: false,
    confirmationWindowMs,
    final: true,
    fingerprint: "epsilon-final",
    now: 2_100,
    state: decision.state,
    targetKey: "epsilon",
  });
  assert(
    decision.accepted &&
      decision.state.pending === null &&
      decision.state.acceptedFingerprint === "epsilon-final",
    "A final recognition result must accept immediately and clear pending evidence",
  );

  state = createMassSpeechEvidenceState();
  decision = advanceMassSpeechEvidence({
    acceptImmediately: false,
    confirmationWindowMs,
    final: false,
    fingerprint: "zeta-opening",
    now: 3_000,
    state,
    targetKey: "zeta",
  });
  decision = advanceMassSpeechEvidence({
    acceptImmediately: false,
    confirmationWindowMs,
    final: false,
    fingerprint: "zeta-after-pause",
    now: 3_000 + confirmationWindowMs + 1,
    state: decision.state,
    targetKey: "zeta",
  });
  assert(
    !decision.accepted &&
      decision.state.pending?.count === 1 &&
      decision.state.pending.fingerprint === "zeta-after-pause" &&
      decision.state.pending.observedAt ===
        3_000 + confirmationWindowMs + 1,
    "Expired pending evidence must restart confirmation instead of accepting after a pause",
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
