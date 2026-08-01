"use client";

import {
  BookOpen,
  ChevronDown,
  Clock,
  Compass,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  devotionGuides,
  formationGuideCategories,
  prayerCategories,
  prayers,
  type DevotionGuide,
  type FormationGuideCategory,
  type Prayer,
  type PrayerCategory,
} from "@/lib/prayers";

type LibraryScope = "all" | "prayers" | "guides" | "favorites";
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
          prayer.summary,
          prayer.whenToPray,
          prayer.source,
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
          guide.provenance,
          guide.pastoralNote ?? "",
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

export function PrayerLibrary() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<LibraryScope>("all");
  const [category, setCategory] = useState<LibraryCategory | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFavorites(readStoredFavorites());
      setStorageReady(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const visibleCategories = useMemo(() => {
    if (scope === "prayers") {
      return prayerCategories;
    }

    if (scope === "guides") {
      return formationGuideCategories;
    }

    return [...prayerCategories, ...formationGuideCategories];
  }, [scope]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());

    return libraryItems.filter((item) => {
      if (scope === "prayers" && item.kind !== "prayer") {
        return false;
      }

      if (scope === "guides" && item.kind !== "guide") {
        return false;
      }

      if (scope === "favorites" && !favorites.has(item.id)) {
        return false;
      }

      if (category && item.category !== category) {
        return false;
      }

      return !normalizedQuery || item.searchText.includes(normalizedQuery);
    });
  }, [category, favorites, query, scope]);

  const filtersActive =
    query.trim().length > 0 || scope !== "all" || category !== null;

  function selectScope(nextScope: LibraryScope) {
    setScope(nextScope);

    if (nextScope === "prayers" && category) {
      if (!prayerCategories.includes(category as PrayerCategory)) {
        setCategory(null);
      }
    }

    if (nextScope === "guides" && category) {
      if (!formationGuideCategories.includes(category as FormationGuideCategory)) {
        setCategory(null);
      }
    }
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

  return (
    <section aria-labelledby="prayer-library-heading" className="space-y-5">
      <div className="overflow-hidden rounded-xl border border-hairline bg-[var(--panel)] shadow-sm">
        <div className="grid gap-5 border-b border-hairline p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <SlidersHorizontal aria-hidden className="size-4" />
              <p className="text-xs font-bold uppercase tracking-[0.15em]">
                Find a prayer
              </p>
            </div>
            <h2
              className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl"
              id="prayer-library-heading"
            >
              Prayer & devotion library
            </h2>
          </div>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <div className="relative">
            <label className="sr-only" htmlFor="prayer-library-search">
              Search prayers and formation guides
            </label>
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted"
            />
            <input
              aria-controls="prayer-library-results"
              className="h-12 w-full rounded-lg border border-hairline bg-vellum pl-11 pr-12 text-base text-foreground placeholder:text-muted focus:border-ecclesial-green focus:outline-none focus:ring-2 focus:ring-ecclesial-green/15"
              id="prayer-library-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search “mercy,” “morning,” “Holy Spirit”…"
              type="search"
              value={query}
            />
            {query ? (
              <button
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted transition hover:bg-[var(--panel-soft)] hover:text-foreground"
                onClick={() => setQuery("")}
                type="button"
              >
                <X aria-hidden className="size-4" />
              </button>
            ) : null}
          </div>

          <div aria-label="Library view" className="flex flex-wrap gap-2" role="group">
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
              active={scope === "guides"}
              count={devotionGuides.length}
              label="Guides"
              onClick={() => selectScope("guides")}
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
              Category
            </p>
            <div
              aria-label="Filter by category"
              className="mt-2 flex gap-2 overflow-x-auto pb-2 lg:flex-wrap lg:overflow-visible lg:pb-0"
              role="group"
            >
              <CategoryButton
                active={category === null}
                label="Every category"
                onClick={() => setCategory(null)}
              />
              {visibleCategories.map((value) => (
                <CategoryButton
                  active={category === value}
                  key={value}
                  label={value}
                  onClick={() =>
                    setCategory((current) => (current === value ? null : value))
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-11 items-center justify-between gap-4">
        <p
          aria-live="polite"
          className="text-sm font-semibold text-muted"
          role="status"
        >
          {filteredItems.length}{" "}
          {filteredItems.length === 1 ? "resource" : "resources"}
        </p>
        {filtersActive ? (
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-[var(--accent)] transition hover:bg-oxblood/5"
            onClick={clearFilters}
            type="button"
          >
            <X aria-hidden className="size-4" />
            Clear filters
          </button>
        ) : null}
      </div>

      <div
        className="grid gap-4 lg:grid-cols-2"
        id="prayer-library-results"
      >
        {filteredItems.map((item) =>
          item.kind === "prayer" ? (
            <PrayerCard
              favorite={favorites.has(item.id)}
              key={item.id}
              onFavorite={() => toggleFavorite(item.id)}
              prayer={item.prayer}
            />
          ) : (
            <GuideCard
              favorite={favorites.has(item.id)}
              guide={item.guide}
              key={item.id}
              onFavorite={() => toggleFavorite(item.id)}
            />
          ),
        )}
      </div>

      {filteredItems.length === 0 ? (
        <LibraryEmptyState
          favoritesEmpty={scope === "favorites" && favorites.size === 0}
          onClear={clearFilters}
        />
      ) : null}
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
      className={[
        "inline-flex min-h-11 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition",
        active
          ? "border-sanctuary-night bg-sanctuary-night text-vellum shadow-sm"
          : "border-hairline bg-vellum text-muted hover:border-ecclesial-green hover:text-ecclesial-green",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      {label}
      <span
        className={[
          "rounded-full px-1.5 py-0.5 font-mono text-[0.65rem]",
          active
            ? "bg-ecclesial-green text-[var(--gilt-light)]"
            : "bg-parchment text-muted",
        ].join(" ")}
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
      className={[
        "shrink-0 rounded-full border px-3.5 text-sm font-semibold transition",
        active
          ? "border-oxblood bg-oxblood text-vellum"
          : "border-hairline bg-vellum text-muted hover:border-oxblood hover:text-oxblood",
      ].join(" ")}
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
      className={[
        "flex size-10 shrink-0 items-center justify-center rounded-full border transition",
        active
          ? "border-gilt bg-gilt/25 text-oxblood"
          : "border-hairline bg-vellum text-muted hover:border-gilt hover:text-oxblood",
      ].join(" ")}
      onClick={onClick}
      title={active ? "Remove from favorites" : "Add to favorites"}
      type="button"
    >
      <Star aria-hidden className={["size-4", active ? "fill-current" : ""].join(" ")} />
    </button>
  );
}

function PrayerCard({
  favorite,
  onFavorite,
  prayer,
}: {
  favorite: boolean;
  onFavorite: () => void;
  prayer: Prayer;
}) {
  return (
    <article className="self-start overflow-hidden rounded-xl border border-hairline bg-[var(--panel)] shadow-sm transition hover:border-gilt">
      <div className="flex items-center justify-between gap-3 border-b border-hairline bg-[var(--panel-soft)] px-5 py-3">
        <span className="inline-flex min-h-7 items-center rounded-full bg-sanctuary-night px-2.5 text-[0.68rem] font-bold uppercase tracking-wide text-[var(--gilt-light)]">
          Traditional prayer
        </span>
        <FavoriteButton
          active={favorite}
          onClick={onFavorite}
          title={prayer.title}
        />
      </div>

      <details className="group">
        <summary className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-5 transition hover:bg-gilt/10 sm:px-6">
          <span>
            <span className="block text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
              {prayer.category}
            </span>
            <span className="mt-1.5 block font-serif text-2xl font-semibold leading-tight text-foreground">
              {prayer.title}
            </span>
            <span className="mt-2 block text-sm leading-6 text-muted">
              {prayer.summary}
            </span>
          </span>
          <span className="flex size-10 items-center justify-center rounded-full border border-hairline bg-vellum text-ecclesial-green">
            <ChevronDown
              aria-hidden
              className="size-5 transition-transform group-open:rotate-180"
            />
          </span>
        </summary>

        <div className="border-t border-hairline">
          <div className="bg-vellum px-5 py-6 sm:px-7 sm:py-7">
            <div className="space-y-4 font-serif text-lg leading-8 text-foreground">
              {prayer.text.map((paragraph, index) => (
                <p key={`${prayer.slug}:${index}`}>{paragraph}</p>
              ))}
            </div>
          </div>

          <dl className="grid gap-4 border-t border-hairline bg-vellum px-5 py-5 text-sm sm:px-6">
            <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2.5">
              <Clock aria-hidden className="mt-0.5 size-4 text-oxblood" />
              <div>
                <dt className="font-semibold text-foreground">When to pray</dt>
                <dd className="mt-1 leading-6 text-muted">
                  {prayer.whenToPray}
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </details>
    </article>
  );
}

function GuideCard({
  favorite,
  guide,
  onFavorite,
}: {
  favorite: boolean;
  guide: DevotionGuide;
  onFavorite: () => void;
}) {
  return (
    <article className="self-start overflow-hidden rounded-xl border border-gilt bg-[var(--panel)] shadow-sm transition hover:border-oxblood">
      <div className="flex items-center justify-between gap-3 border-b border-gilt/50 bg-gilt/20 px-5 py-3">
        <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-oxblood px-2.5 text-[0.68rem] font-bold uppercase tracking-wide text-vellum">
          <Compass aria-hidden className="size-3.5" />
          Prayer guide
        </span>
        <FavoriteButton
          active={favorite}
          onClick={onFavorite}
          title={guide.title}
        />
      </div>

      <details className="group">
        <summary className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-5 transition hover:bg-gilt/10 sm:px-6">
          <span>
            <span className="block text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
              {guide.eyebrow}
            </span>
            <span className="mt-1.5 block font-serif text-2xl font-semibold leading-tight text-foreground">
              {guide.title}
            </span>
            <span className="mt-2 block text-sm leading-6 text-muted">
              {guide.summary}
            </span>
            <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ecclesial-green">
              <Clock aria-hidden className="size-4" />
              {guide.duration}
            </span>
          </span>
          <span className="flex size-10 items-center justify-center rounded-full border border-gilt bg-gilt/15 text-ecclesial-green">
            <ChevronDown
              aria-hidden
              className="size-5 transition-transform group-open:rotate-180"
            />
          </span>
        </summary>

        <div className="border-t border-gilt/50 bg-vellum px-5 py-6 sm:px-6">
          {guide.pastoralNote ? (
            <div className="rounded-lg border border-oxblood/25 bg-oxblood/5 px-4 py-3 text-sm leading-6 text-oxblood">
              <p className="font-semibold">Pastoral counsel</p>
              <p className="mt-1">{guide.pastoralNote}</p>
            </div>
          ) : null}

          <ol className="mt-5 space-y-3">
            {guide.steps.map((step) => (
              <li
                className="rounded-lg border border-hairline bg-vellum p-4"
                key={`${guide.slug}:${step.title}`}
              >
                <h3 className="font-serif text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {step.instruction}
                </p>
                {step.scripture ? (
                  <p className="mt-3 inline-flex items-start gap-2 rounded-md bg-ecclesial-green/10 px-2.5 py-1.5 text-xs font-semibold leading-5 text-ecclesial-green">
                    <BookOpen aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                    {step.scripture}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </details>
    </article>
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
    <div className="rounded-xl border border-dashed border-hairline bg-[var(--panel)] px-6 py-12 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-sanctuary-night text-[var(--gilt-light)]">
        {favoritesEmpty ? (
          <Star aria-hidden className="size-5" />
        ) : (
          <Search aria-hidden className="size-5" />
        )}
      </span>
      <h3 className="mt-4 font-serif text-2xl font-semibold text-foreground">
        {favoritesEmpty ? "Your prayer shelf is ready" : "No matching resources"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
        {favoritesEmpty
          ? "Use the star on any prayer or guide to keep a small collection close at hand."
          : "Try a broader word, choose another category, or return to the complete library."}
      </p>
      <button
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-sanctuary-night px-4 text-sm font-semibold text-vellum transition hover:bg-ecclesial-green"
        onClick={onClear}
        type="button"
      >
        <X aria-hidden className="size-4" />
        {favoritesEmpty ? "Browse the full library" : "Clear all filters"}
      </button>
    </div>
  );
}

function normalizeText(value: string) {
  return value.toLocaleLowerCase("en-US");
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
