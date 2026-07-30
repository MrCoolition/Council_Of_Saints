import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Landmark,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import type {
  DouayScriptureSource,
  MassReadingOption,
  MassReadingsEntry,
  MassResponsorialPsalm,
  MassScriptureSelection,
  OfficialMassReadingSource,
} from "../lib/mass-readings";
import { getScriptureHref } from "../lib/scripture";
import {
  loadScripturePassage,
  type LoadedScriptureSegment,
} from "../server/scripture-passages";

type MassReadingsPanelProps = {
  entry: MassReadingsEntry;
};

type LoadedSelection<
  Selection extends MassScriptureSelection = MassScriptureSelection,
> = {
  selection: Selection;
  segments: LoadedScriptureSegment[];
};

type LoadedPsalm = LoadedSelection<MassResponsorialPsalm> & {
  refrainSources: {
    source: DouayScriptureSource;
    segments: LoadedScriptureSegment[];
  }[];
};

type LoadedOption = {
  option: MassReadingOption;
  firstReading: LoadedSelection;
  responsorialPsalm: LoadedPsalm;
  gospelAcclamation: LoadedSelection;
  gospelChoices: LoadedSelection[];
};

export async function MassReadingsPanel({
  entry,
}: MassReadingsPanelProps) {
  if (entry.status === "metadata-only") {
    return <MassReadingsFallback entry={entry} />;
  }

  const loadedOptions = await Promise.all(entry.options.map(loadOption));

  return (
    <section
      aria-labelledby="mass-readings-heading"
      className="scroll-mt-24"
      id="mass-readings"
    >
      <header className="overflow-hidden rounded-2xl border border-emerald-900/20 bg-[var(--panel)] shadow-[0_16px_42px_rgba(44,39,31,0.06)]">
        <div className="grid gap-6 bg-[linear-gradient(130deg,rgba(2,44,34,0.98),rgba(5,72,55,0.94))] px-5 py-6 text-amber-50 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-amber-200">
              <Landmark aria-hidden className="size-5" />
              <p className="text-xs font-bold uppercase tracking-[0.17em]">
                Mass readings - valid options
              </p>
            </div>
            <h2
              className="mt-3 max-w-3xl font-serif text-3xl font-semibold leading-tight text-amber-50 sm:text-4xl"
              id="mass-readings-heading"
            >
              {entry.observance.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-amber-100/90">
              <time dateTime={entry.localDate}>
                {formatDisplayDate(entry.localDate)}
              </time>
              {" · "}
              U.S. Lectionary nos.{" "}
              {entry.observance.lectionaryNumbers.join(" and ")}
              {" · "}
              {entry.observance.liturgicalColor}
            </p>
          </div>
          <span className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-amber-200/30 bg-amber-100 px-4 text-sm font-bold text-emerald-950">
            <CheckCircle2 aria-hidden className="size-4" />
            Both paths are permitted
          </span>
        </div>

      </header>

      <section
        aria-labelledby="mass-options-heading"
        className="mt-6 rounded-2xl border border-emerald-900/15 bg-emerald-50/55 p-4 sm:p-5"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2
            aria-hidden
            className="mt-0.5 size-5 shrink-0 text-emerald-800"
          />
          <div>
            <h3
              className="font-serif text-xl font-semibold text-stone-950"
              id="mass-options-heading"
            >
              Both listed options are liturgically valid
            </h3>
            <p className="mt-1 text-sm leading-6 text-stone-700">
              {entry.validityExplanation}
            </p>
            <p className="mt-2 text-xs leading-5 text-stone-600">
              {entry.additionalPermittedChoiceNote}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-6 space-y-6">
        {loadedOptions.map((loadedOption, index) => (
          <MassOption
            index={index}
            key={loadedOption.option.id}
            loadedOption={loadedOption}
          />
        ))}
      </div>

      <OfficialSources sources={entry.officialSources} />
    </section>
  );
}

async function loadOption(option: MassReadingOption): Promise<LoadedOption> {
  const [
    firstReading,
    responsorialPsalm,
    gospelAcclamation,
    gospelChoices,
  ] = await Promise.all([
    loadSelection(option.firstReading),
    loadPsalm(option.responsorialPsalm),
    loadSelection(option.gospelAcclamation),
    Promise.all(option.gospelChoices.map((choice) => loadSelection(choice))),
  ]);

  return {
    option,
    firstReading,
    responsorialPsalm,
    gospelAcclamation,
    gospelChoices,
  };
}

async function loadSelection<Selection extends MassScriptureSelection>(
  selection: Selection,
): Promise<LoadedSelection<Selection>> {
  const segments = await Promise.all(
    selection.douaySource.passages.map((passage) =>
      loadScripturePassage(passage),
    ),
  );

  return { selection, segments };
}

async function loadPsalm(
  psalm: MassResponsorialPsalm,
): Promise<LoadedPsalm> {
  const [loadedPsalm, refrainSources] = await Promise.all([
    loadSelection(psalm),
    Promise.all(
      psalm.refrainDouaySources.map(async (source) => ({
        source,
        segments: await Promise.all(
          source.passages.map((passage) =>
            loadScripturePassage(passage),
          ),
        ),
      })),
    ),
  ]);

  return {
    ...loadedPsalm,
    refrainSources,
  };
}

function MassOption({
  index,
  loadedOption,
}: {
  index: number;
  loadedOption: LoadedOption;
}) {
  const { option } = loadedOption;
  const headingId = `mass-option-${option.id}-heading`;

  return (
    <article
      aria-labelledby={headingId}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-stone-300/90 bg-[var(--panel)] shadow-[0_16px_42px_rgba(44,39,31,0.06)]"
      id={`mass-option-${option.id}`}
    >
      <details className="group" open={index === 0}>
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 marker:content-none sm:p-7 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-start gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-950 font-mono text-sm font-bold text-amber-100 shadow-sm">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold uppercase tracking-[0.15em] text-[var(--accent)]">
                Valid Mass option
              </span>
              <h3
                className="mt-1 font-serif text-2xl font-semibold text-stone-950 sm:text-3xl"
                id={headingId}
              >
                {option.label}
              </h3>
              <span className="mt-2 block max-w-3xl text-sm leading-6 text-stone-600">
                {option.description}
              </span>
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className="mt-3 size-5 shrink-0 text-stone-500 transition-transform group-open:rotate-180"
          />
        </summary>

        <div className="space-y-5 border-t border-stone-200 px-4 pb-5 pt-5 sm:px-7 sm:pb-7">
          <ReadingCard
            cardId={`${option.id}-first-reading`}
            loaded={loadedOption.firstReading}
            title={option.firstReading.title}
          />

          <PsalmCard
            cardId={`${option.id}-responsorial-psalm`}
            loaded={loadedOption.responsorialPsalm}
          />

          <ReadingCard
            cardId={`${option.id}-gospel-acclamation`}
            loaded={loadedOption.gospelAcclamation}
            title={option.gospelAcclamation.title}
          />

          <section
            aria-labelledby={`${option.id}-gospel-choices-heading`}
            className="rounded-2xl border border-amber-300/80 bg-amber-50/65 p-4 sm:p-5"
          >
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-900">
                Proper Gospel
              </p>
              <h4
                className="mt-1 font-serif text-2xl font-semibold text-stone-950"
                id={`${option.id}-gospel-choices-heading`}
              >
                Choose either Gospel
              </h4>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                Both Gospel choices below are permitted for this Memorial.
              </p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {loadedOption.gospelChoices.map((choice, choiceIndex) => (
                <ReadingCard
                  cardId={`${option.id}-gospel-${choiceIndex + 1}`}
                  compact
                  key={`${option.id}:${choice.selection.displayCitation}`}
                  loaded={choice}
                  title={`Gospel choice ${choiceIndex + 1}`}
                />
              ))}
            </div>
          </section>
        </div>
      </details>
    </article>
  );
}

function ReadingCard({
  cardId,
  compact = false,
  loaded,
  title,
}: {
  cardId: string;
  compact?: boolean;
  loaded: LoadedSelection;
  title: string;
}) {
  return (
    <section
      aria-labelledby={`${cardId}-heading`}
      className="overflow-hidden rounded-xl border border-stone-200 bg-white/75"
    >
      <header className="border-b border-stone-200 bg-[var(--panel-soft)] px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2 text-[var(--accent)]">
          <ScrollText aria-hidden className="size-4" />
          <h4
            className="text-xs font-bold uppercase tracking-[0.14em]"
            id={`${cardId}-heading`}
          >
            {title}
          </h4>
        </div>
        <p className="mt-2 font-serif text-xl font-semibold text-stone-950 sm:text-2xl">
          {loaded.selection.displayCitation}
        </p>
        <p className="mt-1 text-xs leading-5 text-stone-500">
          Local text: {loaded.selection.douaySource.citation}
        </p>
      </header>

      <div className={compact ? "px-4 py-5" : "px-4 py-5 sm:px-6 sm:py-6"}>
        <VerseSegments segments={loaded.segments} />
        <PassageLinks segments={loaded.segments} />
        <p className="mt-3 text-[0.7rem] leading-5 text-stone-500">
          {loaded.selection.douaySource.translationLabel}
        </p>
      </div>
    </section>
  );
}

function PsalmCard({
  cardId,
  loaded,
}: {
  cardId: string;
  loaded: LoadedPsalm;
}) {
  return (
    <section
      aria-labelledby={`${cardId}-heading`}
      className="overflow-hidden rounded-xl border border-stone-200 bg-white/75"
    >
      <header className="border-b border-stone-200 bg-[var(--panel-soft)] px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2 text-[var(--accent)]">
          <ScrollText aria-hidden className="size-4" />
          <h4
            className="text-xs font-bold uppercase tracking-[0.14em]"
            id={`${cardId}-heading`}
          >
            {loaded.selection.title}
          </h4>
        </div>
        <p className="mt-2 font-serif text-xl font-semibold text-stone-950 sm:text-2xl">
          {loaded.selection.displayCitation}
        </p>
        <p className="mt-1 text-xs leading-5 text-stone-500">
          Local text: {loaded.selection.douaySource.citation}
        </p>
      </header>

      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          {loaded.refrainSources.map(({ source, segments }, index) => (
            <blockquote
              className="rounded-xl border border-amber-300/80 bg-amber-50/80 p-4"
              key={`${source.citation}:${index}`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-amber-900">
                Refrain source verse
                {loaded.refrainSources.length > 1
                  ? ` ${index + 1}`
                  : ""}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                {loaded.selection.refrainDisplayCitations[index] ??
                  source.citation}
              </p>
              <div className="mt-2 space-y-2 font-serif text-base leading-7 text-stone-800">
                {segments.flatMap((segment) =>
                  segment.verses.map((verse) => (
                    <p key={`${segment.reference}:${verse.number}`}>
                      <span className="sr-only">Verse {verse.label}. </span>
                      {verse.text}
                    </p>
                  )),
                )}
              </div>
              <p className="mt-2 text-[0.68rem] text-stone-500">
                Full public-domain Douay source verse
              </p>
            </blockquote>
          ))}
        </div>

        <VerseSegments segments={loaded.segments} />
        <PassageLinks segments={loaded.segments} />
        <p className="mt-3 text-[0.7rem] leading-5 text-stone-500">
          {loaded.selection.douaySource.translationLabel}
        </p>
      </div>
    </section>
  );
}

function VerseSegments({
  segments,
}: {
  segments: LoadedScriptureSegment[];
}) {
  return (
    <div className="space-y-6">
      {segments.map((segment, segmentIndex) => (
        <div key={`${segment.reference}:${segmentIndex}`}>
          {segments.length > 1 ? (
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
    </div>
  );
}

function PassageLinks({
  segments,
}: {
  segments: LoadedScriptureSegment[];
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-stone-200 pt-4">
      <BookOpen
        aria-hidden
        className="mr-1 size-4 shrink-0 text-[var(--accent)]"
      />
      {segments.map((segment, index) => (
        <Link
          aria-label={`Open ${segment.reference} in the Scripture reader`}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-xs font-bold text-emerald-950 transition hover:border-emerald-900 hover:bg-emerald-50"
          href={getScriptureHref(segment.passage, "mass")}
          key={`${segment.reference}:${index}`}
        >
          Open {segment.reference}
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      ))}
    </div>
  );
}

function MassReadingsFallback({
  entry,
}: {
  entry: Extract<MassReadingsEntry, { status: "metadata-only" }>;
}) {
  return (
    <section
      aria-labelledby="mass-readings-heading"
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-stone-300/90 bg-[var(--panel)] shadow-[0_16px_42px_rgba(44,39,31,0.06)]"
      id="mass-readings"
    >
      <header className="bg-[linear-gradient(130deg,rgba(2,44,34,0.98),rgba(5,72,55,0.94))] px-5 py-6 text-amber-50 sm:px-8 sm:py-8">
        <div className="flex items-center gap-2 text-amber-200">
          <Landmark aria-hidden className="size-5" />
          <p className="text-xs font-bold uppercase tracking-[0.17em]">
            Mass readings
          </p>
        </div>
        <h2
          className="mt-3 max-w-3xl font-serif text-3xl font-semibold text-amber-50 sm:text-4xl"
          id="mass-readings-heading"
        >
          Open the official readings for{" "}
          <time dateTime={entry.localDate}>
            {formatDisplayDate(entry.localDate)}
          </time>
        </h2>
      </header>

      <div className="p-5 sm:p-7">
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-900">
            No local transcription
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-700">
            {entry.notice}
          </p>
        </div>

        <OfficialSources sources={entry.officialSources} />
      </div>
    </section>
  );
}

function OfficialSources({
  sources,
}: {
  sources: readonly OfficialMassReadingSource[];
}) {
  return (
    <section
      aria-labelledby="mass-official-sources-heading"
      className="mt-6 rounded-2xl border border-stone-300 bg-[var(--panel-soft)] p-5 sm:p-6"
    >
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
        Verify at the source
      </p>
      <h3
        className="mt-2 font-serif text-2xl font-semibold text-stone-950"
        id="mass-official-sources-heading"
      >
        Official USCCB references
      </h3>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {sources.map((source) => (
          <li key={source.url}>
            <a
              className="group flex min-h-12 items-center justify-between gap-3 rounded-xl border border-stone-300 bg-white/80 px-4 py-3 text-sm font-bold text-emerald-950 transition hover:border-emerald-900 hover:bg-emerald-50"
              href={source.url}
              rel="noreferrer"
              target="_blank"
            >
              <span>
                <span className="block text-[0.65rem] uppercase tracking-[0.12em] text-stone-500">
                  {source.authority}
                </span>
                <span className="mt-0.5 block">{source.label}</span>
              </span>
              <ExternalLink
                aria-hidden
                className="size-4 shrink-0 text-stone-500 transition group-hover:text-emerald-900"
              />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatDisplayDate(localDate: string) {
  const [year, month, day] = localDate
    .split("-")
    .map((part) => Number(part));

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
