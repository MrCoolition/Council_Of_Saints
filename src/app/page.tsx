import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CircleDot,
  Church,
  Flame,
  Library,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { FormationConsole } from "@/components/formation-console";
import { HolyClock } from "@/components/holy-clock";
import { MiniHolyClock } from "@/components/mini-holy-clock";
import { OfficeGuidePanels } from "@/components/office-guide-panels";
import { formatPrayerItem } from "@/lib/domain";
import { devotionGuides, prayers } from "@/lib/prayers";
import { getRecommendedMysterySet } from "@/lib/rosary";
import { SCRIPTURE_BOOKS } from "@/lib/scripture";
import {
  getHolyMassPageData,
  type HolyMassPageData,
} from "@/server/holy-mass";
import { getTodayPayload } from "@/server/today";

export const dynamic = "force-dynamic";

export default async function Home() {
  const today = await getTodayPayload();
  const mass = await getHolyMassPageData(today);
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
      : "today's prayer");
  const prayerAction =
    today.mode === "demo" ? "Open" : hasStarted ? "Continue" : "Begin";

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-4 sm:gap-14 sm:px-6 sm:py-7 lg:px-8">
        <section
          aria-labelledby="today-heading"
          className="sacred-surface relative isolate overflow-hidden rounded-[2rem] border border-[var(--gilt)]/35 bg-[var(--sanctuary-night)] text-[var(--vellum)] shadow-[var(--shadow-sanctuary)]"
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
            className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(11,28,22,0.98)_0%,rgba(11,28,22,0.91)_52%,rgba(11,20,17,0.55)_100%)]"
          />

          <div className="max-w-4xl p-6 sm:p-9 lg:p-12 xl:max-w-none xl:pr-96">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 text-sm font-semibold text-[var(--vellum)] backdrop-blur-sm">
                <CalendarDays
                  aria-hidden
                  className="size-4 shrink-0 text-[var(--gilt-light)]"
                />
                <time dateTime={today.localDate}>{displayDate}</time>
              </span>
              <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--gilt)]/30 bg-[var(--gilt-light)] px-3 text-sm font-bold text-[var(--sanctuary-night)]">
                <Flame aria-hidden className="size-4 shrink-0" />
                {today.liturgicalDay.color}
              </span>
            </div>

            <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-[var(--gilt-light)]">
              {today.liturgicalDay.rank}
            </p>
            <h1
              className="mt-2 max-w-3xl font-serif text-4xl font-semibold leading-[1.04] tracking-[-0.02em] text-[var(--vellum)] sm:text-6xl lg:text-7xl"
              id="today-heading"
            >
              {today.liturgicalDay.title}
            </h1>
            <p className="mt-5 max-w-xl font-serif text-lg italic leading-7 text-[var(--parchment)]/90 sm:text-xl">
              {today.motto}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--gilt-light)] px-6 text-sm font-bold text-[var(--sanctuary-night)] shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-[var(--vellum)]"
                href="/#office"
              >
                {prayerAction} {nextPrayer}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
              <p className="text-sm font-semibold text-[var(--parchment)]/85">
                {today.breviary.currentVolume} · Psalter Week{" "}
                {today.liturgicalDay.psalterWeek}
              </p>
            </div>
          </div>

          <MiniHolyClock />
        </section>

        <HolyMassPortal data={mass} />

        <HolyClock />

        <OfficeGuidePanels
          guides={today.officeGuides}
          localDate={today.localDate}
        />

        <section aria-labelledby="library-heading">
          <div className="sacred-rule mb-4" />
          <h2
            className="font-serif text-3xl font-semibold text-[var(--foreground)] sm:text-4xl"
            id="library-heading"
          >
            Prayer &amp; Scripture
          </h2>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <PortalLink
              href="/scripture"
              Icon={BookOpen}
              label={`${SCRIPTURE_BOOKS.length} books`}
              title="Sacred Scripture"
            />
            <PortalLink
              href="/rosary"
              Icon={CircleDot}
              label={recommendedMysteries.title}
              title="Guided Rosary"
            />
            <PortalLink
              href="/prayers"
              Icon={Library}
              label={`${prayers.length} prayers · ${devotionGuides.length} devotions`}
              title="Prayers & devotions"
            />
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
      </div>
    </main>
  );
}
function HolyMassPortal({ data }: { data: HolyMassPageData }) {
  const mass = data.daytime;
  const accent = data.anticipated
    ? "var(--gilt)"
    : getMassAccent(mass.liturgicalColor);

  return (
    <section
      aria-labelledby="holy-mass-heading"
      className="sacred-surface relative isolate overflow-hidden rounded-[2rem] border border-[var(--gilt)]/35 bg-[var(--sanctuary-night)] px-5 py-8 text-[var(--vellum)] shadow-[var(--shadow-sanctuary)] sm:px-8 sm:py-10 lg:px-10"
    >
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-1.5 bg-[color:var(--mass-portal-accent)]"
        style={{ "--mass-portal-accent": accent } as CSSProperties}
      />
      <div className="grid gap-8 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full border border-[var(--gilt)]/35 bg-white/5 text-[var(--gilt-light)]">
          <Church aria-hidden className="size-7" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gilt-light)]">
            Holy Mass
          </p>
          <h2
            className="mt-2 max-w-3xl font-serif text-3xl font-semibold leading-tight text-[var(--vellum)] sm:text-4xl"
            id="holy-mass-heading"
          >
            {data.anticipated ? "Saturday & Sunday Anticipated" : mass.title}
          </h2>
          <p className="mt-3 text-sm text-[var(--parchment)]/75">
            {data.anticipated
              ? `${mass.dateLabel} · Saturday or Sunday anticipated`
              : `${mass.dateLabel} · ${mass.liturgicalColor}`}
          </p>
        </div>
        <Link
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--gilt-light)] px-6 text-sm font-bold text-[var(--sanctuary-night)] transition hover:-translate-y-0.5 hover:bg-[var(--vellum)]"
          href="/mass"
        >
          Enter Holy Mass
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
    </section>
  );
}

function getMassAccent(color: string) {
  const normalized = color.toLowerCase();
  if (normalized.includes("violet") || normalized.includes("purple")) {
    return "var(--liturgical-violet)";
  }
  if (normalized.includes("red")) {
    return "var(--liturgical-red)";
  }
  if (normalized.includes("rose")) {
    return "var(--liturgical-rose-ink)";
  }
  if (normalized.includes("white") || normalized.includes("gold")) {
    return "var(--liturgical-gold-ink)";
  }
  if (normalized.includes("black")) {
    return "var(--liturgical-black)";
  }
  if (normalized.includes("silver")) {
    return "var(--liturgical-silver-ink)";
  }
  return "var(--liturgical-green)";
}

function PortalLink({
  href,
  Icon,
  label,
  title,
}: {
  href: string;
  Icon: LucideIcon;
  label: string;
  title: string;
}) {
  return (
    <Link
      className="group grid min-h-32 grid-cols-[3rem_1fr_auto] items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--gilt)] hover:shadow-[var(--shadow-lift)] sm:p-5"
      href={href}
    >
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--sanctuary-night)] text-[var(--gilt-light)] shadow-sm">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
          {label}
        </span>
        <span className="mt-1 block font-serif text-xl font-semibold text-[var(--foreground)]">
          {title}
        </span>
      </span>
      <ArrowRight
        aria-hidden
        className="size-5 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-[var(--ecclesial-green)]"
      />
    </Link>
  );
}
