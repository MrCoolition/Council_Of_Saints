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
      <div className="overflow-hidden rounded-xl border border-stone-300 bg-[var(--panel)] shadow-sm">
        <div className="grid gap-5 border-b border-stone-200 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <SlidersHorizontal aria-hidden className="size-4" />
              <p className="text-xs font-bold uppercase tracking-[0.15em]">
                Find a prayer
              </p>
            </div>
            <h2
              className="mt-2 text-2xl font-semibold text-stone-950 sm:text-3xl"
              id="prayer-library-heading"
            >
              Prayer & devotion library
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Search a phrase, browse by spiritual need, or keep a short
              personal collection for quick return.
            </p>
          </div>

          <p className="flex items-center gap-2 text-xs text-stone-500">
            <Star aria-hidden className="size-4 text-amber-700" />
            Favorites are saved only on this device.
          </p>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <div className="relative">
            <label className="sr-only" htmlFor="prayer-library-search">
              Search prayers and formation guides
            </label>
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-stone-500"
            />
            <input
              aria-controls="prayer-library-results"
              className="h-12 w-full rounded-lg border border-stone-300 bg-white pl-11 pr-12 text-base text-stone-950 placeholder:text-stone-500 focus:border-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-900/15"
              id="prayer-library-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search “mercy,” “morning,” “Holy Spirit”…"
              type="search"
              value={query}
            />
            {query ? (
              <button
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-stone-500 transition hover:bg-stone-100 hover:text-stone-950"
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
            <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
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
          className="text-sm font-semibold text-stone-700"
          role="status"
        >
          {filteredItems.length}{" "}
          {filteredItems.length === 1 ? "resource" : "resources"}
        </p>
        {filtersActive ? (
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-[var(--accent)] transition hover:bg-red-50"
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
          ? "border-emerald-950 bg-emerald-950 text-amber-50 shadow-sm"
          : "border-stone-300 bg-white text-stone-700 hover:border-emerald-900 hover:text-emerald-950",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      {label}
      <span
        className={[
          "rounded-full px-1.5 py-0.5 font-mono text-[0.65rem]",
          active ? "bg-emerald-800 text-amber-100" : "bg-stone-100 text-stone-500",
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
          ? "border-[#861f2d] bg-[#861f2d] text-white"
          : "border-stone-300 bg-white text-stone-700 hover:border-[#861f2d] hover:text-[#861f2d]",
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
          ? "border-amber-600 bg-amber-100 text-amber-800"
          : "border-stone-300 bg-white text-stone-500 hover:border-amber-600 hover:text-amber-800",
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
    <article className="self-start overflow-hidden rounded-xl border border-stone-300 bg-[var(--panel)] shadow-sm transition hover:border-stone-400">
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-stone-50/80 px-5 py-3">
        <span className="inline-flex min-h-7 items-center rounded-full bg-emerald-950 px-2.5 text-[0.68rem] font-bold uppercase tracking-wide text-amber-100">
          Traditional prayer
        </span>
        <FavoriteButton
          active={favorite}
          onClick={onFavorite}
          title={prayer.title}
        />
      </div>

      <details className="group">
        <summary className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-5 transition hover:bg-amber-50/60 sm:px-6">
          <span>
            <span className="block text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
              {prayer.category}
            </span>
            <span className="mt-1.5 block font-serif text-2xl font-semibold leading-tight text-stone-950">
              {prayer.title}
            </span>
            <span className="mt-2 block text-sm leading-6 text-stone-600">
              {prayer.summary}
            </span>
          </span>
          <span className="flex size-10 items-center justify-center rounded-full border border-stone-300 bg-white text-emerald-950">
            <ChevronDown
              aria-hidden
              className="size-5 transition-transform group-open:rotate-180"
            />
          </span>
        </summary>

        <div className="border-t border-stone-200">
          <div className="bg-[#fffcf4] px-5 py-6 sm:px-7 sm:py-7">
            <div className="space-y-4 font-serif text-lg leading-8 text-stone-800">
              {prayer.text.map((paragraph, index) => (
                <p key={`${prayer.slug}:${index}`}>{paragraph}</p>
              ))}
            </div>
          </div>

          <dl className="grid gap-4 border-t border-stone-200 bg-white px-5 py-5 text-sm sm:px-6">
            <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2.5">
              <Clock aria-hidden className="mt-0.5 size-4 text-amber-700" />
              <div>
                <dt className="font-semibold text-stone-950">When to pray</dt>
                <dd className="mt-1 leading-6 text-stone-600">
                  {prayer.whenToPray}
                </dd>
              </div>
            </div>
            <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2.5">
              <BookOpen aria-hidden className="mt-0.5 size-4 text-amber-700" />
              <div>
                <dt className="font-semibold text-stone-950">Text note</dt>
                <dd className="mt-1 leading-6 text-stone-600">
                  {prayer.source}
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
    <article className="self-start overflow-hidden rounded-xl border border-[#c8a65b] bg-[var(--panel)] shadow-sm transition hover:border-amber-700">
      <div className="flex items-center justify-between gap-3 border-b border-[#e1cc98] bg-[#fff5d9] px-5 py-3">
        <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-[#861f2d] px-2.5 text-[0.68rem] font-bold uppercase tracking-wide text-white">
          <Compass aria-hidden className="size-3.5" />
          Original formation guide
        </span>
        <FavoriteButton
          active={favorite}
          onClick={onFavorite}
          title={guide.title}
        />
      </div>

      <details className="group">
        <summary className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-5 transition hover:bg-amber-50/60 sm:px-6">
          <span>
            <span className="block text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
              {guide.eyebrow}
            </span>
            <span className="mt-1.5 block font-serif text-2xl font-semibold leading-tight text-stone-950">
              {guide.title}
            </span>
            <span className="mt-2 block text-sm leading-6 text-stone-600">
              {guide.summary}
            </span>
            <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
              <Clock aria-hidden className="size-4" />
              {guide.duration}
            </span>
          </span>
          <span className="flex size-10 items-center justify-center rounded-full border border-[#c8a65b] bg-[#fff8e7] text-emerald-950">
            <ChevronDown
              aria-hidden
              className="size-5 transition-transform group-open:rotate-180"
            />
          </span>
        </summary>

        <div className="border-t border-[#e1cc98] bg-[#fffcf4] px-5 py-6 sm:px-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
            <p className="font-bold uppercase tracking-wide">Authorship note</p>
            <p className="mt-1">{guide.provenance}</p>
          </div>

          {guide.pastoralNote ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50/70 px-4 py-3 text-sm leading-6 text-red-950">
              <p className="font-semibold">Use this guide wisely</p>
              <p className="mt-1">{guide.pastoralNote}</p>
            </div>
          ) : null}

          <ol className="mt-5 space-y-3">
            {guide.steps.map((step) => (
              <li
                className="rounded-lg border border-stone-200 bg-white p-4"
                key={`${guide.slug}:${step.title}`}
              >
                <h3 className="font-serif text-lg font-semibold text-stone-950">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-stone-700">
                  {step.instruction}
                </p>
                {step.scripture ? (
                  <p className="mt-3 inline-flex items-start gap-2 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold leading-5 text-emerald-950">
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
    <div className="rounded-xl border border-dashed border-stone-400 bg-[var(--panel)] px-6 py-12 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-950 text-amber-100">
        {favoritesEmpty ? (
          <Star aria-hidden className="size-5" />
        ) : (
          <Search aria-hidden className="size-5" />
        )}
      </span>
      <h3 className="mt-4 font-serif text-2xl font-semibold text-stone-950">
        {favoritesEmpty ? "Your prayer shelf is ready" : "No matching resources"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
        {favoritesEmpty
          ? "Use the star on any prayer or guide to keep a small collection close at hand."
          : "Try a broader word, choose another category, or return to the complete library."}
      </p>
      <button
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-950 px-4 text-sm font-semibold text-amber-50 transition hover:bg-emerald-900"
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
