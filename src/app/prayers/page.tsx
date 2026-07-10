import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Compass,
  LibraryBig,
  ShieldCheck,
  Star,
} from "lucide-react";
import { PrayerLibrary } from "@/components/prayer-library";
import { devotionGuides, prayers } from "@/lib/prayers";

export const metadata: Metadata = {
  title: "Prayer Library",
  description:
    "A private treasury of traditional Catholic prayers and original formation guides for daily prayer, the sacraments, Scripture, and adoration.",
};

export default function PrayersPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <nav aria-label="Breadcrumb">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 bg-white/80 px-3 text-sm font-semibold text-stone-700 transition hover:border-emerald-900 hover:text-emerald-950"
            href="/"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Today
          </Link>
        </nav>

        <header className="overflow-hidden rounded-xl border border-emerald-950 bg-emerald-950 text-amber-50 shadow-sm">
          <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)] lg:items-end lg:p-10">
            <div>
              <div className="flex items-center gap-3 text-amber-200">
                <span className="flex size-11 items-center justify-center rounded-full border border-amber-500/40 bg-emerald-900">
                  <BookOpen aria-hidden className="size-5" />
                </span>
                <p className="text-xs font-bold uppercase tracking-[0.2em]">
                  Prayer & devotion
                </p>
              </div>
              <h1 className="mt-6 max-w-4xl font-serif text-4xl font-semibold leading-[1.05] text-amber-50 sm:text-5xl lg:text-6xl">
                A treasury for the whole life of prayer.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-amber-100 sm:text-lg sm:leading-8">
                Keep the Church&apos;s familiar words close, learn a durable
                pattern for prayer, and return to the resources that help you
                answer God with attention and trust.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-1">
              <HeroMetric
                Icon={LibraryBig}
                label="Traditional texts"
                value={`${prayers.length} prayers`}
              />
              <HeroMetric
                Icon={Compass}
                label="Clearly authored"
                value={`${devotionGuides.length} original guides`}
              />
              <HeroMetric
                Icon={Star}
                label="Private by design"
                value="Favorites stay local"
              />
            </div>
          </div>

          <div className="grid border-t border-emerald-800 sm:grid-cols-3 sm:divide-x sm:divide-emerald-800">
            <HeroNote
              Icon={BookOpen}
              text="Older public-domain English forms are preserved and identified."
            />
            <HeroNote
              Icon={ShieldCheck}
              text="Sacramental guides state where a priest's counsel belongs."
            />
            <HeroNote
              Icon={Compass}
              text="Search every prayer, guide step, source note, and Scripture anchor."
            />
          </div>
          <div className="h-1.5 bg-[linear-gradient(90deg,#861f2d_0%,#b98228_52%,#e8cc84_100%)]" />
        </header>

        <PrayerLibrary />

        <footer className="border-t border-stone-300 py-6 text-xs leading-5 text-stone-500">
          <p>
            Prayer texts are traditional and use identified public-domain or
            common English forms; older forms retain words such as
            &ldquo;Thee,&rdquo; &ldquo;Thy,&rdquo; and &ldquo;Holy
            Ghost.&rdquo; Formation guides are original Sanctum Council text,
            not liturgical or sacramental formulas.
          </p>
        </footer>
      </div>
    </main>
  );
}

function HeroMetric({
  Icon,
  label,
  value,
}: {
  Icon: typeof BookOpen;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-emerald-700 bg-emerald-900 p-3">
      <Icon aria-hidden className="size-4 text-amber-200" />
      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-amber-200">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold leading-5 text-amber-50">
        {value}
      </p>
    </div>
  );
}

function HeroNote({
  Icon,
  text,
}: {
  Icon: typeof BookOpen;
  text: string;
}) {
  return (
    <div className="flex gap-3 border-t border-emerald-800 px-6 py-4 first:border-t-0 sm:border-t-0">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-amber-100 text-emerald-950">
        <Icon aria-hidden className="size-4" />
      </span>
      <p className="text-xs leading-5 text-amber-100">{text}</p>
    </div>
  );
}
