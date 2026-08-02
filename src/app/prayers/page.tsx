import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { PrayerLibrary } from "@/components/prayer-library";

export const metadata: Metadata = {
  title: "Catholic Prayer Treasury",
  description:
    "A comprehensive treasury of traditional Catholic prayers, litanies, novenas, chaplets, and guided devotions.",
};

export default function PrayersPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <nav aria-label="Breadcrumb">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-hairline bg-vellum/80 px-3 text-sm font-semibold text-foreground transition hover:border-ecclesial-green hover:text-ecclesial-green"
            href="/"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Today
          </Link>
        </nav>

        <header className="relative isolate overflow-hidden rounded-[2rem] border border-gilt/30 bg-sanctuary-night text-vellum shadow-[var(--shadow-raised)]">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_28%,rgba(217,180,94,0.18),transparent_29%),radial-gradient(circle_at_14%_120%,rgba(255,255,255,0.08),transparent_42%)]"
          />
          <div className="p-6 sm:p-9 lg:p-12">
            <div className="max-w-5xl">
              <div className="flex items-center gap-3 text-[var(--gilt-light)]">
                <span className="flex size-12 items-center justify-center rounded-full border border-gilt/40 bg-ecclesial-green shadow-[0_0_30px_rgb(198_161_91/0.16)]">
                  <BookOpen aria-hidden className="size-5.5" />
                </span>
                <p className="text-xs font-bold uppercase tracking-[0.2em]">
                  The treasury of the Church
                </p>
              </div>
              <h1 className="mt-7 max-w-4xl font-serif text-4xl font-semibold leading-[1.02] text-vellum sm:text-5xl lg:text-7xl">
                Every hour. Every need. Turn to God.
              </h1>
              <p className="mt-5 max-w-2xl font-serif text-lg leading-8 text-vellum/78 sm:text-xl">
                Prayers, litanies, novenas, and devotions—opened directly into
                a quiet place to pray.
              </p>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gilt-light)]/85">
                <span>Traditional prayers</span>
                <span aria-hidden>✦</span>
                <span>Sacred devotions</span>
                <span aria-hidden>✦</span>
                <span>Prayer by need</span>
              </div>
            </div>
          </div>
          <div className="h-1.5 bg-[linear-gradient(90deg,var(--oxblood)_0%,var(--gilt)_52%,var(--gilt-light)_100%)]" />
        </header>

        <PrayerLibrary />
      </div>
    </main>
  );
}
