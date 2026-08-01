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
  getScriptureHref,
  getScriptureBookUrl,
  getTestamentLabel,
  isScriptureBookData,
  parseScriptureReference,
  SCRIPTURE_BOOKS,
  type ScriptureBook,
  type ScriptureBookData,
  type ScriptureLocation,
  type ScripturePassage,
  type ScriptureReturnSource,
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

export function ScriptureReader({
  initialPassage = null,
  initialBookData = null,
  returnSource = null,
}: {
  initialPassage?: ScripturePassage | null;
  initialBookData?: ScriptureBookData | null;
  returnSource?: ScriptureReturnSource | null;
}) {
  const [location, setLocation] = useState<ScriptureLocation>(() =>
    initialPassage
      ? {
          bookId: initialPassage.bookId,
          chapter: initialPassage.chapter,
        }
      : defaultLocation,
  );
  const [resource, setResource] = useState<ReaderResource | null>(() =>
    initialBookData
      ? {
          bookId: initialPassage?.bookId ?? defaultLocation.bookId,
          data: initialBookData,
        }
      : null,
  );
  const [failure, setFailure] = useState<ReaderFailure | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [bookFilter, setBookFilter] = useState("");
  const [referenceInput, setReferenceInput] = useState("");
  const [referenceFeedback, setReferenceFeedback] =
    useState<ReferenceFeedback | null>(null);
  const [selectedPassage, setSelectedPassage] =
    useState<ScripturePassage | null>(initialPassage);
  const [pendingPassage, setPendingPassage] =
    useState<ScripturePassage | null>(initialPassage);
  const [bookmarks, setBookmarks] = useState<StoredBookmark[]>([]);
  const [textSize, setTextSize] =
    useState<TextSize>("comfortable");
  const [showFullChapter, setShowFullChapter] = useState(
    initialPassage?.verseStart === null ||
      initialPassage?.verseStart === undefined,
  );
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
  const selectedRange =
    selectedPassage?.bookId === location.bookId &&
    selectedPassage.chapter === location.chapter
      ? selectedPassage
      : null;
  const missingTargetRange =
    selectedRange?.verseStart !== null &&
    selectedRange?.verseStart !== undefined &&
    bookData !== null &&
    (!verses.some((verse) => verse.number === selectedRange.verseStart) ||
      !verses.some((verse) => verse.number === selectedRange.verseEnd));
  const displayedVerses =
    selectedRange?.verseStart !== null &&
    selectedRange?.verseStart !== undefined &&
    !showFullChapter
      ? verses.filter((verse) => isVerseInPassage(verse.number, selectedRange))
      : verses;

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

      if (storedResume && !initialPassage) {
        setLocation(storedResume);
      }

      setBookmarks(storedBookmarks);
      setTextSize(storedTextSize);
      setStorageReady(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [initialPassage]);

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
          throw new Error(`Scripture could not be opened (${response.status}).`);
        }

        const data: unknown = await response.json();

        if (!isScriptureBookData(data)) {
          throw new Error("This book could not be opened.");
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
              : "Scripture could not be opened.",
        });
      }
    }

    void loadBook();

    return () => controller.abort();
  }, [loadAttempt, location.bookId]);

  useEffect(() => {
    if (
      !pendingPassage ||
      !bookData ||
      pendingPassage.bookId !== location.bookId ||
      pendingPassage.chapter !== location.chapter
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const firstVerse =
        pendingPassage.verseStart ?? verses.at(0)?.number ?? null;

      if (firstVerse === null) {
        setPendingPassage(null);
        return;
      }

      const verse = document.getElementById(
        getVerseElementId(location.bookId, location.chapter, firstVerse),
      );

      if (verse) {
        verse.scrollIntoView({ behavior: "smooth", block: "center" });
        verse.focus({ preventScroll: true });
      }

      setPendingPassage(null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    bookData,
    location.bookId,
    location.chapter,
    pendingPassage,
    verses,
  ]);

  function openLocation(
    nextLocation: ScriptureLocation,
    options: {
      scroll?: boolean;
      verseStart?: number | null;
      verseEnd?: number | null;
    } = {},
  ) {
    const nextBook = getScriptureBook(nextLocation.bookId);

    if (
      !nextBook ||
      nextLocation.chapter < 1 ||
      nextLocation.chapter > nextBook.chapters
    ) {
      return;
    }

    const verseStart = options.verseStart ?? null;
    const nextPassage: ScripturePassage = {
      ...nextLocation,
      verseStart,
      verseEnd: verseStart === null ? null : (options.verseEnd ?? verseStart),
    };

    setLocation(nextLocation);
    setSelectedPassage(nextPassage);
    setPendingPassage(nextPassage);
    setShowFullChapter(verseStart === null);
    setFailure(null);
    setReferenceFeedback(null);
    setCatalogOpen(false);
    window.history.replaceState(
      null,
      "",
      getScriptureHref(nextPassage, returnSource),
    );

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
      parsed.verseStart,
      parsed.verseEnd,
    );

    openLocation(
      { bookId: parsed.book.id, chapter: parsed.chapter },
      {
        scroll: true,
        verseStart: parsed.verseStart,
        verseEnd: parsed.verseEnd,
      },
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
  const activeFeedback = missingTargetRange
    ? {
        tone: "error" as const,
        message: `${formatPassageVerseLabel(selectedRange)} is unavailable in this chapter.`,
      }
    : referenceFeedback;

  return (
    <section aria-labelledby="scripture-reader-heading" className="space-y-4">
      <h2 className="sr-only" id="scripture-reader-heading">
        Scripture reader
      </h2>

      <div className="rounded-lg border border-hairline bg-[var(--panel)] p-4 shadow-sm sm:p-5">
        <form
          className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
          onSubmit={handleReferenceSubmit}
        >
          <div>
            <label
              className="text-sm font-semibold text-foreground"
              htmlFor="scripture-reference"
            >
              Open a reference
            </label>
            <div className="mt-2 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                />
                <input
                  autoComplete="off"
                  className="h-11 w-full rounded-md border border-hairline bg-vellum pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-ecclesial-green focus:ring-2 focus:ring-ecclesial-green/15"
                  id="scripture-reference"
                  onChange={(event) => setReferenceInput(event.target.value)}
                  placeholder="John 3:16-18"
                  spellCheck={false}
                  value={referenceInput}
                />
              </div>
              <button
                className="h-11 shrink-0 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-vellum transition hover:bg-oxblood/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gilt focus-visible:ring-offset-2"
                type="submit"
              >
                Open
              </button>
            </div>
          </div>

        </form>

        <p
          aria-live="polite"
          className={[
            "mt-2 min-h-5 text-sm",
            activeFeedback?.tone === "error"
              ? "font-medium text-oxblood"
              : "text-ecclesial-green",
          ].join(" ")}
          role={activeFeedback?.tone === "error" ? "alert" : "status"}
        >
          {activeFeedback?.message ?? ""}
        </p>
      </div>

      <button
        aria-expanded={catalogOpen}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-hairline bg-[var(--panel)] text-sm font-semibold text-foreground shadow-sm lg:hidden"
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
            "rounded-lg border border-hairline bg-[var(--panel)] shadow-sm lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto",
            catalogOpen ? "block" : "hidden",
          ].join(" ")}
        >
          <div className="sticky top-0 z-10 border-b border-hairline bg-[var(--panel)] p-4">
            <label
              className="text-sm font-semibold text-foreground"
              htmlFor="book-filter"
            >
              Book catalog
            </label>
            <div className="relative mt-2">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              />
              <input
                autoComplete="off"
                className="h-10 w-full rounded-md border border-hairline bg-vellum pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-ecclesial-green focus:ring-2 focus:ring-ecclesial-green/15"
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
                  <span className="font-mono text-xs text-muted">
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
                        className="rounded-md border border-gilt bg-gilt/15 px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-gilt/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gilt"
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
              <div className="rounded-md border border-dashed border-hairline p-4 text-center">
                <p className="text-sm font-semibold text-foreground">
                  No books found
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Try another book name.
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
          className="scroll-mt-20 overflow-hidden rounded-lg border border-hairline bg-[var(--panel)] shadow-sm"
          ref={readerRef}
        >
          <header className="border-b border-ecclesial-green bg-sanctuary-night p-5 text-vellum sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gilt-light)]">
                  {getTestamentLabel(selectedBook.testament)}
                </p>
                <h2
                  className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl"
                  id="current-scripture-heading"
                >
                  {formatScriptureReference(selectedBook, location.chapter)}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  aria-pressed={isBookmarked}
                  className={[
                    "inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gilt",
                    isBookmarked
                      ? "border-gilt bg-[var(--gilt-light)] text-sanctuary-night"
                      : "border-ecclesial-green bg-ecclesial-green text-vellum hover:border-gilt",
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
                  className="inline-flex items-center rounded-md border border-ecclesial-green bg-ecclesial-green p-1"
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

          <div className="border-b border-hairline bg-[var(--panel-soft)] p-4 sm:p-5">
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

              <label className="grid gap-1.5 text-xs font-semibold text-muted">
                Book
                <select
                  className="h-10 min-w-0 rounded-md border border-hairline bg-vellum px-3 text-sm font-semibold text-foreground outline-none focus:border-ecclesial-green focus:ring-2 focus:ring-ecclesial-green/15"
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

              <label className="grid gap-1.5 text-xs font-semibold text-muted">
                Chapter
                <select
                  className="h-10 rounded-md border border-hairline bg-vellum px-3 text-sm font-semibold text-foreground outline-none focus:border-ecclesial-green focus:ring-2 focus:ring-ecclesial-green/15"
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
            {selectedRange?.verseStart !== null &&
            selectedRange?.verseStart !== undefined ? (
              <section
                aria-label="Focused passage controls"
                className="mx-auto mb-6 flex max-w-3xl flex-col gap-3 rounded-xl border border-gilt/60 bg-gilt/15 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <BookOpen
                    aria-hidden
                    className="mt-0.5 size-5 shrink-0 text-oxblood"
                  />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.13em] text-oxblood">
                      {showFullChapter
                        ? "Full chapter · requested verses highlighted"
                        : "Focused passage"}
                    </p>
                    <p className="mt-1 font-serif text-lg font-semibold text-foreground">
                      {formatScriptureReference(
                        selectedBook,
                        location.chapter,
                        selectedRange.verseStart,
                        selectedRange.verseEnd,
                      )}
                    </p>
                  </div>
                </div>
                <button
                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-gilt bg-vellum px-3 text-sm font-bold text-oxblood transition hover:bg-gilt/25"
                  onClick={() => setShowFullChapter((current) => !current)}
                  type="button"
                >
                  {showFullChapter
                    ? "Return to focused passage"
                    : "Show full chapter"}
                </button>
              </section>
            ) : null}

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
                {displayedVerses.map((verse) => {
                  const selected = isVerseInPassage(verse.number, selectedRange);

                  return (
                    <li
                    aria-current={selected ? "true" : undefined}
                    className={[
                      "grid scroll-mt-24 grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-md px-2 py-1 outline-none transition focus:bg-gilt/15 focus:ring-2 focus:ring-gilt/70 sm:grid-cols-[2.5rem_minmax(0,1fr)]",
                      selected
                        ? "bg-gilt/20 ring-1 ring-inset ring-gilt/60"
                        : "",
                    ].join(" ")}
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
                    <span className="text-foreground">
                      <span className="sr-only">Verse {verse.label}. </span>
                      {verse.text}
                    </span>
                  </li>
                  );
                })}
              </ol>
            )}
          </div>

          <footer className="grid gap-2 border-t border-hairline bg-[var(--panel-soft)] p-4 sm:grid-cols-2 sm:p-5">
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
        <span className="font-mono text-xs text-muted">
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
                "min-h-14 rounded-md border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gilt",
                selected
                  ? "border-sanctuary-night bg-sanctuary-night text-vellum"
                  : "border-hairline bg-vellum text-foreground hover:border-ecclesial-green hover:bg-ecclesial-green/5",
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
                  selected ? "text-[var(--gilt-light)]" : "text-muted",
                ].join(" ")}
              >
                {book.chapters} {book.chapters === 1 ? "chapter" : "chapters"}
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
          ? "bg-[var(--gilt-light)] text-sanctuary-night"
          : "text-vellum hover:bg-ecclesial-green",
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
      className="inline-flex h-10 items-center justify-center gap-1 rounded-md border border-hairline bg-vellum px-3 text-sm font-semibold text-foreground transition hover:border-ecclesial-green hover:text-ecclesial-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gilt disabled:cursor-not-allowed disabled:bg-parchment disabled:text-muted"
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
        "group flex min-h-16 items-center gap-3 rounded-md border border-hairline bg-vellum px-4 py-3 text-left transition hover:border-ecclesial-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gilt disabled:cursor-not-allowed disabled:bg-parchment disabled:text-muted",
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
        <span className="block text-xs font-semibold uppercase text-muted">
          {direction === "previous" ? "Previous chapter" : "Next chapter"}
        </span>
        <span className="mt-1 block truncate text-sm font-semibold text-foreground">
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
            <span className="h-4 rounded bg-hairline" />
            <span className={`h-6 rounded bg-hairline ${width}`} />
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
      className="mx-auto max-w-xl rounded-lg border border-oxblood/25 bg-oxblood/5 p-6 text-center"
      role="alert"
    >
      <p className="text-lg font-semibold text-oxblood">
        This book could not be opened
      </p>
      <p className="mt-2 text-sm leading-6 text-oxblood">{message}</p>
      <button
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-oxblood px-4 text-sm font-semibold text-vellum transition hover:bg-oxblood/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gilt focus-visible:ring-offset-2"
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
    <div className="mx-auto max-w-xl rounded-lg border border-dashed border-hairline p-8 text-center">
      <BookOpen
        aria-hidden
        className="mx-auto size-8 text-[var(--accent)]"
      />
      <p className="mt-4 text-lg font-semibold text-foreground">
        No verses found
      </p>
      <p className="mt-2 text-sm leading-6 text-muted">
        {reference} is unavailable. Choose another chapter or book.
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

function isVerseInPassage(
  verse: number,
  passage: ScripturePassage | null,
) {
  if (passage?.verseStart === null || passage?.verseStart === undefined) {
    return false;
  }

  const verseEnd = passage.verseEnd ?? passage.verseStart;
  return verse >= passage.verseStart && verse <= verseEnd;
}

function formatPassageVerseLabel(passage: ScripturePassage | null) {
  if (passage?.verseStart === null || passage?.verseStart === undefined) {
    return "The requested passage";
  }

  return passage.verseEnd !== null && passage.verseEnd !== passage.verseStart
    ? `Verses ${passage.verseStart}-${passage.verseEnd}`
    : `Verse ${passage.verseStart}`;
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
