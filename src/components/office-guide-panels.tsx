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
import {
  DEVOTIONAL_TEXT_BOUNDARY,
  getOfficeDevotionalTexts,
} from "@/lib/office-devotional-texts";
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
          The complete daily rhythm
        </p>
        <h2
          className="mt-2 text-3xl font-semibold text-stone-950 sm:text-4xl"
          id="office-guides-heading"
        >
          Seven stops. One day held in God.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
          Office of Readings, Lauds, Terce, Sext, None, Vespers, and Compline
          are arranged below with the complete appointed psalmody opened from
          the local public-domain Scripture library. No page numbers.
        </p>
      </header>

      <nav
        aria-label="Jump to a canonical hour"
        className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-7"
      >
        {loadedGuides.map((guide, index) => (
          <a
            className="group rounded-xl border border-stone-300 bg-white/70 px-3 py-3 transition hover:border-emerald-800 hover:bg-emerald-50"
            href={`#office-${guide.hourType}`}
            key={`jump:${guide.hourType}`}
          >
            <span className="font-mono text-[0.68rem] font-bold text-[var(--accent)]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="mt-1 block text-sm font-bold text-stone-950">
              {getHourLabel(guide)}
            </span>
            <span className="mt-1 block text-xs leading-5 text-stone-500">
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

      <aside className="mt-5 rounded-xl border border-stone-300 bg-[var(--panel-soft)] px-4 py-3 text-xs leading-5 text-stone-600 sm:px-5">
        <strong className="text-stone-900">Text boundary:</strong>{" "}
        {DEVOTIONAL_TEXT_BOUNDARY.notice} The canonical schedule and
        public-domain Scripture are identified separately from traditional
        hymn alternatives and original devotional writing.
      </aside>
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
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-stone-300/90 bg-[var(--panel)] shadow-[0_16px_42px_rgba(44,39,31,0.06)]"
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
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-950 text-amber-100 shadow-sm">
              <Icon aria-hidden className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                {hourLabel} · {guide.traditionalName}
              </span>
              <span
                className="mt-1 block font-serif text-2xl font-semibold text-stone-950 sm:text-3xl"
                id={`office-${guide.hourType}-heading`}
              >
                {guide.cycleLabel}
              </span>
              <span className="mt-2 block max-w-3xl text-sm leading-6 text-stone-600">
                {guide.generalNote}
              </span>
              <span className="mt-2 block font-mono text-xs font-semibold text-stone-500">
                {guide.suggestedTime}
              </span>
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className="mt-3 size-5 shrink-0 text-stone-500 transition-transform group-open:rotate-180"
          />
        </summary>

        <div className="border-t border-stone-200 px-4 pb-5 pt-4 sm:px-7 sm:pb-7">
          <section
            aria-label={`${hourLabel} opening`}
            className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5"
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-900">
              Begin
            </p>
            <div className="mt-3 space-y-2 font-serif text-lg leading-8 text-stone-800">
              {guide.openingLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </section>

          {guide.properNotice ? (
            <section className="mt-5 rounded-xl border border-red-900/20 bg-red-50/70 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
                    {guide.properNotice.statusLabel}
                  </p>
                  <h3 className="mt-2 font-serif text-xl font-semibold text-stone-950">
                    {guide.properNotice.title}
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-700">
                    {guide.properNotice.description}
                  </p>
                </div>
                <a
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-red-900/25 bg-white px-4 text-sm font-bold text-[var(--accent)] transition hover:border-red-900 hover:bg-red-50"
                  href={guide.properNotice.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open official proper
                  <ExternalLink aria-hidden className="size-4" />
                </a>
              </div>
            </section>
          ) : null}

          <section
            aria-labelledby={`office-${guide.hourType}-hymn`}
            className="mt-5 overflow-hidden rounded-xl border border-amber-300/80 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(248,243,232,0.78))]"
          >
            <header className="border-b border-amber-300/70 px-4 py-4 sm:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-900">
                Public-domain hymn · traditional alternative
              </p>
              <h3
                className="mt-2 font-serif text-2xl font-semibold text-stone-950"
                id={`office-${guide.hourType}-hymn`}
              >
                {devotional.hymn.title}
              </h3>
              <p className="mt-2 text-xs leading-5 text-stone-600">
                {devotional.hymn.author}
                {devotional.hymn.translator
                  ? ` · translated by ${devotional.hymn.translator}`
                  : ""}{" "}
                · {devotional.hymn.license}
              </p>
            </header>
            <div className="grid gap-5 px-4 py-5 sm:grid-cols-2 sm:px-5 xl:grid-cols-3">
              {devotional.hymn.stanzas.map((stanza) => (
                <div
                  className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2"
                  key={`${devotional.hymn.title}:${stanza.number}`}
                >
                  <span className="font-mono text-xs font-bold text-amber-800">
                    {stanza.number}
                  </span>
                  <p className="whitespace-pre-line font-serif text-base leading-7 text-stone-800">
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
            <details className="group/alternate mt-5 rounded-xl border border-amber-300/80 bg-amber-50/65">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 marker:content-none sm:p-5 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block text-xs font-bold uppercase tracking-[0.14em] text-amber-900">
                    Current psalmody alternative
                  </span>
                  <span className="mt-1 block font-serif text-xl font-semibold text-stone-950">
                    {guide.alternatePsalmody.title}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-stone-700">
                    {guide.alternatePsalmody.instruction}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden
                  className="mt-2 size-5 shrink-0 text-amber-900 transition-transform group-open/alternate:rotate-180"
                />
              </summary>
              <div className="space-y-5 border-t border-amber-300/70 px-4 py-5 sm:px-5">
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

          {guide.rubricNotes?.length ? (
            <section className="mt-5 rounded-xl border border-sky-900/15 bg-sky-50/70 p-4 sm:p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-950">
                What belongs to this Hour
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
                {guide.rubricNotes.map((note) => (
                  <li
                    className="grid grid-cols-[0.8rem_minmax(0,1fr)] gap-2"
                    key={note}
                  >
                    <span aria-hidden className="text-sky-800">
                      •
                    </span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-5 rounded-xl border border-emerald-900/15 bg-emerald-50/70 p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-900">
              {devotional.intercessions.title} · original devotional
            </p>
            <p className="mt-2 font-serif text-lg font-semibold text-stone-900">
              Response: {devotional.intercessions.response}
            </p>
            <ul className="mt-4 grid gap-3 lg:grid-cols-2">
              {devotional.intercessions.petitions.map((petition) => (
                <li
                  className="rounded-xl border border-emerald-900/10 bg-white/70 p-4 text-sm leading-6 text-stone-700"
                  key={petition.id}
                >
                  {petition.text}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-5 text-stone-500">
              {devotional.intercessions.placementNote}
            </p>
          </section>

          <section
            aria-label={`${hourLabel} conclusion`}
            className="mt-5 rounded-xl border border-stone-300 bg-[var(--panel-soft)] p-4 sm:p-5"
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-900">
              Conclude · original devotional guide
            </p>
            <div className="mt-3 rounded-xl border border-stone-200 bg-white/70 p-4">
              <h3 className="font-serif text-xl font-semibold text-stone-950">
                {devotional.concludingPrayer.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-700">
                {devotional.concludingPrayer.prompt}
              </p>
              <p className="mt-2 text-sm italic leading-6 text-stone-600">
                {devotional.concludingPrayer.endingSuggestion}
              </p>
            </div>
            <ol className="mt-4 grid gap-3 md:grid-cols-3">
              {guide.closingSteps.map((step, index) => (
                <li
                  className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-xl border border-emerald-900/10 bg-white/70 p-3"
                  key={`${step.title}:${step.instruction}`}
                >
                  <span className="font-mono text-xs font-bold text-[var(--accent)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-stone-950">
                      {step.title}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-stone-700">
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

  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white/70">
      <header className="flex flex-col gap-3 border-b border-stone-200 bg-[var(--panel-soft)] px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-950 font-mono text-xs font-bold text-amber-100">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <ScrollText aria-hidden className="size-4 shrink-0" />
              <p className="text-xs font-bold uppercase tracking-[0.13em]">
                {anchor.title}
              </p>
            </div>
            <h4 className="mt-1 font-serif text-xl font-semibold text-stone-950 sm:text-2xl">
              {anchor.citation}
            </h4>
            <p className="mt-1 text-xs leading-5 text-stone-500">
              {anchor.reflection}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-xs font-semibold text-stone-500">
          {anchor.role}
        </span>
      </header>

      <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        {anchor.segments.map((segment) => (
          <div key={`${segment.reference}:${segment.verses[0]?.number ?? 0}`}>
            {anchor.segments.length > 1 ? (
              <p className="mb-3 font-mono text-xs font-bold text-stone-500">
                {segment.reference}
              </p>
            ) : null}
            <ol
              aria-label={`${segment.reference} verses`}
              className="space-y-3 font-serif text-lg leading-8 text-stone-800 sm:text-xl sm:leading-9"
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
          <p className="border-l-2 border-amber-500 pl-4 font-serif text-base italic leading-7 text-stone-700">
            {DOXOLOGY}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-stone-200 pt-4">
          <BookOpen aria-hidden className="mr-1 size-4 text-[var(--accent)]" />
          {anchor.segments.map((segment) => (
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-xs font-bold text-emerald-950 transition hover:border-emerald-900 hover:bg-emerald-50"
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
          <span className="ml-auto text-[0.7rem] text-stone-500">
            {anchor.sourceLabel}
          </span>
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
