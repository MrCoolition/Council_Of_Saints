"use client";

import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  ChevronRight,
  Church,
  Clock,
  Cross,
  Heart,
  Library,
  Moon,
  Search,
  Shield,
  SlidersHorizontal,
  Star,
  Sunrise,
  Type,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  devotionGuidePrayerSlugs,
  devotionGuides,
  formationGuideCategories,
  prayerCategories,
  prayers,
  type DevotionGuide,
  type FormationGuideCategory,
  type Prayer,
  type PrayerCategory,
} from "@/lib/prayers";

type LibraryScope =
  | "all"
  | "prayers"
  | "litanies"
  | "hymns"
  | "devotions"
  | "favorites";
type LibraryCategory = PrayerCategory | FormationGuideCategory;

type PrayerLibraryItem = {
  id: string;
  kind: "prayer";
  category: PrayerCategory;
  searchText: string;
  prayer: Prayer;
};

type GuideLibraryItem = {
  id: string;
  kind: "guide";
  category: FormationGuideCategory;
  searchText: string;
  guide: DevotionGuide;
};

type LibraryItem = PrayerLibraryItem | GuideLibraryItem;

const favoritesStorageKey = "sanctum-council:prayer-favorites:v1";

const libraryItems: LibraryItem[] = [
  ...prayers.map(
    (prayer): PrayerLibraryItem => ({
      id: `prayer:${prayer.slug}`,
      kind: "prayer",
      category: prayer.category,
      prayer,
      searchText: normalizeText(
        [
          prayer.title,
          prayer.category,
          prayer.form ?? "Prayer",
          prayer.latinTitle ?? "",
          prayer.summary,
          prayer.whenToPray,
          ...(prayer.keywords ?? []),
          ...prayer.text,
        ].join(" "),
      ),
    }),
  ),
  ...devotionGuides.map(
    (guide): GuideLibraryItem => ({
      id: `guide:${guide.slug}`,
      kind: "guide",
      category: guide.category,
      guide,
      searchText: normalizeText(
        [
          guide.title,
          guide.category,
          guide.eyebrow,
          guide.summary,
          guide.duration,
          ...guide.steps.flatMap((step) => [
            step.title,
            step.instruction,
            step.scripture ?? "",
          ]),
        ].join(" "),
      ),
    }),
  ),
];

const validFavoriteIds = new Set(libraryItems.map((item) => item.id));
const prayerBySlug = new Map(prayers.map((prayer) => [prayer.slug, prayer]));
const litanyCount = prayers.filter((prayer) => prayer.form === "Litany").length;
const hymnForms = new Set(["Canticle", "Hymn", "Psalm"]);
const hymnCount = prayers.filter((prayer) =>
  hymnForms.has(prayer.form ?? "Prayer"),
).length;

const prayerPaths = [
  { label: "Begin the day", query: "morning", Icon: Sunrise },
  { label: "Mass & Communion", query: "communion", Icon: Church },
  { label: "Confession", query: "confession", Icon: Cross },
  { label: "Protection", query: "protection", Icon: Shield },
  { label: "Family", query: "family", Icon: Users },
  { label: "Work & decisions", query: "work", Icon: Briefcase },
  { label: "Healing", query: "healing", Icon: Heart },
  { label: "The departed", query: "departed", Icon: Moon },
] as const;

export function PrayerLibrary() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<LibraryScope>("all");
  const [category, setCategory] = useState<LibraryCategory | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [storageReady, setStorageReady] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [largePrint, setLargePrint] = useState(false);
  const readerHeadingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    const loadState = window.setTimeout(() => {
      setFavorites(readStoredFavorites());
      setStorageReady(true);
      setSelectedItemId(readItemIdFromHash());
    }, 0);

    const syncHash = () => setSelectedItemId(readItemIdFromHash());
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    return () => {
      window.clearTimeout(loadState);
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, []);

  useEffect(() => {
    if (!selectedItemId) {
      return;
    }

    const focusReader = window.setTimeout(
      () => readerHeadingRef.current?.focus(),
      0,
    );
    return () => window.clearTimeout(focusReader);
  }, [selectedItemId]);

  const visibleCategories =
    scope === "devotions" ? formationGuideCategories : prayerCategories;

  const filteredItems = useMemo(() => {
    const queryTerms = normalizeText(query.trim())
      .split(/\s+/)
      .filter(Boolean);

    return libraryItems.filter((item) => {
      if (scope === "prayers" && item.kind !== "prayer") {
        return false;
      }
      if (
        scope === "litanies" &&
        (item.kind !== "prayer" || item.prayer.form !== "Litany")
      ) {
        return false;
      }
      if (
        scope === "hymns" &&
        (item.kind !== "prayer" ||
          !hymnForms.has(item.prayer.form ?? "Prayer"))
      ) {
        return false;
      }
      if (scope === "devotions" && item.kind !== "guide") {
        return false;
      }
      if (scope === "favorites" && !favorites.has(item.id)) {
        return false;
      }
      if (category && item.category !== category) {
        return false;
      }
      return queryTerms.every((term) => item.searchText.includes(term));
    });
  }, [category, favorites, query, scope]);

  const selectedItem = selectedItemId
    ? libraryItems.find((item) => item.id === selectedItemId) ?? null
    : null;
  const filtersActive =
    query.trim().length > 0 || scope !== "all" || category !== null;

  function selectScope(nextScope: LibraryScope) {
    setScope(nextScope);
    setCategory(null);
  }

  function toggleFavorite(itemId: string) {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      writeStoredFavorites(next);
      return next;
    });
  }

  function clearFilters() {
    setQuery("");
    setScope("all");
    setCategory(null);
  }

  function selectPrayerPath(queryValue: string) {
    setQuery(queryValue);
    setScope("prayers");
    setCategory(null);
  }

  function openItem(itemId: string) {
    setSelectedItemId(itemId);
    window.history.pushState(null, "", `#${encodeURIComponent(itemId)}`);
  }

  function closeReader() {
    const closingId = selectedItemId;
    setSelectedItemId(null);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    if (closingId) {
      window.setTimeout(
        () => document.getElementById(resultId(closingId))?.focus(),
        0,
      );
    }
  }

  return (
    <section aria-labelledby="prayer-library-heading" className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-hairline bg-[var(--panel)] shadow-[var(--shadow-raised)]">
        <div className="grid gap-5 border-b border-hairline p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <SlidersHorizontal aria-hidden className="size-4" />
              <p className="text-xs font-bold uppercase tracking-[0.15em]">
                Find a prayer
              </p>
            </div>
            <h2
              className="mt-2 font-serif text-2xl font-semibold text-foreground sm:text-3xl"
              id="prayer-library-heading"
            >
              The Catholic prayer treasury
            </h2>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
            <span className="rounded-full border border-gilt/40 bg-gilt/10 px-3 py-2">
              {prayers.length} prayers
            </span>
            <span className="rounded-full border border-ecclesial-green/25 bg-ecclesial-green/5 px-3 py-2">
              {devotionGuides.length} devotions
            </span>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="relative">
            <label className="sr-only" htmlFor="prayer-library-search">
              Search the Catholic prayer treasury
            </label>
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted"
            />
            <input
              aria-controls="prayer-library-results"
              className="h-12 w-full rounded-xl border border-hairline bg-vellum pl-11 pr-12 text-base text-foreground placeholder:text-muted focus:border-ecclesial-green focus:outline-none focus:ring-2 focus:ring-ecclesial-green/15"
              id="prayer-library-search"
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search by prayer, saint, season, or need…"
              type="search"
              value={query}
            />
            {query ? (
              <button
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-[var(--panel-soft)] hover:text-foreground"
                onClick={() => setQuery("")}
                type="button"
              >
                <X aria-hidden className="size-4" />
              </button>
            ) : null}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Pray by need
            </p>
            <div
              aria-label="Find prayers by need"
              className="mt-2 flex gap-2 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0"
              role="group"
            >
              {prayerPaths.map(({ Icon, label, query: pathQuery }) => (
                <button
                  aria-pressed={
                    scope === "prayers" &&
                    category === null &&
                    query === pathQuery
                  }
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-hairline bg-vellum px-3.5 text-left text-sm font-semibold text-foreground transition hover:border-gilt hover:bg-gilt/10 aria-pressed:border-oxblood aria-pressed:bg-oxblood aria-pressed:text-vellum"
                  key={pathQuery}
                  onClick={() => selectPrayerPath(pathQuery)}
                  type="button"
                >
                  <Icon aria-hidden className="size-4 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div
            aria-label="Library view"
            className="flex gap-2 overflow-x-auto pb-1"
            role="group"
          >
            <ScopeButton
              active={scope === "all"}
              count={libraryItems.length}
              label="All"
              onClick={() => selectScope("all")}
            />
            <ScopeButton
              active={scope === "prayers"}
              count={prayers.length}
              label="Prayers"
              onClick={() => selectScope("prayers")}
            />
            <ScopeButton
              active={scope === "litanies"}
              count={litanyCount}
              label="Litanies"
              onClick={() => selectScope("litanies")}
            />
            <ScopeButton
              active={scope === "hymns"}
              count={hymnCount}
              label="Hymns & psalms"
              onClick={() => selectScope("hymns")}
            />
            <ScopeButton
              active={scope === "devotions"}
              count={devotionGuides.length}
              label="Novenas & guides"
              onClick={() => selectScope("devotions")}
            />
            <ScopeButton
              active={scope === "favorites"}
              count={storageReady ? favorites.size : 0}
              label="Favorites"
              onClick={() => selectScope("favorites")}
            />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Collection
            </p>
            <div
              aria-label="Filter by collection"
              className="mt-2 flex gap-2 overflow-x-auto pb-2"
              role="group"
            >
              <CategoryButton
                active={category === null}
                label="Every collection"
                onClick={() => setCategory(null)}
              />
              {visibleCategories.map((value) => (
                <CategoryButton
                  active={category === value}
                  key={value}
                  label={value}
                  onClick={() =>
                    setCategory((current) =>
                      current === value ? null : value,
                    )
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm font-semibold text-muted">
          {filteredItems.length} {filteredItems.length === 1 ? "result" : "results"}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            aria-pressed={largePrint}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-hairline bg-[var(--panel)] px-3 text-sm font-semibold text-foreground transition hover:border-gilt aria-pressed:border-sanctuary-night aria-pressed:bg-sanctuary-night aria-pressed:text-vellum"
            onClick={() => setLargePrint((current) => !current)}
            type="button"
          >
            <Type aria-hidden className="size-4" />
            Large print
          </button>
          {filtersActive ? (
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[var(--accent)] transition hover:bg-oxblood/5"
              onClick={clearFilters}
              type="button"
            >
              <X aria-hidden className="size-4" />
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(20rem,0.78fr)_minmax(0,1.22fr)] lg:items-start lg:gap-5">
        <div
          className={selectedItem ? "hidden lg:block" : "block"}
          id="prayer-library-results"
        >
          <div className="space-y-2 lg:max-h-[72vh] lg:overflow-y-auto lg:pr-2">
            {filteredItems.map((item) => (
              <LibraryResult
                favorite={favorites.has(item.id)}
                item={item}
                key={item.id}
                onFavorite={() => toggleFavorite(item.id)}
                onOpen={() => openItem(item.id)}
                selected={selectedItemId === item.id}
              />
            ))}
          </div>

          {filteredItems.length === 0 ? (
            <LibraryEmptyState
              favoritesEmpty={scope === "favorites" && favorites.size === 0}
              onClear={clearFilters}
            />
          ) : null}
        </div>

        {selectedItem ? (
          <LibraryReader
            favorite={favorites.has(selectedItem.id)}
            item={selectedItem}
            largePrint={largePrint}
            onClose={closeReader}
            onFavorite={() => toggleFavorite(selectedItem.id)}
            onOpenPrayer={(slug) => openItem(`prayer:${slug}`)}
            ref={readerHeadingRef}
          />
        ) : (
          <ReaderWelcome />
        )}
      </div>
    </section>
  );
}

function ScopeButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition ${
        active
          ? "border-sanctuary-night bg-sanctuary-night text-vellum shadow-sm"
          : "border-hairline bg-vellum text-muted hover:border-ecclesial-green hover:text-ecclesial-green"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 font-mono text-[0.65rem] ${
          active
            ? "bg-ecclesial-green text-[var(--gilt-light)]"
            : "bg-parchment text-muted"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function CategoryButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`min-h-10 shrink-0 rounded-full border px-3.5 text-sm font-semibold transition ${
        active
          ? "border-oxblood bg-oxblood text-vellum"
          : "border-hairline bg-vellum text-muted hover:border-oxblood hover:text-oxblood"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function FavoriteButton({
  active,
  onClick,
  title,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      aria-label={`${active ? "Remove" : "Add"} ${title} ${active ? "from" : "to"} favorites`}
      aria-pressed={active}
      className={`flex size-11 shrink-0 items-center justify-center rounded-full border transition ${
        active
          ? "border-gilt bg-gilt/25 text-oxblood"
          : "border-hairline bg-vellum text-muted hover:border-gilt hover:text-oxblood"
      }`}
      onClick={onClick}
      title={active ? "Remove from favorites" : "Add to favorites"}
      type="button"
    >
      <Star aria-hidden className={`size-4 ${active ? "fill-current" : ""}`} />
    </button>
  );
}

function LibraryResult({
  favorite,
  item,
  onFavorite,
  onOpen,
  selected,
}: {
  favorite: boolean;
  item: LibraryItem;
  onFavorite: () => void;
  onOpen: () => void;
  selected: boolean;
}) {
  const title = item.kind === "prayer" ? item.prayer.title : item.guide.title;
  const summary =
    item.kind === "prayer" ? item.prayer.summary : item.guide.summary;
  const form =
    item.kind === "prayer" ? item.prayer.form ?? "Prayer" : "Guided devotion";

  return (
    <article
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border bg-[var(--panel)] p-2 transition ${
        selected
          ? "border-gilt shadow-[0_0_0_2px_rgb(198_161_91/0.15)]"
          : "border-hairline hover:border-gilt"
      }`}
    >
      <button
        aria-current={selected ? "true" : undefined}
        className="min-h-20 rounded-lg px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-ecclesial-green/30"
        id={resultId(item.id)}
        onClick={onOpen}
        type="button"
      >
        <span className="flex flex-wrap items-center gap-x-2 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
          <span>{form}</span>
          <span aria-hidden className="size-1 rounded-full bg-gilt" />
          <span>{item.category}</span>
        </span>
        <h3 className="mt-1 font-serif text-xl font-semibold leading-tight text-foreground">
          {title}
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted">{summary}</p>
      </button>
      <div className="flex items-center gap-1">
        <FavoriteButton active={favorite} onClick={onFavorite} title={title} />
        <span
          aria-hidden
          className={`flex size-9 items-center justify-center rounded-full ${
            selected
              ? "bg-sanctuary-night text-[var(--gilt-light)]"
              : "text-ecclesial-green"
          }`}
        >
          <ChevronRight className="size-4" />
        </span>
      </div>
    </article>
  );
}

const LibraryReader = function LibraryReader({
  favorite,
  item,
  largePrint,
  onClose,
  onFavorite,
  onOpenPrayer,
  ref,
}: {
  favorite: boolean;
  item: LibraryItem;
  largePrint: boolean;
  onClose: () => void;
  onFavorite: () => void;
  onOpenPrayer: (slug: string) => void;
  ref: React.Ref<HTMLHeadingElement>;
}) {
  const title = item.kind === "prayer" ? item.prayer.title : item.guide.title;

  return (
    <article className="overflow-hidden rounded-2xl border border-gilt/45 bg-[var(--panel)] shadow-[var(--shadow-raised)] lg:sticky lg:top-24">
      <div className="flex items-center justify-between gap-3 border-b border-hairline bg-sanctuary-night px-4 py-3 text-vellum sm:px-5">
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold transition hover:bg-vellum/10"
          onClick={onClose}
          type="button"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Library
        </button>
        <FavoriteButton active={favorite} onClick={onFavorite} title={title} />
      </div>

      {item.kind === "prayer" ? (
        <PrayerReader largePrint={largePrint} prayer={item.prayer} ref={ref} />
      ) : (
        <GuideReader
          guide={item.guide}
          onOpenPrayer={onOpenPrayer}
          ref={ref}
        />
      )}
    </article>
  );
};

function PrayerReader({
  largePrint,
  prayer,
  ref,
}: {
  largePrint: boolean;
  prayer: Prayer;
  ref: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <div>
      <header className="border-b border-hairline bg-[var(--panel-soft)] px-5 py-6 sm:px-8 sm:py-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
          {prayer.form ?? "Prayer"} · {prayer.category}
        </p>
        <h2
          className="mt-2 font-serif text-3xl font-semibold leading-tight text-foreground outline-none sm:text-4xl"
          ref={ref}
          tabIndex={-1}
        >
          {prayer.title}
        </h2>
        {prayer.latinTitle ? (
          <p className="mt-2 font-serif text-base italic text-muted">
            {prayer.latinTitle}
          </p>
        ) : null}
      </header>

      <div className="bg-vellum px-5 py-7 sm:px-8 sm:py-9">
        <div
          className={`mx-auto max-w-[40em] font-serif text-foreground ${
            largePrint
              ? "text-2xl leading-[1.72] sm:text-[1.7rem]"
              : "text-xl leading-9"
          }`}
        >
          {prayer.form === "Litany" ? (
            <LitanyText paragraphs={prayer.text} slug={prayer.slug} />
          ) : (
            <div className="space-y-5 whitespace-pre-line">
              {prayer.text.map((paragraph, index) => (
                <p key={`${prayer.slug}:${index}`}>{paragraph}</p>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function LitanyText({
  paragraphs,
  slug,
}: {
  paragraphs: string[];
  slug: string;
}) {
  return (
    <div className="space-y-6">
      {paragraphs.map((paragraph, paragraphIndex) => (
        <div
          className="space-y-1.5"
          key={`${slug}:litany:${paragraphIndex}`}
        >
          {splitLitanyLines(paragraph).map((line, lineIndex) => {
            const parts = parseLitanyResponse(line);

            return parts ? (
              <p
                className="flex flex-col gap-1 border-b border-gilt/25 py-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-5"
                key={`${slug}:litany:${paragraphIndex}:${lineIndex}`}
              >
                <span>{parts.invocation}</span>
                <strong className="shrink-0 font-serif font-semibold text-oxblood">
                  {parts.response}
                </strong>
              </p>
            ) : (
              <p
                className="whitespace-pre-line py-1"
                key={`${slug}:litany:${paragraphIndex}:${lineIndex}`}
              >
                {line}
              </p>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function GuideReader({
  guide,
  onOpenPrayer,
  ref,
}: {
  guide: DevotionGuide;
  onOpenPrayer: (slug: string) => void;
  ref: React.Ref<HTMLHeadingElement>;
}) {
  const relatedPrayers = (devotionGuidePrayerSlugs[guide.slug] ?? []).flatMap(
    (slug) => {
      const prayer = prayerBySlug.get(slug);
      return prayer ? [prayer] : [];
    },
  );

  return (
    <div>
      <header className="border-b border-gilt/35 bg-gilt/15 px-5 py-6 sm:px-8 sm:py-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
          {guide.eyebrow}
        </p>
        <h2
          className="mt-2 font-serif text-3xl font-semibold leading-tight text-foreground outline-none sm:text-4xl"
          ref={ref}
          tabIndex={-1}
        >
          {guide.title}
        </h2>
        <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-ecclesial-green">
          <Clock aria-hidden className="size-4" />
          {guide.duration}
        </p>
      </header>

      {guide.pastoralNote || relatedPrayers.length > 0 ? (
        <div className="space-y-4 border-b border-hairline bg-[var(--panel-soft)] px-5 py-5 sm:px-8">
          {guide.pastoralNote ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
                How to pray
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                {guide.pastoralNote}
              </p>
            </div>
          ) : null}
          {relatedPrayers.length > 0 ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
                Prayers in this devotion
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {relatedPrayers.map((prayer) => (
                  <button
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-gilt/45 bg-vellum px-3 text-sm font-semibold text-foreground transition hover:border-oxblood hover:text-oxblood"
                    key={prayer.slug}
                    onClick={() => onOpenPrayer(prayer.slug)}
                    type="button"
                  >
                    <BookOpen aria-hidden className="size-3.5" />
                    {prayer.title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <ol className="space-y-3 bg-vellum px-4 py-5 sm:px-6 sm:py-7">
        {guide.steps.map((step, index) => (
          <li
            className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 rounded-xl border border-hairline bg-[var(--panel)] p-4"
            key={`${guide.slug}:${step.title}`}
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-sanctuary-night font-mono text-xs font-bold text-[var(--gilt-light)]">
              {index + 1}
            </span>
            <div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                {step.title.replace(/^\d+\.\s*/, "")}
              </h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">
                {step.instruction}
              </p>
              {step.scripture ? (
                <p className="mt-3 inline-flex items-start gap-2 rounded-lg bg-ecclesial-green/10 px-2.5 py-1.5 text-xs font-semibold leading-5 text-ecclesial-green">
                  <BookOpen aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  {step.scripture}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ReaderWelcome() {
  return (
    <div className="hidden min-h-[28rem] flex-col items-center justify-center rounded-2xl border border-dashed border-gilt/45 bg-[var(--panel)] px-8 text-center lg:flex">
      <span className="flex size-14 items-center justify-center rounded-full bg-sanctuary-night text-[var(--gilt-light)]">
        <Library aria-hidden className="size-6" />
      </span>
      <h3 className="mt-5 font-serif text-3xl font-semibold text-foreground">
        Choose a prayer
      </h3>
    </div>
  );
}

function LibraryEmptyState({
  favoritesEmpty,
  onClear,
}: {
  favoritesEmpty: boolean;
  onClear: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-hairline bg-[var(--panel)] px-6 py-12 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-sanctuary-night text-[var(--gilt-light)]">
        {favoritesEmpty ? (
          <Star aria-hidden className="size-5" />
        ) : (
          <Search aria-hidden className="size-5" />
        )}
      </span>
      <h3 className="mt-4 font-serif text-2xl font-semibold text-foreground">
        {favoritesEmpty ? "Your prayer shelf is ready" : "No matching prayers"}
      </h3>
      <button
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-sanctuary-night px-4 text-sm font-semibold text-vellum transition hover:bg-ecclesial-green"
        onClick={onClear}
        type="button"
      >
        {favoritesEmpty ? (
          <Star aria-hidden className="size-4" />
        ) : (
          <X aria-hidden className="size-4" />
        )}
        Browse the full treasury
      </button>
    </div>
  );
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US");
}

const litanyRefrainPattern =
  /((?:have mercy on us(?:, O (?:Jesus|Lord))?|hear us(?:, O Lord)?|graciously hear us(?:, O (?:Jesus|Lord))?|pray for us|intercede for us|save us|deliver us, O (?:Jesus|Lord)|spare us, O (?:Jesus|Lord)|we beseech Thee, hear us)\.)\s+(?=[A-Z])/g;

const litanyResponsePattern =
  /^(.*?), ((?:have mercy on us(?:, O (?:Jesus|Lord))?|hear us(?:, O Lord)?|graciously hear us(?:, O (?:Jesus|Lord))?|pray for us|intercede for us|save us|deliver us, O (?:Jesus|Lord)|spare us, O (?:Jesus|Lord)|we beseech Thee, hear us))\.$/;

function splitLitanyLines(paragraph: string) {
  return paragraph
    .replace(litanyRefrainPattern, "$1\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseLitanyResponse(line: string) {
  const match = line.match(litanyResponsePattern);
  if (!match) {
    return null;
  }

  return {
    invocation: match[1],
    response: `${match[2]}.`,
  };
}

function readItemIdFromHash() {
  try {
    const itemId = decodeURIComponent(window.location.hash.slice(1));
    return validFavoriteIds.has(itemId) ? itemId : null;
  } catch {
    return null;
  }
}

function resultId(itemId: string) {
  return `library-result-${itemId.replace(/[^a-z0-9]+/gi, "-")}`;
}

function readStoredFavorites() {
  try {
    const stored = window.localStorage.getItem(favoritesStorageKey);
    if (!stored) {
      return new Set<string>();
    }
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }
    return new Set(
      parsed.filter(
        (value): value is string =>
          typeof value === "string" && validFavoriteIds.has(value),
      ),
    );
  } catch {
    return new Set<string>();
  }
}

function writeStoredFavorites(favorites: Set<string>) {
  try {
    window.localStorage.setItem(
      favoritesStorageKey,
      JSON.stringify([...favorites]),
    );
  } catch {
    return;
  }
}
