import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CircleDot,
  Flame,
  Library,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormationConsole } from "@/components/formation-console";
import { MassReadingsPanel } from "@/components/mass-readings-panel";
import { OfficeGuidePanels } from "@/components/office-guide-panels";
import { formatPrayerItem } from "@/lib/domain";
import {
  getRecommendedMysterySet,
  MYSTERY_SETS,
} from "@/lib/rosary";
import { SCRIPTURE_BOOKS } from "@/lib/scripture";
import { getTodayPayload } from "@/server/today";

export const dynamic = "force-dynamic";

const rosaryMysteryCount = MYSTERY_SETS.reduce(
  (total, mysterySet) => total + mysterySet.mysteries.length,
  0,
);

export default async function Home() {
  const today = await getTodayPayload();
  const currentDate = new Date(`${today.localDate}T12:00:00`);
  const displayDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(currentDate);
  const recommendedMysteries = getRecommendedMysterySet(
    currentDate,
    today.liturgicalDay.season,
  );
  const primaryMassCitation =
    today.massReadings.status === "curated"
      ? today.massReadings.options[0].firstReading.displayCitation
      : "Official USCCB readings";
  const hasStarted = Object.keys(today.habitLog).length > 0;
  const enabledGuides = today.officeGuides.filter((guide) =>
    today.prayerRule.enabledItems.includes(
      guide.prayerItemType ?? "morning_prayer",
    ),
  );
  const nextGuide =
    enabledGuides.find(
      (guide) =>
        today.habitLog[guide.prayerItemType ?? "morning_prayer"] !== "done",
    ) ?? enabledGuides.at(-1) ?? today.officeGuides.at(-1);
  const nextPrayer =
    nextGuide?.hourLabel ??
    (nextGuide?.prayerItemType
      ? formatPrayerItem(nextGuide.prayerItemType)
      : "today’s prayer");
  const prayerAction =
    today.mode === "demo" ? "Open" : hasStarted ? "Continue" : "Begin";

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-4 sm:gap-12 sm:px-6 sm:py-7 lg:px-8">
        <section
          aria-labelledby="today-heading"
          className="relative isolate overflow-hidden rounded-2xl border border-emerald-900 bg-emerald-950 text-amber-50 shadow-[0_24px_64px_rgba(3,46,34,0.18)]"
        >
          <Image
            alt="Closed prayer book and candle on a quiet desk"
            className="-z-20 object-cover object-[56%_center]"
            fill
            preload
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) calc(100vw - 3rem), 80rem"
            src="/devotional-desk.png"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(2,44,34,0.98)_0%,rgba(2,44,34,0.9)_48%,rgba(20,18,15,0.54)_100%)]"
          />

          <div className="max-w-3xl p-5 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 text-sm font-semibold text-amber-50 backdrop-blur-sm">
                <CalendarDays aria-hidden className="size-4 shrink-0 text-amber-200" />
                <time dateTime={today.localDate}>{displayDate}</time>
              </span>
              <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-200/25 bg-amber-100 px-3 text-sm font-bold text-emerald-950">
                <Flame aria-hidden className="size-4 shrink-0" />
                {today.liturgicalDay.color}
              </span>
            </div>

            <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
              {today.liturgicalDay.rank} · Today in the U.S. Church calendar
            </p>
            <h1
              className="mt-2 max-w-2xl text-3xl font-semibold leading-[1.06] text-amber-50 sm:text-5xl lg:text-6xl"
              id="today-heading"
            >
              {today.liturgicalDay.title}
            </h1>
            <p className="mt-4 max-w-xl font-serif text-lg leading-7 text-amber-100 sm:text-xl">
              {today.motto}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-100 px-5 text-sm font-bold text-emerald-950 shadow-lg shadow-black/15 transition hover:bg-amber-50"
                href="/#office"
              >
                {prayerAction} {nextPrayer}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
              <p className="text-sm font-semibold text-amber-100">
                {today.breviary.currentVolume} · Psalter Week{" "}
                {today.liturgicalDay.psalterWeek}
              </p>
            </div>
            <p className="mt-4 max-w-2xl text-xs leading-5 text-amber-100/80">
              {today.liturgicalDay.sourceUrl ? (
                <a
                  className="font-semibold underline decoration-amber-200/50 underline-offset-4 hover:decoration-amber-100"
                  href={today.liturgicalDay.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {today.liturgicalDay.sourceLabel}
                </a>
              ) : (
                (today.liturgicalDay.sourceLabel ?? "Local calendar fallback")
              )}{" "}
              ·{" "}
              {today.liturgicalDay.weekdayCycle ?? "Weekday cycle"} ·{" "}
              {today.liturgicalDay.sundayCycle ?? "Sunday cycle"}
            </p>
          </div>
        </section>

        <MassReadingsPanel entry={today.massReadings} />

        <section aria-labelledby="library-heading">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                Your oratory
              </p>
              <h2
                className="mt-2 text-3xl font-semibold text-stone-950 sm:text-4xl"
                id="library-heading"
              >
                Everything needed to begin
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-stone-600">
              Read, contemplate, and pray without losing the thread of the day.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <PortalLink
              detail="The complete Catholic canon in a focused local reader."
              href="/scripture"
              Icon={BookOpen}
              label={`${SCRIPTURE_BOOKS.length} books`}
              title="Sacred Scripture"
            />
            <PortalLink
              detail={`${recommendedMysteries.title} are recommended today.`}
              href="/rosary"
              Icon={CircleDot}
              label={`${rosaryMysteryCount} mysteries`}
              title="Guided Rosary"
            />
            <PortalLink
              detail="Traditional prayers and clear guides for daily devotion."
              href="/prayers"
              Icon={Library}
              label="Prayer library"
              title="Prayers & devotions"
            />
          </div>
        </section>

        <section
          aria-labelledby="daily-path-heading"
          className="border-y border-stone-300 py-6 sm:py-8"
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(14rem,0.55fr)_minmax(0,1.45fr)] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                A simple path
              </p>
              <h2
                className="mt-2 text-3xl font-semibold text-stone-950"
                id="daily-path-heading"
              >
                Receive. Contemplate. Respond.
              </h2>
            </div>

            <ol className="grid gap-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-stone-300">
              <PathStep
                detail={primaryMassCitation}
                label="Receive the Word"
                number="01"
              />
              <PathStep
                detail={recommendedMysteries.title}
                label="Contemplate with Mary"
                number="02"
              />
              <PathStep
                detail={`${today.breviary.currentVolume}, Week ${today.liturgicalDay.psalterWeek}`}
                label="Keep the hours"
                number="03"
              />
            </ol>
          </div>
        </section>

        <FormationConsole
          defaultDifficultyLevel={today.prayerRule.difficultyLevel}
          defaultEnabledItems={today.prayerRule.enabledItems}
          initialHistory={today.habitHistory}
          initialLog={today.habitLog}
          initialSaveMode={today.mode === "database" ? "account" : "device"}
          localDate={today.localDate}
        />

        <OfficeGuidePanels guides={today.officeGuides} />

        <footer className="border-t border-stone-300 py-6 text-sm leading-6 text-stone-500">
          <p>
            Scripture source labels and licensing are shown wherever text is
            presented. The Daily Psalter is stored locally with the app; no
            physical-book page numbers are required.
          </p>
        </footer>
      </div>
    </main>
  );
}

function PortalLink({
  detail,
  href,
  Icon,
  label,
  title,
}: {
  detail: string;
  href: string;
  Icon: LucideIcon;
  label: string;
  title: string;
}) {
  return (
    <Link
      className="group grid min-h-40 grid-cols-[3rem_1fr_auto] items-start gap-4 rounded-2xl border border-stone-300/90 bg-[var(--panel)] p-4 shadow-[0_12px_34px_rgba(44,39,31,0.045)] transition hover:-translate-y-0.5 hover:border-emerald-800 hover:shadow-[0_18px_40px_rgba(3,46,34,0.09)] sm:p-5"
      href={href}
    >
      <span className="inline-flex size-12 items-center justify-center rounded-xl bg-emerald-950 text-amber-100 shadow-sm">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
          {label}
        </span>
        <span className="mt-1 block font-serif text-xl font-semibold text-stone-950">
          {title}
        </span>
        <span className="mt-2 block text-sm leading-6 text-stone-600">
          {detail}
        </span>
      </span>
      <ArrowRight
        aria-hidden
        className="mt-1 size-5 text-stone-400 transition group-hover:translate-x-1 group-hover:text-emerald-900"
      />
    </Link>
  );
}

function PathStep({
  detail,
  label,
  number,
}: {
  detail: string;
  label: string;
  number: string;
}) {
  return (
    <li className="grid grid-cols-[2.5rem_1fr] gap-3 sm:px-5 sm:first:pl-0 sm:last:pr-0">
      <span className="font-mono text-sm font-bold text-[var(--accent)]">
        {number}
      </span>
      <span>
        <span className="block text-sm font-bold text-stone-950">{label}</span>
        <span className="mt-1 block text-sm leading-6 text-stone-600">
          {detail}
        </span>
      </span>
    </li>
  );
}
