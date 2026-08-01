import {
  BookMarked,
  BookOpen,
  ChevronDown,
  Clock3,
  ExternalLink,
  Moon,
  ScrollText,
  Sun,
  Sunset,
} from "lucide-react";
import Link from "next/link";
import type { OfficeGuide } from "@/lib/office-psalter";
import { getOfficeDevotionalTexts } from "@/lib/office-devotional-texts";
import {
  getScriptureHref,
  type ScriptureReturnSource,
} from "@/lib/scripture";
import {
  loadScriptureAnchor,
  type LoadedScriptureAnchor,
} from "@/server/scripture-passages";

type OfficeGuidePanelsProps = {
  guides: OfficeGuide[];
};

type LoadedOfficeGuide = Omit<
  OfficeGuide,
  "scriptureAnchors" | "alternatePsalmody"
> & {
  scriptureAnchors: LoadedScriptureAnchor[];
  alternatePsalmody?: {
    title: string;
    instruction: string;
    scriptureAnchors: LoadedScriptureAnchor[];
  };
};

const DOXOLOGY =
  "Glory be to the Father, and to the Son, and to the Holy Ghost. As it was in the beginning, is now, and ever shall be, world without end. Amen.";

export async function OfficeGuidePanels({ guides }: OfficeGuidePanelsProps) {
  const loadedGuides = await Promise.all(
    guides.map(async (guide) => {
      const [scriptureAnchors, alternateAnchors] = await Promise.all([
        Promise.all(guide.scriptureAnchors.map(loadScriptureAnchor)),
        guide.alternatePsalmody
          ? Promise.all(
              guide.alternatePsalmody.scriptureAnchors.map(
                loadScriptureAnchor,
              ),
            )
          : Promise.resolve(null),
      ]);

      return {
        ...guide,
        scriptureAnchors,
        alternatePsalmody:
          guide.alternatePsalmody && alternateAnchors
            ? {
                ...guide.alternatePsalmody,
                scriptureAnchors: alternateAnchors,
              }
            : undefined,
      };
    }),
  );

  return (
    <section
      aria-labelledby="office-guides-heading"
      className="scroll-mt-24"
      id="office"
    >
      <header className="mb-6 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
          The sacred daily rhythm
        </p>
        <h2
          className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl"
          id="office-guides-heading"
        >
          Seven stops. One day held in God.
        </h2>
      </header>

      <nav
        aria-label="Jump to a canonical hour"
        className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-7"
      >
        {loadedGuides.map((guide, index) => (
          <a
            className="group rounded-xl border border-hairline bg-vellum/70 px-3 py-3 transition hover:border-ecclesial-green hover:bg-[var(--panel-soft)]"
            href={`#office-${guide.hourType}`}
            key={`jump:${guide.hourType}`}
          >
            <span className="font-mono text-[0.68rem] font-bold text-[var(--accent)]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="mt-1 block text-sm font-bold text-foreground">
              {getHourLabel(guide)}
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted">
              {guide.traditionalName} · {guide.suggestedTime}
            </span>
          </a>
        ))}
      </nav>

      <div className="space-y-6">
        {loadedGuides.map((guide) => (
          <OfficeHour key={guide.hourType} guide={guide} />
        ))}
      </div>
    </section>
  );
}

function OfficeHour({
  guide,
}: {
  guide: LoadedOfficeGuide;
}) {
  const devotional = getOfficeDevotionalTexts(guide.hourType);
  const hourLabel = getHourLabel(guide);
  const Icon =
    guide.hourType === "morning_prayer"
      ? Sun
      : guide.hourType === "evening_prayer"
        ? Sunset
        : guide.hourType === "night_prayer"
          ? Moon
          : guide.hourType === "office_readings"
            ? BookMarked
            : Clock3;

  return (
    <article
      aria-labelledby={`office-${guide.hourType}-heading`}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-hairline bg-[var(--panel)] shadow-[var(--shadow-soft)]"
      id={`office-${guide.hourType}`}
    >
      <details
        className="group"
        open={
          guide.hourType === "office_readings" ||
          guide.hourType === "morning_prayer"
        }
      >
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 marker:content-none sm:p-7 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-start gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-sanctuary-night text-[var(--gilt-light)] shadow-sm">
              <Icon aria-hidden className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                {hourLabel} · {guide.traditionalName}
              </span>
              <span
                className="mt-1 block font-serif text-2xl font-semibold text-foreground sm:text-3xl"
                id={`office-${guide.hourType}-heading`}
              >
                {guide.cycleLabel}
              </span>
              <span className="mt-2 block font-mono text-xs font-semibold text-muted">
                {guide.suggestedTime}
              </span>
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className="mt-3 size-5 shrink-0 text-muted transition-transform group-open:rotate-180"
          />
        </summary>

        <div className="border-t border-hairline px-4 pb-5 pt-4 sm:px-7 sm:pb-7">
          <section
            aria-label={`${hourLabel} opening`}
            className="rounded-xl border border-gilt/45 bg-gilt/15 p-4 sm:p-5"
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-oxblood">
              Begin
            </p>
            <div className="mt-3 space-y-2 font-serif text-lg leading-8 text-foreground">
              {guide.openingLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </section>

          <section
            aria-labelledby={`office-${guide.hourType}-hymn`}
            className="mt-5 overflow-hidden rounded-xl border border-gilt/55 bg-[linear-gradient(135deg,var(--vellum),var(--panel-soft))]"
          >
            <header className="border-b border-gilt/45 px-4 py-4 sm:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-oxblood">
                Hymn
              </p>
              <h3
                className="mt-2 font-serif text-2xl font-semibold text-foreground"
                id={`office-${guide.hourType}-hymn`}
              >
                {devotional.hymn.title}
              </h3>
            </header>
            <div className="grid gap-5 px-4 py-5 sm:grid-cols-2 sm:px-5 xl:grid-cols-3">
              {devotional.hymn.stanzas.map((stanza) => (
                <div
                  className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2"
                  key={`${devotional.hymn.title}:${stanza.number}`}
                >
                  <span className="font-mono text-xs font-bold text-oxblood">
                    {stanza.number}
                  </span>
                  <p className="whitespace-pre-line font-serif text-base leading-7 text-foreground">
                    {stanza.lines.join("\n")}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-5 space-y-5">
            {guide.scriptureAnchors.map((anchor, index) => (
              <PrayerPassage
                anchor={anchor}
                hourType={guide.hourType}
                index={index}
                key={`${guide.hourType}:${anchor.title}:${anchor.citation}`}
              />
            ))}
          </div>

          {guide.alternatePsalmody ? (
            <details className="group/alternate mt-5 rounded-xl border border-gilt/55 bg-gilt/15">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 marker:content-none sm:p-5 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block text-xs font-bold uppercase tracking-[0.14em] text-oxblood">
                    Current psalmody alternative
                  </span>
                  <span className="mt-1 block font-serif text-xl font-semibold text-foreground">
                    {guide.alternatePsalmody.title}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-muted">
                    {guide.alternatePsalmody.instruction}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden
                  className="mt-2 size-5 shrink-0 text-oxblood transition-transform group-open/alternate:rotate-180"
                />
              </summary>
              <div className="space-y-5 border-t border-gilt/45 px-4 py-5 sm:px-5">
                {guide.alternatePsalmody.scriptureAnchors.map(
                  (anchor, index) => (
                    <PrayerPassage
                      anchor={anchor}
                      hourType={guide.hourType}
                      index={index}
                      key={`alternate:${guide.hourType}:${anchor.citation}`}
                    />
                  ),
                )}
              </div>
            </details>
          ) : null}

          <section className="mt-5 rounded-xl border border-ecclesial-green/20 bg-ecclesial-green/5 p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ecclesial-green">
              {devotional.intercessions.title}
            </p>
            <p className="mt-2 font-serif text-lg font-semibold text-foreground">
              Response: {devotional.intercessions.response}
            </p>
            <ul className="mt-4 grid gap-3 lg:grid-cols-2">
              {devotional.intercessions.petitions.map((petition) => (
                <li
                  className="rounded-xl border border-ecclesial-green/15 bg-vellum/70 p-4 text-sm leading-6 text-muted"
                  key={petition.id}
                >
                  {petition.text}
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-label={`${hourLabel} conclusion`}
            className="mt-5 rounded-xl border border-hairline bg-[var(--panel-soft)] p-4 sm:p-5"
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ecclesial-green">
              Conclude
            </p>
            <div className="mt-3 rounded-xl border border-hairline bg-vellum/70 p-4">
              <h3 className="font-serif text-xl font-semibold text-foreground">
                {devotional.concludingPrayer.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                {devotional.concludingPrayer.prompt}
              </p>
              <p className="mt-2 text-sm italic leading-6 text-muted">
                {devotional.concludingPrayer.endingSuggestion}
              </p>
            </div>
            <ol className="mt-4 grid gap-3 md:grid-cols-3">
              {guide.closingSteps.map((step, index) => (
                <li
                  className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-xl border border-ecclesial-green/15 bg-vellum/70 p-3"
                  key={`${step.title}:${step.instruction}`}
                >
                  <span className="font-mono text-xs font-bold text-[var(--accent)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-foreground">
                      {step.title}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-muted">
                      {step.instruction}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </details>
    </article>
  );
}

function PrayerPassage({
  anchor,
  hourType,
  index,
}: {
  anchor: LoadedScriptureAnchor;
  hourType: OfficeGuide["hourType"];
  index: number;
}) {
  const shouldPrayDoxology = !anchor.role.toLowerCase().includes("reading");
  const reflection = anchor.reflection.includes("public-domain devotional opening")
    ? "Repeat the invitatory antiphon before and between the stanzas."
    : anchor.reflection;

  return (
    <section className="overflow-hidden rounded-xl border border-hairline bg-vellum/70">
      <header className="flex flex-col gap-3 border-b border-hairline bg-[var(--panel-soft)] px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-sanctuary-night font-mono text-xs font-bold text-[var(--gilt-light)]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <ScrollText aria-hidden className="size-4 shrink-0" />
              <p className="text-xs font-bold uppercase tracking-[0.13em]">
                {anchor.title}
              </p>
            </div>
            <h4 className="mt-1 font-serif text-xl font-semibold text-foreground sm:text-2xl">
              {anchor.citation}
            </h4>
            <p className="mt-1 text-xs leading-5 text-muted">
              {reflection}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-xs font-semibold text-muted">
          {anchor.role}
        </span>
      </header>

      <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        {anchor.segments.map((segment) => (
          <div key={`${segment.reference}:${segment.verses[0]?.number ?? 0}`}>
            {anchor.segments.length > 1 ? (
              <p className="mb-3 font-mono text-xs font-bold text-muted">
                {segment.reference}
              </p>
            ) : null}
            <ol
              aria-label={`${segment.reference} verses`}
              className="space-y-3 font-serif text-lg leading-8 text-foreground sm:text-xl sm:leading-9"
            >
              {segment.verses.map((verse) => (
                <li
                  className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3"
                  key={`${segment.reference}:${verse.number}`}
                >
                  <span
                    aria-hidden
                    className="pt-1 text-right font-mono text-[0.68rem] font-bold text-[var(--accent)]"
                  >
                    {verse.label}
                  </span>
                  <span>
                    <span className="sr-only">Verse {verse.label}. </span>
                    {verse.text}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}

        {shouldPrayDoxology ? (
          <p className="border-l-2 border-gilt pl-4 font-serif text-base italic leading-7 text-muted">
            {DOXOLOGY}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
          <BookOpen aria-hidden className="mr-1 size-4 text-[var(--accent)]" />
          {anchor.segments.map((segment) => (
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-hairline bg-vellum px-3 text-xs font-bold text-ecclesial-green transition hover:border-ecclesial-green hover:bg-[var(--panel-soft)]"
              href={getScriptureHref(
                segment.passage,
                getReturnSource(hourType),
              )}
              key={`reader:${segment.reference}`}
            >
              Open {segment.reference}
              <ExternalLink aria-hidden className="size-3.5" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function getReturnSource(
  hourType: OfficeGuide["hourType"],
): ScriptureReturnSource {
  if (hourType === "office_readings") {
    return "office-readings";
  }

  if (hourType === "morning_prayer") {
    return "office-morning";
  }

  if (hourType === "midmorning_prayer") {
    return "office-midmorning";
  }

  if (hourType === "midday_prayer") {
    return "office-midday";
  }

  if (hourType === "midafternoon_prayer") {
    return "office-midafternoon";
  }

  if (hourType === "evening_prayer") {
    return "office-evening";
  }

  return "office-night";
}

function getHourLabel(guide: OfficeGuide) {
  if (guide.hourLabel) {
    return guide.hourLabel;
  }

  switch (guide.hourType) {
    case "office_readings":
      return "Office of Readings";
    case "morning_prayer":
      return "Morning Prayer";
    case "midmorning_prayer":
      return "Midmorning Prayer";
    case "midday_prayer":
      return "Midday Prayer";
    case "midafternoon_prayer":
      return "Midafternoon Prayer";
    case "evening_prayer":
      return "Evening Prayer";
    case "night_prayer":
      return "Night Prayer";
  }
}
