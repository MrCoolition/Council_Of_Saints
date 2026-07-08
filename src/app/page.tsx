import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Flame,
  LockKeyhole,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { HabitConsole } from "@/components/habit-console";
import { formatPrayerItem } from "@/lib/domain";
import { getDemoTodayPayload, type OfficeGuide } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export default function Home() {
  const today = getDemoTodayPayload();
  const displayDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${today.localDate}T12:00:00`));

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-stone-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--accent)]">
              Sanctum Council
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] text-stone-950 sm:text-5xl">
              {today.motto}
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:flex sm:items-center">
            <StatusPill
              Icon={CalendarDays}
              label={displayDate}
              tone="light"
            />
            <StatusPill Icon={Flame} label={today.liturgicalDay.color} />
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
          <div className="grid gap-4 md:grid-cols-3">
            <Metric
              label="Today"
              value={today.liturgicalDay.title}
              detail={`${today.liturgicalDay.rank} | ${today.liturgicalDay.season}`}
            />
            <Metric
              label="Psalter"
              value={`Week ${today.liturgicalDay.psalterWeek}`}
              detail={today.breviary.currentVolume}
            />
            <Metric
              label="Rule"
              value={`${today.prayerRule.enabledItems.length} anchors`}
              detail={`Difficulty ${today.prayerRule.difficultyLevel}`}
            />
          </div>

          <figure className="relative min-h-64 overflow-hidden rounded-lg border border-stone-300 bg-stone-900">
            <Image
              alt="Closed prayer book and candle on a quiet desk"
              className="object-cover"
              fill
              priority
              src="/devotional-desk.png"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/80 to-transparent p-4 text-sm font-medium text-amber-50">
              Neon stores the structure. The physical breviary carries the
              prayer text.
            </figcaption>
          </figure>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-lg border border-stone-300 bg-[var(--panel)] p-5 shadow-sm">
            <HabitConsole
              enabledItems={today.prayerRule.enabledItems}
              initialLog={today.habitLog}
              localDate={today.localDate}
            />
          </div>

          <CouncilPanel today={today} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {today.officeGuides.map((guide) => (
            <OfficeGuidePanel guide={guide} key={guide.hourType} />
          ))}
        </section>

        <section className="grid gap-4 pb-8 lg:grid-cols-3">
          <InfoPanel
            Icon={ShieldCheck}
            title="Sensitive notes"
            body="Confession, examen faults, scrupulosity notes, and private direction notes are never sent as raw text."
          />
          <InfoPanel
            Icon={LockKeyhole}
            title="Encrypted examen"
            body="The server endpoint accepts ciphertext only, with the encryption key kept outside Neon."
          />
          <InfoPanel
            Icon={BookOpen}
            title="Copyright-safe guide"
            body="The database stores metadata, page references, and instructions, not official prayer text."
          />
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-h-36 rounded-lg border border-stone-300 bg-[var(--panel)] p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-[var(--accent)]">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold leading-tight text-stone-950">
        {value}
      </p>
      <p className="mt-3 text-sm text-stone-600">{detail}</p>
    </div>
  );
}

function StatusPill({
  Icon,
  label,
  tone = "dark",
}: {
  Icon: LucideIcon;
  label: string;
  tone?: "dark" | "light";
}) {
  return (
    <span
      className={[
        "inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold",
        tone === "light"
          ? "border-stone-300 bg-white text-stone-800"
          : "border-emerald-900 bg-emerald-950 text-amber-50",
      ].join(" ")}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function CouncilPanel({
  today,
}: {
  today: ReturnType<typeof getDemoTodayPayload>;
}) {
  const prompt = today.councilPrompt;

  return (
    <section className="rounded-lg border border-emerald-950 bg-emerald-950 p-5 text-amber-50 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-amber-200">
            Council prompt
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{prompt.saintName}</h2>
        </div>
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-amber-100 text-emerald-950">
          <CheckCircle2 aria-hidden className="size-5" />
        </span>
      </div>

      <p className="mt-5 text-lg leading-8 text-amber-50">{prompt.message}</p>

      <div className="mt-5 grid gap-3 border-y border-emerald-800 py-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-emerald-800">
        <PromptStat label="Action" value={prompt.actionItem} />
        <PromptStat label="Virtue" value={prompt.virtueFocus} />
        <PromptStat label="Sacrifice" value={prompt.sacrifice} />
      </div>

      <p className="mt-5 text-sm leading-6 text-amber-100">
        Formation prompts inspired by the lives and charisms of the saints. Not
        private revelation. Not confession. Not spiritual direction. Not an
        official judgment of the Church.
      </p>
    </section>
  );
}

function PromptStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-24 px-0 sm:px-4">
      <p className="text-xs font-semibold uppercase text-amber-200">{label}</p>
      <p className="mt-2 text-sm leading-6 text-amber-50">{value}</p>
    </div>
  );
}

function OfficeGuidePanel({ guide }: { guide: OfficeGuide }) {
  return (
    <section className="rounded-lg border border-stone-300 bg-[var(--panel)] p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">
            {formatPrayerItem(guide.hourType)}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-950">
            {guide.volume} | Psalter Week {guide.psalterWeek}
          </h2>
        </div>
        <span className="inline-flex h-9 items-center rounded-md border border-stone-300 px-3 text-xs font-semibold uppercase text-stone-700">
          Metadata only
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-stone-700">
        {guide.generalNote}
      </p>

      <ol className="mt-4 space-y-3">
        {guide.steps.map((step) => (
          <li
            className="grid gap-3 border-t border-stone-200 pt-3 sm:grid-cols-[3rem_1fr]"
            key={step.order}
          >
            <span className="flex size-10 items-center justify-center rounded-md bg-stone-900 font-mono text-sm text-amber-50">
              {step.order}
            </span>
            <div>
              <p className="text-sm font-semibold capitalize text-stone-950">
                {step.sectionType.replaceAll("_", " ")}
              </p>
              <p className="mt-1 text-sm leading-6 text-stone-700">
                {step.instruction}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                {step.copyrightSafeNote}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function InfoPanel({
  Icon,
  title,
  body,
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <section className="min-h-36 rounded-lg border border-stone-300 bg-[var(--panel)] p-5 shadow-sm">
      <span className="flex size-10 items-center justify-center rounded-md bg-stone-900 text-amber-50">
        <Icon aria-hidden className="size-5" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-stone-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-700">{body}</p>
    </section>
  );
}
