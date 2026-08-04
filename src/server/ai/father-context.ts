import "server-only";

import type {
  FatherContextLocator,
  FatherContextSnapshot,
} from "@/lib/ai/contracts";
import { formatPrayerItem } from "@/lib/domain";
import { MASS_ORDER_SECTIONS } from "@/lib/mass-order";
import { devotionGuides, prayers } from "@/lib/prayers";
import { MYSTERY_SETS, ROSARY_PRAYERS } from "@/lib/rosary";
import { getScriptureBook } from "@/lib/scripture";
import { getHolyMassPageData } from "@/server/holy-mass";
import {
  loadScriptureAnchor,
  loadScripturePassage,
} from "@/server/scripture-passages";
import { getTodayPayload } from "@/server/today";

const MAX_CONTEXT_CHARACTERS = 18_000;

export async function resolveFatherContext(
  locator: FatherContextLocator,
  request: Request,
): Promise<FatherContextSnapshot> {
  switch (locator.kind) {
    case "general":
      return {
        kind: "general",
        key: "general",
        title: "Open conversation",
        body:
          "No specific section was selected. Offer faithful Catholic Scripture guidance, prayerful reflection, and clear distinctions between doctrine, discipline, and prudential counsel.",
        starterPrompts: [
          "Help me pray with what is on my heart.",
          "Explain a Catholic teaching I am wrestling with.",
          "Help me choose a Scripture passage for today.",
        ],
      };

    case "office": {
      const today = await getTodayPayload(request);
      const guide = today.officeGuides.find(
        (candidate) => candidate.hourType === locator.hourType,
      );

      if (!guide) {
        throw new Error("That canonical Hour is not available today.");
      }

      const anchors = await Promise.all(
        guide.scriptureAnchors.map(loadScriptureAnchor),
      );
      const hourLabel = guide.hourLabel ?? guide.traditionalName;
      const body = [
        formatLiturgicalDay(today),
        `Canonical Hour: ${hourLabel} (${guide.traditionalName}).`,
        `Cycle: ${guide.cycleLabel}. Suggested time: ${guide.suggestedTime}.`,
        "Scripture prayed in this Hour:",
        ...anchors.map(formatLoadedAnchor),
      ].join("\n\n");

      return {
        kind: "office",
        key: `office:${today.localDate}:${guide.hourType}`,
        title: `${hourLabel} · ${today.liturgicalDay.title}`,
        body: limitContext(body),
        starterPrompts: [
          "Help me find the thread joining these readings.",
          "What should I carry from this Hour into the rest of the day?",
          "Guide me in a short lectio divina with this Scripture.",
        ],
      };
    }

    case "mass": {
      const today = await getTodayPayload(request);
      const mass = await getHolyMassPageData(today);
      const celebration =
        locator.mode === "anticipated" && mass.anticipated
          ? mass.anticipated
          : mass.daytime;
      const section =
        MASS_ORDER_SECTIONS.find((candidate) => candidate.id === locator.sectionId) ??
        MASS_ORDER_SECTIONS[0];
      const selectedReadingSet = locator.readingOptionId
        ? celebration.readingSets.find(
            (readingSet) => readingSet.id === locator.readingOptionId,
          ) ?? null
        : celebration.readingSets[0] ?? null;
      const selectedOption = selectedReadingSet
        ? celebration.options.find(
            (option) => option.id === selectedReadingSet.douayOptionId,
          ) ?? null
        : locator.readingOptionId
          ? celebration.options.find(
              (option) => option.id === locator.readingOptionId,
            ) ?? null
          : celebration.options[0] ?? null;
      const liveLectionaryCitations = celebration.massLectionary
        ? celebration.massLectionary.sections
            .map((reading) => `${reading.title}: ${reading.citation}`)
            .join("\n")
        : "";
      const selectedReadingContext = selectedReadingSet
        ? formatOfficialMassReadingSet(selectedReadingSet)
        : selectedOption
          ? formatMassOption(selectedOption)
          : liveLectionaryCitations;
      const alternatives = celebration.readingSets
        .filter((readingSet) => readingSet.id !== selectedReadingSet?.id)
        .map(formatOfficialMassReadingSet)
        .join("\n");
      const readingSetLabel =
        selectedReadingSet?.label ??
        selectedOption?.label ??
        celebration.massLectionary?.title ??
        "Live USCCB set";
      const selectedReadingId =
        selectedReadingSet?.id ?? selectedOption?.id ?? "live";

      return {
        kind: "mass",
        key: `mass:${celebration.id}:${section.id}:${selectedReadingId}:${locator.readingTranslation}`,
        title: `${section.title} · ${celebration.title} · ${readingSetLabel}`,
        body: limitContext(
          [
            formatLiturgicalDay(today),
            `Civil date used by the Mass page: ${celebration.localDate}. Celebration mode: ${celebration.mode}.`,
            `Mass celebration: ${celebration.title}. ${celebration.rank}; ${celebration.liturgicalColor}; ${celebration.season}.`,
            `Current rite section: ${section.title}.`,
            `The user selected the reading set "${readingSetLabel}" and the ${locator.readingTranslation === "us-lectionary" ? "U.S. Lectionary" : "Douay-Rheims"} view. This is the Mass currently being followed.`,
            selectedReadingContext
              ? `Selected readings:\n${selectedReadingContext}`
              : "No reading citations are available. Say that plainly; do not guess.",
            liveLectionaryCitations
              ? `Live USCCB daily-feed citations for this civil date:\n${liveLectionaryCitations}`
              : "The live USCCB daily feed is unavailable.",
            alternatives
              ? `Other valid reading set(s) modeled for this celebration:\n${alternatives}`
              : "",
            `Official daily readings: ${celebration.officialReadingsUrl}`,
            selectedReadingSet?.officialUrl || selectedOption?.officialUrl
              ? `Official source for the selected set: ${selectedReadingSet?.officialUrl ?? selectedOption?.officialUrl}`
              : "",
          ].join("\n\n"),
        ),
        starterPrompts: [
          `Explain the spiritual movement of the ${section.title}.`,
          "How do today's readings prepare me to receive the Mass faithfully?",
          "What should I listen for most closely in this part of the liturgy?",
        ],
      };
    }

    case "scripture": {
      const book = getScriptureBook(locator.bookId);

      if (!book || locator.chapter > book.chapters) {
        throw new Error("That Scripture location is not available.");
      }

      const passage = await loadScripturePassage({
        bookId: book.id,
        chapter: locator.chapter,
        verseStart: locator.verseStart,
        verseEnd: locator.verseEnd,
      });
      const reference = formatPassageReference(
        book.name,
        locator.chapter,
        locator.verseStart,
        locator.verseEnd,
      );

      return {
        kind: "scripture",
        key: `scripture:${book.id}:${locator.chapter}:${locator.verseStart ?? "all"}-${locator.verseEnd ?? "all"}`,
        title: reference,
        body: limitContext(
          [
            "Scripture edition: Original Douay-Rheims (1582–1610), public domain.",
            `Selected passage: ${reference}.`,
            passage.verses
              .map((verse) => `${verse.label}. ${verse.text}`)
              .join("\n"),
          ].join("\n\n"),
        ),
        starterPrompts: [
          "Place this passage in its biblical context.",
          "Guide me through lectio divina with these verses.",
          "How has the Catholic tradition understood this passage?",
        ],
      };
    }

    case "rosary": {
      const mysterySet = MYSTERY_SETS.find(
        (candidate) => candidate.id === locator.mysterySetId,
      );

      if (!mysterySet) {
        throw new Error("That Rosary mystery set is not available.");
      }

      const mystery = locator.mysteryId
        ? mysterySet.mysteries.find(
            (candidate) => candidate.id === locator.mysteryId,
          ) ?? null
        : null;
      const scripture = mystery
        ? await loadScripturePassage(mystery.scripturePassage)
        : null;
      const prayerId = locator.stepId.split(":").at(-1);
      const prayer = prayerId
        ? ROSARY_PRAYERS[prayerId as keyof typeof ROSARY_PRAYERS]
        : undefined;
      const title = mystery
        ? `${mystery.title} · ${mysterySet.shortTitle} Mysteries`
        : mysterySet.title;

      return {
        kind: "rosary",
        key: `rosary:${locator.localDate}:${mysterySet.id}:${mystery?.id ?? locator.stepId}`,
        title,
        body: limitContext(
          [
            `Rosary set: ${mysterySet.title}. Current step: ${locator.stepId}.`,
            mystery
              ? `Mystery: ${mystery.title}. Fruit: ${mystery.fruit}. Meditation: ${mystery.meditation}`
              : "The current step is outside a mystery decade.",
            scripture
              ? `Scripture (${mystery?.scripture}): ${scripture.verses.map((verse) => verse.text).join(" ")}`
              : "",
            prayer ? `Current prayer: ${prayer.title}. ${prayer.text}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
        ),
        starterPrompts: [
          "Help me enter more deeply into this mystery.",
          "Show me how this mystery points to Christ.",
          "How can I practice this mystery's fruit today?",
        ],
      };
    }

    case "prayer": {
      const [kind, slug] = locator.itemId.split(":", 2);
      const prayer =
        kind === "prayer"
          ? prayers.find((candidate) => candidate.slug === slug)
          : null;
      const guide =
        kind === "guide"
          ? devotionGuides.find((candidate) => candidate.slug === slug)
          : null;

      if (!prayer && !guide) {
        throw new Error("That prayer or devotion is not available.");
      }

      if (prayer) {
        return {
          kind: "prayer",
          key: `prayer:${prayer.slug}`,
          title: prayer.title,
          body: limitContext(
            [
              `Prayer: ${prayer.title}. Category: ${prayer.category}.`,
              `Purpose: ${prayer.summary}`,
              `When to pray: ${prayer.whenToPray}.`,
              `Source note: ${prayer.source}.`,
              prayer.text.join("\n\n"),
            ].join("\n\n"),
          ),
          starterPrompts: [
            "Help me understand the theology within this prayer.",
            "Show me the Scripture behind these words.",
            "Help me pray this more attentively rather than reciting it quickly.",
          ],
        };
      }

      return {
        kind: "prayer",
        key: `guide:${guide!.slug}`,
        title: guide!.title,
        body: limitContext(
          [
            `Devotion: ${guide!.title}. ${guide!.summary}`,
            `Duration: ${guide!.duration}. Provenance: ${guide!.provenance}.`,
            ...guide!.steps.map(
              (step, index) =>
                `${index + 1}. ${step.title}: ${step.instruction}${step.scripture ? ` Scripture: ${step.scripture}.` : ""}`,
            ),
          ].join("\n\n"),
        ),
        starterPrompts: [
          "Help me understand the purpose of this devotion.",
          "How can I pray these steps without rushing?",
          "What Scripture best illuminates this devotion?",
        ],
      };
    }

    case "formation": {
      const today = await getTodayPayload(request);
      const enabled = today.prayerRule.enabledItems.map(formatPrayerItem);
      const todayStatus = today.prayerRule.enabledItems.map(
        (item) => `${formatPrayerItem(item)}: ${today.habitLog[item] ?? "open"}`,
      );
      const weeklyCounts = Object.values(today.habitHistory).reduce(
        (counts, day) => {
          Object.values(day).forEach((status) => {
            if (status) {
              counts[status] = (counts[status] ?? 0) + 1;
            }
          });
          return counts;
        },
        {} as Record<string, number>,
      );

      return {
        kind: "formation",
        key: `formation:${today.localDate}:${locator.activeTab}`,
        title: `Formation · ${capitalize(locator.activeTab)}`,
        body: limitContext(
          [
            formatLiturgicalDay(today),
            `Formation view: ${locator.activeTab}. Rule difficulty: ${today.prayerRule.difficultyLevel}.`,
            `Enabled practices: ${enabled.join(", ")}.`,
            `Today's aggregate status: ${todayStatus.join("; ")}.`,
            `Seven-day aggregate: ${Object.entries(weeklyCounts).map(([status, count]) => `${status} ${count}`).join(", ") || "no entries"}.`,
            "No examination-of-conscience text or private encrypted entry is included in this context.",
          ].join("\n\n"),
        ),
        starterPrompts: [
          "Help me make this rule faithful and sustainable.",
          "What virtue should anchor my formation today?",
          "Help me respond to inconsistency without discouragement.",
        ],
      };
    }
  }
}

function formatLiturgicalDay(
  today: Awaited<ReturnType<typeof getTodayPayload>>,
) {
  return [
    `Liturgical day: ${today.liturgicalDay.title}.`,
    `Date: ${today.localDate}. Season: ${today.liturgicalDay.season}.`,
    `Rank: ${today.liturgicalDay.rank}. Color: ${today.liturgicalDay.color}. Psalter week: ${today.liturgicalDay.psalterWeek}.`,
  ].join(" ");
}

function formatLoadedAnchor(
  anchor: Awaited<ReturnType<typeof loadScriptureAnchor>>,
) {
  const text = anchor.segments
    .flatMap((segment) =>
      segment.verses.map((verse) => `${verse.label}. ${verse.text}`),
    )
    .join(" ");
  return `${anchor.title} — ${anchor.citation}. ${anchor.reflection}\n${text}`;
}

function formatMassReading(
  reading: Awaited<ReturnType<typeof getHolyMassPageData>>["daytime"]["options"][number]["firstReading"],
) {
  const text = reading.segments
    .flatMap((segment) => segment.verses.map((verse) => verse.text))
    .join(" ");
  return `${reading.title}: ${reading.displayCitation}. ${text}`;
}

function formatMassOption(
  option: Awaited<ReturnType<typeof getHolyMassPageData>>["daytime"]["options"][number],
) {
  return [
    `Reading-set label: ${option.label}. ${option.description}`,
    formatMassReading(option.firstReading),
    formatMassReading(option.responsorialPsalm),
    ...(option.secondReading ? [formatMassReading(option.secondReading)] : []),
    formatMassReading(option.gospelAcclamation),
    ...option.gospelChoices.map(formatMassReading),
  ].join("\n\n");
}

function formatOfficialMassReadingSet(
  readingSet: Awaited<ReturnType<typeof getHolyMassPageData>>["daytime"]["readingSets"][number],
) {
  return [
    `Reading-set label: ${readingSet.label}. ${readingSet.description}`,
    readingSet.item.sections
      .map((reading) => `${reading.title}: ${reading.citation}`)
      .join("\n"),
    `Lectionary number: ${readingSet.lectionaryNumber ?? "not stated"}.`,
    `Official source: ${readingSet.officialUrl}`,
  ].join("\n");
}

function formatPassageReference(
  book: string,
  chapter: number,
  verseStart: number | null,
  verseEnd: number | null,
) {
  if (verseStart === null) {
    return `${book} ${chapter}`;
  }

  return `${book} ${chapter}:${verseStart}${verseEnd && verseEnd !== verseStart ? `–${verseEnd}` : ""}`;
}

function limitContext(value: string) {
  return value.length <= MAX_CONTEXT_CHARACTERS
    ? value
    : `${value.slice(0, MAX_CONTEXT_CHARACTERS)}\n\n[Context shortened for this conversation.]`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
