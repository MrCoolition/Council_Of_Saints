import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { PrayerLibrary } from "@/components/prayer-library";

export const metadata: Metadata = {
  title: "Prayer Library",
  description:
    "Traditional Catholic prayers for daily prayer, the sacraments, Scripture, and adoration.",
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

        <header className="overflow-hidden rounded-xl border border-sanctuary-night bg-sanctuary-night text-vellum shadow-sm">
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="max-w-4xl">
              <div className="flex items-center gap-3 text-[var(--gilt-light)]">
                <span className="flex size-11 items-center justify-center rounded-full border border-gilt/40 bg-ecclesial-green">
                  <BookOpen aria-hidden className="size-5" />
                </span>
                <p className="text-xs font-bold uppercase tracking-[0.2em]">
                  Prayer & devotion
                </p>
              </div>
              <h1 className="mt-6 max-w-4xl font-serif text-4xl font-semibold leading-[1.05] text-vellum sm:text-5xl lg:text-6xl">
                A treasury for the whole life of prayer.
              </h1>
            </div>
          </div>
          <div className="h-1.5 bg-[linear-gradient(90deg,var(--oxblood)_0%,var(--gilt)_52%,var(--gilt-light)_100%)]" />
        </header>

        <PrayerLibrary />
      </div>
    </main>
  );
}
