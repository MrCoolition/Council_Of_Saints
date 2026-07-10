"use client";

import {
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  RefreshCcw,
  Search,
} from "lucide-react";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  formatScriptureReference,
  getAdjacentScriptureChapter,
  getChapterVerses,
  getScriptureBook,
  getScriptureBookUrl,
  getTestamentLabel,
  isScriptureBookData,
  parseScriptureReference,
  SCRIPTURE_BOOKS,
  type ScriptureBook,
  type ScriptureBookData,
  type ScriptureLocation,
} from "@/lib/scripture";

type ReaderResource = {
  bookId: string;
  data: ScriptureBookData;
};

type ReaderFailure = {
  bookId: string;
  message: string;
};

type StoredBookmark = ScriptureLocation;
type TextSize = "compact" | "comfortable" | "large";

type ReferenceFeedback = {
  tone: "error" | "success";
  message: string;
};

const defaultLocation: ScriptureLocation = {
  bookId: "john",
  chapter: 1,
};

const resumeStorageKey = "sanctum-council:scripture-resume:v1";
const bookmarkStorageKey = "sanctum-council:scripture-bookmarks:v1";
const textSizeStorageKey = "sanctum-council:scripture-text-size:v1";

const textSizeClasses: Record<TextSize, string> = {
  compact: "text-base leading-8",
  comfortable: "text-lg leading-9",
  large: "text-xl leading-10",
};

export function ScriptureReader() {
  const [location, setLocation] =
    useState<ScriptureLocation>(defaultLocation);
  const [resource, setResource] = useState<ReaderResource | null>(null);
  const [failure, setFailure] = useState<ReaderFailure | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [bookFilter, setBookFilter] = useState("");
  const [referenceInput, setReferenceInput] = useState("");
  const [referenceFeedback, setReferenceFeedback] =
    useState<ReferenceFeedback | null>(null);
  const [pendingVerse, setPendingVerse] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<StoredBookmark[]>([]);
  const [textSize, setTextSize] =
    useState<TextSize>("comfortable");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const readerRef = useRef<HTMLElement>(null);

  const selectedBook =
    getScriptureBook(location.bookId) ?? SCRIPTURE_BOOKS[0];
  const bookData =
    resource?.bookId === selectedBook.id ? resource.data : null;
  const currentFailure =
    failure?.bookId === selectedBook.id ? failure.message : null;
  const verses = useMemo(
    () => (bookData ? getChapterVerses(bookData, location.chapter) : []),
    [bookData, location.chapter],
  );
  const previousLocation = getAdjacentScriptureChapter(location, -1);
  const nextLocation = getAdjacentScriptureChapter(location, 1);
  const isBookmarked = bookmarks.some(
    (bookmark) =>
      bookmark.bookId === location.bookId &&
      bookmark.chapter === location.chapter,
  );
  const missingTargetVerse =
    pendingVerse !== null &&
    bookData !== null &&
    !verses.some((verse) => verse.number === pendingVerse);

  const filteredBooks = useMemo(() => {
    const filter = bookFilter.trim().toLocaleLowerCase("en-US");

    if (!filter) {
      return SCRIPTURE_BOOKS;
    }

    return SCRIPTURE_BOOKS.filter((book) => {
      const searchableText = [
        book.name,
        book.sourceTitle,
        ...book.aliases,
      ]
        .join(" ")
        .toLocaleLowerCase("en-US");

      return searchableText.includes(filter);
    });
  }, [bookFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedResume = readStoredResume();
      const storedBookmarks = readStoredBookmarks();
      const storedTextSize = readStoredTextSize();

      if (storedResume) {
        setLocation(storedResume);
      }

      setBookmarks(storedBookmarks);
      setTextSize(storedTextSize);
      setStorageReady(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (storageReady) {
      writeStorage(resumeStorageKey, location);
    }
  }, [location, storageReady]);

  useEffect(() => {
    const book = getScriptureBook(location.bookId);

    if (!book) {
      return;
    }

    const controller = new AbortController();
    const bookId = book.id;
    const bookUrl = getScriptureBookUrl(book);

    async function loadBook() {
      try {
        const response = await fetch(bookUrl, {
          cache: "force-cache",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`The local text returned ${response.status}.`);
        }

        const data: unknown = await response.json();

        if (!isScriptureBookData(data)) {
          throw new Error("The local book file has an unexpected format.");
        }

        if (!controller.signal.aborted) {
          setResource({ bookId, data });
          setFailure((current) =>
            current?.bookId === bookId ? null : current,
          );
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setFailure({
          bookId,
          message:
            error instanceof Error
              ? error.message
              : "The local Scripture text could not be opened.",
        });
      }
    }

    void loadBook();

    return () => controller.abort();
  }, [loadAttempt, location.bookId]);

  useEffect(() => {
    if (pendingVerse === null || !bookData) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const verse = document.getElementById(
        getVerseElementId(location.bookId, location.chapter, pendingVerse),
      );

      if (verse) {
        verse.scrollIntoView({ behavior: "smooth", block: "center" });
        verse.focus({ preventScroll: true });
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [bookData, location.bookId, location.chapter, pendingVerse]);

  function openLocation(
    nextLocation: ScriptureLocation,
    options: { scroll?: boolean; verse?: number | null } = {},
  ) {
    const nextBook = getScriptureBook(nextLocation.bookId);

    if (
      !nextBook ||
      nextLocation.chapter < 1 ||
      nextLocation.chapter > nextBook.chapters
    ) {
      return;
    }

    setLocation(nextLocation);
    setPendingVerse(options.verse ?? null);
    setFailure(null);
    setReferenceFeedback(null);
    setCatalogOpen(false);

    if (options.scroll) {
      window.requestAnimationFrame(() => {
        readerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }

  function handleReferenceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseScriptureReference(referenceInput);

    if (!parsed.ok) {
      setReferenceFeedback({ tone: "error", message: parsed.message });
      return;
    }

    const formattedReference = formatScriptureReference(
      parsed.book,
      parsed.chapter,
      parsed.verse,
    );

    openLocation(
      { bookId: parsed.book.id, chapter: parsed.chapter },
      { scroll: true, verse: parsed.verse },
    );
    setReferenceInput(formattedReference);
    setReferenceFeedback({
      tone: "success",
      message: `Opened ${formattedReference}.`,
    });
  }

  function toggleBookmark() {
    const bookmark = {
      bookId: location.bookId,
      chapter: location.chapter,
    };
    const nextBookmarks = isBookmarked
      ? bookmarks.filter(
          (item) =>
            item.bookId !== bookmark.bookId ||
            item.chapter !== bookmark.chapter,
        )
      : [bookmark, ...bookmarks].slice(0, 24);

    setBookmarks(nextBookmarks);
    writeStorage(bookmarkStorageKey, nextBookmarks);
  }

  function chooseTextSize(nextSize: TextSize) {
    setTextSize(nextSize);
    writeStorage(textSizeStorageKey, nextSize);
  }

  function retryLoad() {
    setFailure(null);
    setResource((current) =>
      current?.bookId === selectedBook.id ? null : current,
    );
    setLoadAttempt((attempt) => attempt + 1);
  }

  const oldTestamentBooks = filteredBooks.filter(
    (book) => book.testament === "old",
  );
  const newTestamentBooks = filteredBooks.filter(
    (book) => book.testament === "new",
  );
  const activeFeedback = missingTargetVerse
    ? {
        tone: "error" as const,
        message: `Verse ${pendingVerse} is not present in this local chapter file.`,
      }
    : referenceFeedback;

  return (
    <section aria-labelledby="scripture-reader-heading" className="space-y-4">
      <h2 className="sr-only" id="scripture-reader-heading">
        Scripture reader
      </h2>

      <div className="rounded-lg border border-stone-300 bg-[var(--panel)] p-4 shadow-sm sm:p-5">
        <form
          className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
          onSubmit={handleReferenceSubmit}
        >
          <div>
            <label
              className="text-sm font-semibold text-stone-950"
              htmlFor="scripture-reference"
            >
              Open a reference
            </label>
            <div className="mt-2 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-500"
                />
                <input
                  autoComplete="off"
                  className="h-11 w-full rounded-md border border-stone-300 bg-white pl-9 pr-3 text-sm text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-emerald-900 focus:ring-2 focus:ring-emerald-900/15"
                  id="scripture-reference"
                  onChange={(event) => setReferenceInput(event.target.value)}
                  placeholder="John 3:16"
                  spellCheck={false}
                  value={referenceInput}
                />
              </div>
              <button
                className="h-11 shrink-0 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                type="submit"
              >
                Open
              </button>
            </div>
          </div>

          <div className="max-w-xl space-y-1 text-xs leading-5 text-stone-500">
            <p>Try Genesis 1, Psalm 22, John 3:16, or 1 Corinthians 13.</p>
            <p>
              This edition follows Vulgate Psalm numbering. Many modern Bibles
              number some Psalms differently; Psalm 22 here is commonly numbered
              Psalm 23.
            </p>
          </div>
        </form>

        <p
          aria-live="polite"
          className={[
            "mt-2 min-h-5 text-sm",
            activeFeedback?.tone === "error"
              ? "font-medium text-red-800"
              : "text-emerald-800",
          ].join(" ")}
          role={activeFeedback?.tone === "error" ? "alert" : "status"}
        >
          {activeFeedback?.message ?? ""}
        </p>
      </div>

      <button
        aria-expanded={catalogOpen}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-stone-300 bg-[var(--panel)] text-sm font-semibold text-stone-900 shadow-sm lg:hidden"
        onClick={() => setCatalogOpen((open) => !open)}
        type="button"
      >
        <BookOpen aria-hidden className="size-4 text-[var(--accent)]" />
        {catalogOpen ? "Hide book catalog" : "Browse all 73 books"}
      </button>

      <div className="grid items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside
          aria-label="Catholic Bible book catalog"
          className={[
            "rounded-lg border border-stone-300 bg-[var(--panel)] shadow-sm lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto",
            catalogOpen ? "block" : "hidden",
          ].join(" ")}
        >
          <div className="sticky top-0 z-10 border-b border-stone-200 bg-[var(--panel)] p-4">
            <label
              className="text-sm font-semibold text-stone-950"
              htmlFor="book-filter"
            >
              Book catalog
            </label>
            <div className="relative mt-2">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-500"
              />
              <input
                autoComplete="off"
                className="h-10 w-full rounded-md border border-stone-300 bg-white pl-9 pr-3 text-sm text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-emerald-900 focus:ring-2 focus:ring-emerald-900/15"
                id="book-filter"
                onChange={(event) => setBookFilter(event.target.value)}
                placeholder="Filter books"
                type="search"
                value={bookFilter}
              />
            </div>
          </div>

          <div className="space-y-5 p-4">
            {bookmarks.length > 0 ? (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                    Saved chapters
                  </h3>
                  <span className="font-mono text-xs text-stone-500">
                    {bookmarks.length}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {bookmarks.map((bookmark) => {
                    const book = getScriptureBook(bookmark.bookId);

                    if (!book) {
                      return null;
                    }

                    const label = formatScriptureReference(
                      book,
                      bookmark.chapter,
                    );

                    return (
                      <button
                        className="rounded-md border border-amber-600 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-stone-900 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                        key={`${bookmark.bookId}:${bookmark.chapter}`}
                        onClick={() =>
                          openLocation(bookmark, { scroll: true })
                        }
                        type="button"
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {filteredBooks.length === 0 ? (
              <div className="rounded-md border border-dashed border-stone-300 p-4 text-center">
                <p className="text-sm font-semibold text-stone-800">
                  No books found
                </p>
                <p className="mt-1 text-xs leading-5 text-stone-500">
                  Try a modern or Original Douay-Rheims book name.
                </p>
              </div>
            ) : (
              <>
                <BookCatalogSection
                  books={oldTestamentBooks}
                  currentBookId={selectedBook.id}
                  onOpen={(book) =>
                    openLocation(
                      { bookId: book.id, chapter: 1 },
                      { scroll: true },
                    )
                  }
                  testament="Old Testament"
                />
                <BookCatalogSection
                  books={newTestamentBooks}
                  currentBookId={selectedBook.id}
                  onOpen={(book) =>
                    openLocation(
                      { bookId: book.id, chapter: 1 },
                      { scroll: true },
                    )
                  }
                  testament="New Testament"
                />
              </>
            )}
          </div>
        </aside>

        <article
          aria-labelledby="current-scripture-heading"
          className="scroll-mt-20 overflow-hidden rounded-lg border border-stone-300 bg-[var(--panel)] shadow-sm"
          ref={readerRef}
        >
          <header className="border-b border-emerald-900 bg-emerald-950 p-5 text-amber-50 sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
                  {getTestamentLabel(selectedBook.testament)} · Original
                  Douay-Rheims (1582–1610)
                </p>
                <h2
                  className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl"
                  id="current-scripture-heading"
                >
                  {formatScriptureReference(selectedBook, location.chapter)}
                </h2>
                {selectedBook.name !== selectedBook.sourceTitle ? (
                  <p className="mt-2 text-sm text-amber-100">
                    Original source title: {selectedBook.sourceTitle}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  aria-pressed={isBookmarked}
                  className={[
                    "inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
                    isBookmarked
                      ? "border-amber-200 bg-amber-100 text-emerald-950"
                      : "border-emerald-700 bg-emerald-900 text-amber-50 hover:border-amber-300",
                  ].join(" ")}
                  onClick={toggleBookmark}
                  type="button"
                >
                  <Bookmark
                    aria-hidden
                    className={[
                      "size-4",
                      isBookmarked ? "fill-current" : "",
                    ].join(" ")}
                  />
                  {isBookmarked ? "Saved" : "Bookmark"}
                </button>

                <div
                  aria-label="Reading text size"
                  className="inline-flex items-center rounded-md border border-emerald-700 bg-emerald-900 p-1"
                  role="group"
                >
                  <TextSizeButton
                    active={textSize === "compact"}
                    label="Smaller text"
                    onClick={() => chooseTextSize("compact")}
                  >
                    <Minus aria-hidden className="size-4" />
                  </TextSizeButton>
                  <TextSizeButton
                    active={textSize === "comfortable"}
                    label="Default text size"
                    onClick={() => chooseTextSize("comfortable")}
                  >
                    <span aria-hidden className="text-sm font-bold">
                      A
                    </span>
                  </TextSizeButton>
                  <TextSizeButton
                    active={textSize === "large"}
                    label="Larger text"
                    onClick={() => chooseTextSize("large")}
                  >
                    <Plus aria-hidden className="size-4" />
                  </TextSizeButton>
                </div>
              </div>
            </div>
          </header>

          <div className="border-b border-stone-200 bg-stone-50 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_minmax(7rem,0.45fr)_auto] sm:items-end">
              <ChapterButton
                disabled={!previousLocation}
                label={getLocationNavigationLabel(
                  "Previous chapter",
                  previousLocation,
                )}
                onClick={() =>
                  previousLocation &&
                  openLocation(previousLocation, { scroll: true })
                }
              >
                <ChevronLeft aria-hidden className="size-4" />
                <span className="sm:hidden">Previous</span>
              </ChapterButton>

              <label className="grid gap-1.5 text-xs font-semibold text-stone-600">
                Book
                <select
                  className="h-10 min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-950 outline-none focus:border-emerald-900 focus:ring-2 focus:ring-emerald-900/15"
                  onChange={(event) =>
                    openLocation(
                      { bookId: event.target.value, chapter: 1 },
                      { scroll: true },
                    )
                  }
                  value={selectedBook.id}
                >
                  {SCRIPTURE_BOOKS.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-stone-600">
                Chapter
                <select
                  className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-950 outline-none focus:border-emerald-900 focus:ring-2 focus:ring-emerald-900/15"
                  onChange={(event) =>
                    openLocation(
                      {
                        bookId: selectedBook.id,
                        chapter: Number(event.target.value),
                      },
                      { scroll: true },
                    )
                  }
                  value={location.chapter}
                >
                  {Array.from(
                    { length: selectedBook.chapters },
                    (_, index) => index + 1,
                  ).map((chapter) => (
                    <option key={chapter} value={chapter}>
                      {chapter}
                    </option>
                  ))}
                </select>
              </label>

              <ChapterButton
                disabled={!nextLocation}
                label={getLocationNavigationLabel(
                  "Next chapter",
                  nextLocation,
                )}
                onClick={() =>
                  nextLocation && openLocation(nextLocation, { scroll: true })
                }
              >
                <span className="sm:hidden">Next</span>
                <ChevronRight aria-hidden className="size-4" />
              </ChapterButton>
            </div>
          </div>

          <div className="min-h-[30rem] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            {currentFailure ? (
              <ReaderErrorState message={currentFailure} onRetry={retryLoad} />
            ) : !bookData ? (
              <ReaderLoadingState
                reference={formatScriptureReference(
                  selectedBook,
                  location.chapter,
                )}
              />
            ) : verses.length === 0 ? (
              <ReaderEmptyState
                reference={formatScriptureReference(
                  selectedBook,
                  location.chapter,
                )}
              />
            ) : (
              <ol
                aria-label={`${formatScriptureReference(
                  selectedBook,
                  location.chapter,
                )} verses`}
                className={["mx-auto max-w-3xl space-y-5", textSizeClasses[textSize]].join(
                  " ",
                )}
              >
                {verses.map((verse) => (
                  <li
                    className="grid scroll-mt-24 grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-md outline-none transition focus:bg-amber-50 focus:ring-2 focus:ring-amber-400/70 sm:grid-cols-[2.5rem_minmax(0,1fr)]"
                    id={getVerseElementId(
                      selectedBook.id,
                      location.chapter,
                      verse.number,
                    )}
                    key={verse.label}
                    tabIndex={-1}
                  >
                    <span
                      aria-hidden
                      className="pt-1 text-right font-mono text-xs font-semibold text-[var(--accent)] sm:text-sm"
                    >
                      {verse.label}
                    </span>
                    <span className="text-stone-800">
                      <span className="sr-only">Verse {verse.label}. </span>
                      {verse.text}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <footer className="grid gap-2 border-t border-stone-200 bg-stone-50 p-4 sm:grid-cols-2 sm:p-5">
            <FooterChapterButton
              direction="previous"
              location={previousLocation}
              onClick={() =>
                previousLocation &&
                openLocation(previousLocation, { scroll: true })
              }
            />
            <FooterChapterButton
              direction="next"
              location={nextLocation}
              onClick={() =>
                nextLocation && openLocation(nextLocation, { scroll: true })
              }
            />
          </footer>
        </article>
      </div>
    </section>
  );
}

function BookCatalogSection({
  books,
  currentBookId,
  onOpen,
  testament,
}: {
  books: readonly ScriptureBook[];
  currentBookId: string;
  onOpen: (book: ScriptureBook) => void;
  testament: string;
}) {
  if (books.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby={`catalog-${testament.replaceAll(" ", "-")}`}>
      <div className="flex items-center justify-between gap-3">
        <h3
          className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]"
          id={`catalog-${testament.replaceAll(" ", "-")}`}
        >
          {testament}
        </h3>
        <span className="font-mono text-xs text-stone-500">
          {books.length}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
        {books.map((book) => {
          const selected = currentBookId === book.id;

          return (
            <button
              aria-current={selected ? "page" : undefined}
              className={[
                "min-h-14 rounded-md border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                selected
                  ? "border-emerald-950 bg-emerald-950 text-amber-50"
                  : "border-stone-300 bg-white text-stone-900 hover:border-emerald-800 hover:bg-emerald-50",
              ].join(" ")}
              key={book.id}
              onClick={() => onOpen(book)}
              type="button"
            >
              <span className="block text-sm font-semibold leading-5">
                {book.name}
              </span>
              <span
                className={[
                  "mt-0.5 block text-xs leading-4",
                  selected ? "text-amber-100" : "text-stone-500",
                ].join(" ")}
              >
                {book.chapters} {book.chapters === 1 ? "chapter" : "chapters"}
                {book.name !== book.sourceTitle
                  ? ` · ${book.sourceTitle}`
                  : ""}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TextSizeButton({
  active,
  children,
  label,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={[
        "flex size-8 items-center justify-center rounded text-sm transition",
        active
          ? "bg-amber-100 text-emerald-950"
          : "text-amber-50 hover:bg-emerald-800",
      ].join(" ")}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function ChapterButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-10 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 transition hover:border-emerald-900 hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function FooterChapterButton({
  direction,
  location,
  onClick,
}: {
  direction: "previous" | "next";
  location: ScriptureLocation | null;
  onClick: () => void;
}) {
  const book = location ? getScriptureBook(location.bookId) : null;
  const label =
    book && location
      ? formatScriptureReference(book, location.chapter)
      : "End of the canon";

  return (
    <button
      className={[
        "group flex min-h-16 items-center gap-3 rounded-md border border-stone-300 bg-white px-4 py-3 text-left transition hover:border-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400",
        direction === "next" ? "sm:flex-row-reverse sm:text-right" : "",
      ].join(" ")}
      disabled={!location}
      onClick={onClick}
      type="button"
    >
      {direction === "previous" ? (
        <ChevronLeft aria-hidden className="size-5 shrink-0" />
      ) : (
        <ChevronRight aria-hidden className="size-5 shrink-0" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase text-stone-500">
          {direction === "previous" ? "Previous chapter" : "Next chapter"}
        </span>
        <span className="mt-1 block truncate text-sm font-semibold text-stone-900">
          {label}
        </span>
      </span>
    </button>
  );
}

function ReaderLoadingState({ reference }: { reference: string }) {
  return (
    <div
      aria-live="polite"
      className="mx-auto max-w-3xl space-y-5"
      role="status"
    >
      <span className="sr-only">Loading {reference}.</span>
      {["w-full", "w-11/12", "w-4/5", "w-full", "w-3/4"].map(
        (width, index) => (
          <div
            className="grid animate-pulse grid-cols-[2rem_1fr] gap-3"
            key={`${width}:${index}`}
          >
            <span className="h-4 rounded bg-stone-200" />
            <span className={`h-6 rounded bg-stone-200 ${width}`} />
          </div>
        ),
      )}
    </div>
  );
}

function ReaderErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="mx-auto max-w-xl rounded-lg border border-red-200 bg-red-50 p-6 text-center"
      role="alert"
    >
      <p className="text-lg font-semibold text-red-950">
        This book could not be opened
      </p>
      <p className="mt-2 text-sm leading-6 text-red-800">{message}</p>
      <button
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-red-900 px-4 text-sm font-semibold text-white transition hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
        onClick={onRetry}
        type="button"
      >
        <RefreshCcw aria-hidden className="size-4" />
        Try again
      </button>
    </div>
  );
}

function ReaderEmptyState({ reference }: { reference: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-lg border border-dashed border-stone-300 p-8 text-center">
      <BookOpen
        aria-hidden
        className="mx-auto size-8 text-[var(--accent)]"
      />
      <p className="mt-4 text-lg font-semibold text-stone-950">
        No verses found
      </p>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        {reference} is empty in the local source file. Choose another chapter
        or book.
      </p>
    </div>
  );
}

function getLocationNavigationLabel(
  prefix: string,
  location: ScriptureLocation | null,
) {
  if (!location) {
    return `${prefix} unavailable`;
  }

  const book = getScriptureBook(location.bookId);
  return book
    ? `${prefix}: ${formatScriptureReference(book, location.chapter)}`
    : `${prefix} unavailable`;
}

function getVerseElementId(bookId: string, chapter: number, verse: number) {
  return `verse-${bookId}-${chapter}-${verse}`;
}

function readStoredResume(): ScriptureLocation | null {
  try {
    const rawValue = window.localStorage.getItem(resumeStorageKey);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<ScriptureLocation>;
    const book =
      typeof parsed.bookId === "string"
        ? getScriptureBook(parsed.bookId)
        : null;
    const chapter = parsed.chapter;

    if (
      !book ||
      !Number.isInteger(chapter) ||
      typeof chapter !== "number" ||
      chapter < 1 ||
      chapter > book.chapters
    ) {
      return null;
    }

    return { bookId: book.id, chapter };
  } catch {
    return null;
  }
}

function readStoredBookmarks(): StoredBookmark[] {
  try {
    const rawValue = window.localStorage.getItem(bookmarkStorageKey);

    if (!rawValue) {
      return [];
    }

    const parsed: unknown = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const bookmarks: StoredBookmark[] = [];
    const seen = new Set<string>();

    for (const value of parsed) {
      if (!isStoredLocation(value)) {
        continue;
      }

      const book = getScriptureBook(value.bookId);

      if (!book || value.chapter > book.chapters) {
        continue;
      }

      const key = `${value.bookId}:${value.chapter}`;

      if (!seen.has(key)) {
        bookmarks.push(value);
        seen.add(key);
      }

      if (bookmarks.length === 24) {
        break;
      }
    }

    return bookmarks;
  } catch {
    return [];
  }
}

function readStoredTextSize(): TextSize {
  try {
    const value = window.localStorage.getItem(textSizeStorageKey);
    return value === "compact" || value === "large"
      ? value
      : "comfortable";
  } catch {
    return "comfortable";
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

function isStoredLocation(value: unknown): value is StoredBookmark {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.bookId === "string" &&
    typeof record.chapter === "number" &&
    Number.isInteger(record.chapter) &&
    record.chapter > 0
  );
}
