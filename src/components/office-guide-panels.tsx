import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  Moon,
  ScrollText,
  Sun,
  Sunset,
} from "lucide-react";
import Link from "next/link";
import type { OfficeGuide } from "@/lib/office-psalter";
import { formatPrayerItem } from "@/lib/domain";
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

type LoadedOfficeGuide = Omit<OfficeGuide, "scriptureAnchors"> & {
  scriptureAnchors: LoadedScriptureAnchor[];
};

const DOXOLOGY =
  "Glory be to the Father, and to the Son, and to the Holy Ghost. As it was in the beginning, is now, and ever shall be, world without end. Amen.";

export async function OfficeGuidePanels({ guides }: OfficeGuidePanelsProps) {
  const loadedGuides = await Promise.all(
    guides.map(async (guide) => ({
      ...guide,
      scriptureAnchors: await Promise.all(
        guide.scriptureAnchors.map(loadScriptureAnchor),
      ),
    })),
  );

  return (
    <section
      aria-labelledby="office-guides-heading"
      className="scroll-mt-24"
      id="office"
    >
      <header className="mb-6 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
          Daily Psalter
        </p>
        <h2
          className="mt-2 text-3xl font-semibold text-stone-950 sm:text-4xl"
          id="office-guides-heading"
        >
          The prayer is here. Begin.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
          No page numbers and no placeholder directions. The appointed psalms
          and biblical canticles are opened below in prayer order from the local
          public-domain Scripture library.
        </p>
      </header>

      <div className="space-y-6">
        {loadedGuides.map((guide) => (
          <OfficeHour key={guide.hourType} guide={guide} />
        ))}
      </div>

      <aside className="mt-5 rounded-xl border border-stone-300 bg-[var(--panel-soft)] px-4 py-3 text-xs leading-5 text-stone-600 sm:px-5">
        This Scripture-first personal office follows the Roman four-week
        psalmody and one-week Night Prayer cycle. Proper antiphons, hymns,
        responsories, intercessions, and collects can vary on Sundays, feasts,
        and solemnities and are not reproduced here.
      </aside>
    </section>
  );
}

function OfficeHour({
  guide,
}: {
  guide: LoadedOfficeGuide;
}) {
  const Icon =
    guide.hourType === "morning_prayer"
      ? Sun
      : guide.hourType === "evening_prayer"
        ? Sunset
        : Moon;

  return (
    <article
      aria-labelledby={`office-${guide.hourType}-heading`}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-stone-300/90 bg-[var(--panel)] shadow-[0_16px_42px_rgba(44,39,31,0.06)]"
      id={`office-${guide.hourType}`}
    >
      <details className="group" open>
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 marker:content-none sm:p-7 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-start gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-950 text-amber-100 shadow-sm">
              <Icon aria-hidden className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                {formatPrayerItem(guide.hourType)}
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
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className="mt-3 size-5 shrink-0 text-stone-500 transition-transform group-open:rotate-180"
          />
        </summary>

        <div className="border-t border-stone-200 px-4 pb-5 pt-4 sm:px-7 sm:pb-7">
          <section
            aria-label={`${formatPrayerItem(guide.hourType)} opening`}
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

          <section
            aria-label={`${formatPrayerItem(guide.hourType)} conclusion`}
            className="mt-5 rounded-xl border border-emerald-900/15 bg-emerald-50/70 p-4 sm:p-5"
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-900">
              Respond
            </p>
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
  const shouldPrayDoxology = anchor.title !== "Brief reading";

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
  if (hourType === "morning_prayer") {
    return "office-morning";
  }

  if (hourType === "evening_prayer") {
    return "office-evening";
  }

  return "office-night";
}
