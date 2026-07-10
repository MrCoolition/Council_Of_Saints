export type ScriptureTestament = "old" | "new";

export type ScriptureBook = {
  id: string;
  name: string;
  sourceTitle: string;
  fileName: string;
  testament: ScriptureTestament;
  chapters: number;
  aliases: readonly string[];
};

export type ScriptureBookData = Record<string, Record<string, string>>;

export type ScriptureVerse = {
  number: number;
  label: string;
  text: string;
};

export type ScriptureLocation = {
  bookId: string;
  chapter: number;
};

export type ScripturePassage = ScriptureLocation & {
  verseStart: number | null;
  verseEnd: number | null;
};

export type ScriptureReturnSource =
  | "today"
  | "office-morning"
  | "office-evening"
  | "office-night";

export type ParsedScriptureReference =
  | {
      ok: true;
      book: ScriptureBook;
      chapter: number;
      verseStart: number | null;
      verseEnd: number | null;
    }
  | {
      ok: false;
      message: string;
    };

function defineBook(
  id: string,
  name: string,
  sourceTitle: string,
  testament: ScriptureTestament,
  chapters: number,
  aliases: readonly string[] = [],
): ScriptureBook {
  return {
    id,
    name,
    sourceTitle,
    fileName: `${sourceTitle}.json`,
    testament,
    chapters,
    aliases,
  };
}

export const SCRIPTURE_BOOKS: readonly ScriptureBook[] = [
  defineBook("genesis", "Genesis", "Genesis", "old", 50, ["Gen", "Gn"]),
  defineBook("exodus", "Exodus", "Exodus", "old", 40, ["Exod", "Ex"]),
  defineBook("leviticus", "Leviticus", "Leviticus", "old", 27, [
    "Lev",
    "Lv",
  ]),
  defineBook("numbers", "Numbers", "Numbers", "old", 36, ["Num", "Nm"]),
  defineBook(
    "deuteronomy",
    "Deuteronomy",
    "Deuteronomy",
    "old",
    34,
    ["Deut", "Dt"],
  ),
  defineBook("joshua", "Joshua", "Josue", "old", 24, ["Josh", "Jos"]),
  defineBook("judges", "Judges", "Judges", "old", 21, ["Judg", "Jdg"]),
  defineBook("ruth", "Ruth", "Ruth", "old", 4, ["Ru"]),
  defineBook("1-samuel", "1 Samuel", "1 Kings", "old", 31, [
    "1 Sam",
    "1 Sm",
    "I Samuel",
    "DR 1 Kings",
    "Douay 1 Kings",
  ]),
  defineBook("2-samuel", "2 Samuel", "2 Kings", "old", 24, [
    "2 Sam",
    "2 Sm",
    "II Samuel",
    "DR 2 Kings",
    "Douay 2 Kings",
  ]),
  defineBook("1-kings", "1 Kings", "3 Kings", "old", 22, [
    "1 Kgs",
    "1 Ki",
    "I Kings",
    "DR 3 Kings",
    "Douay 3 Kings",
  ]),
  defineBook("2-kings", "2 Kings", "4 Kings", "old", 25, [
    "2 Kgs",
    "2 Ki",
    "II Kings",
    "DR 4 Kings",
    "Douay 4 Kings",
  ]),
  defineBook(
    "1-chronicles",
    "1 Chronicles",
    "1 Paralipomenon",
    "old",
    29,
    ["1 Chr", "1 Chron", "I Chronicles"],
  ),
  defineBook(
    "2-chronicles",
    "2 Chronicles",
    "2 Paralipomenon",
    "old",
    36,
    ["2 Chr", "2 Chron", "II Chronicles"],
  ),
  defineBook("ezra", "Ezra", "1 Esdras", "old", 10, [
    "Ezr",
    "DR 1 Esdras",
    "Douay 1 Esdras",
  ]),
  defineBook("nehemiah", "Nehemiah", "2 Esdras", "old", 13, [
    "Neh",
    "Ne",
    "DR 2 Esdras",
    "Douay 2 Esdras",
  ]),
  defineBook("tobit", "Tobit", "Tobias", "old", 14, ["Tob", "Tb"]),
  defineBook("judith", "Judith", "Judith", "old", 16, ["Jdt"]),
  defineBook("esther", "Esther", "Esther", "old", 16, ["Est", "Esth"]),
  defineBook(
    "1-maccabees",
    "1 Maccabees",
    "1 Machabees",
    "old",
    16,
    ["1 Macc", "1 Mac", "I Maccabees"],
  ),
  defineBook(
    "2-maccabees",
    "2 Maccabees",
    "2 Machabees",
    "old",
    15,
    ["2 Macc", "2 Mac", "II Maccabees"],
  ),
  defineBook("job", "Job", "Job", "old", 42, ["Jb"]),
  defineBook("psalms", "Psalms", "Psalms", "old", 150, [
    "Psalm",
    "Ps",
    "Pss",
  ]),
  defineBook("proverbs", "Proverbs", "Proverbs", "old", 31, [
    "Prov",
    "Prv",
  ]),
  defineBook(
    "ecclesiastes",
    "Ecclesiastes",
    "Ecclesiastes",
    "old",
    12,
    ["Eccl", "Qoheleth", "Qoh"],
  ),
  defineBook(
    "song-of-songs",
    "Song of Songs",
    "Canticle of Canticles",
    "old",
    8,
    ["Song of Solomon", "Song", "Songs", "Canticles", "Cant"],
  ),
  defineBook("wisdom", "Wisdom", "Wisdom", "old", 19, [
    "Wisdom of Solomon",
    "Wis",
  ]),
  defineBook("sirach", "Sirach", "Ecclesiasticus", "old", 51, [
    "Ecclus",
    "Sir",
  ]),
  defineBook("isaiah", "Isaiah", "Isaie", "old", 66, [
    "Isaias",
    "Isa",
    "Is",
  ]),
  defineBook("jeremiah", "Jeremiah", "Jeremie", "old", 52, [
    "Jeremy",
    "Jeremias",
    "Jer",
    "Jr",
  ]),
  defineBook(
    "lamentations",
    "Lamentations",
    "Lamentations",
    "old",
    5,
    ["Lam"],
  ),
  defineBook("baruch", "Baruch", "Baruch", "old", 6, ["Bar"]),
  defineBook("ezekiel", "Ezekiel", "Ezechiel", "old", 48, [
    "Ezek",
    "Eze",
  ]),
  defineBook("daniel", "Daniel", "Daniel", "old", 14, ["Dan", "Dn"]),
  defineBook("hosea", "Hosea", "Osee", "old", 14, ["Hos"]),
  defineBook("joel", "Joel", "Joel", "old", 3, ["Jl"]),
  defineBook("amos", "Amos", "Amos", "old", 9, ["Am"]),
  defineBook("obadiah", "Obadiah", "Abdias", "old", 1, ["Obad", "Ob"]),
  defineBook("jonah", "Jonah", "Jonas", "old", 4, ["Jon"]),
  defineBook("micah", "Micah", "Micheas", "old", 7, ["Mic"]),
  defineBook("nahum", "Nahum", "Nahum", "old", 3, ["Nah"]),
  defineBook("habakkuk", "Habakkuk", "Habacuc", "old", 3, ["Hab"]),
  defineBook("zephaniah", "Zephaniah", "Sophonias", "old", 3, [
    "Zeph",
    "Zep",
  ]),
  defineBook("haggai", "Haggai", "Aggeus", "old", 2, ["Hag"]),
  defineBook("zechariah", "Zechariah", "Zacharias", "old", 14, [
    "Zech",
    "Zec",
  ]),
  defineBook("malachi", "Malachi", "Malachie", "old", 4, [
    "Malachias",
    "Mal",
  ]),
  defineBook("matthew", "Matthew", "Matthew", "new", 28, ["Matt", "Mt"]),
  defineBook("mark", "Mark", "Mark", "new", 16, ["Mk", "Mrk"]),
  defineBook("luke", "Luke", "Luke", "new", 24, ["Lk"]),
  defineBook("john", "John", "John", "new", 21, ["Jn", "Jhn"]),
  defineBook("acts", "Acts", "Acts", "new", 28, ["Acts of the Apostles"]),
  defineBook("romans", "Romans", "Romans", "new", 16, ["Rom", "Rm"]),
  defineBook(
    "1-corinthians",
    "1 Corinthians",
    "1 Corinthians",
    "new",
    16,
    ["1 Cor", "1 Co", "I Corinthians"],
  ),
  defineBook(
    "2-corinthians",
    "2 Corinthians",
    "2 Corinthians",
    "new",
    13,
    ["2 Cor", "2 Co", "II Corinthians"],
  ),
  defineBook("galatians", "Galatians", "Galatians", "new", 6, [
    "Gal",
  ]),
  defineBook("ephesians", "Ephesians", "Ephesians", "new", 6, [
    "Eph",
  ]),
  defineBook("philippians", "Philippians", "Philippians", "new", 4, [
    "Phil",
    "Php",
  ]),
  defineBook("colossians", "Colossians", "Colossians", "new", 4, [
    "Col",
  ]),
  defineBook(
    "1-thessalonians",
    "1 Thessalonians",
    "1 Thessalonians",
    "new",
    5,
    ["1 Thess", "1 Thes", "1 Th", "I Thessalonians"],
  ),
  defineBook(
    "2-thessalonians",
    "2 Thessalonians",
    "2 Thessalonians",
    "new",
    3,
    ["2 Thess", "2 Thes", "2 Th", "II Thessalonians"],
  ),
  defineBook(
    "1-timothy",
    "1 Timothy",
    "1 Timothy",
    "new",
    6,
    ["1 Tim", "1 Tm", "I Timothy"],
  ),
  defineBook(
    "2-timothy",
    "2 Timothy",
    "2 Timothy",
    "new",
    4,
    ["2 Tim", "2 Tm", "II Timothy"],
  ),
  defineBook("titus", "Titus", "Titus", "new", 3, ["Tit"]),
  defineBook("philemon", "Philemon", "Philemon", "new", 1, ["Phlm", "Phm"]),
  defineBook("hebrews", "Hebrews", "Hebrews", "new", 13, ["Heb"]),
  defineBook("james", "James", "James", "new", 5, ["Jas", "Jm"]),
  defineBook("1-peter", "1 Peter", "1 Peter", "new", 5, [
    "1 Pet",
    "1 Pt",
    "I Peter",
  ]),
  defineBook("2-peter", "2 Peter", "2 Peter", "new", 3, [
    "2 Pet",
    "2 Pt",
    "II Peter",
  ]),
  defineBook("1-john", "1 John", "1 John", "new", 5, [
    "1 Jn",
    "I John",
  ]),
  defineBook("2-john", "2 John", "2 John", "new", 1, [
    "2 Jn",
    "II John",
  ]),
  defineBook("3-john", "3 John", "3 John", "new", 1, [
    "3 Jn",
    "III John",
  ]),
  defineBook("jude", "Jude", "Jude", "new", 1, ["Jud"]),
  defineBook("revelation", "Revelation", "Apocalypse", "new", 22, [
    "Revelation of John",
    "Rev",
    "Rv",
  ]),
];

export const OLD_TESTAMENT_BOOKS = SCRIPTURE_BOOKS.filter(
  (book) => book.testament === "old",
);

export const NEW_TESTAMENT_BOOKS = SCRIPTURE_BOOKS.filter(
  (book) => book.testament === "new",
);

const booksById = new Map(SCRIPTURE_BOOKS.map((book) => [book.id, book]));
const booksByAlias = new Map<string, ScriptureBook>();

for (const book of SCRIPTURE_BOOKS) {
  for (const alias of [book.sourceTitle, ...book.aliases]) {
    booksByAlias.set(normalizeBookName(alias), book);
  }
}

// Canonical modern names are registered last so unavoidable collisions such as
// "1 Kings" resolve to the modern catalog. Explicit "DR"/"Douay" aliases above
// remain available for the Original Douay-Rheims titles.
for (const book of SCRIPTURE_BOOKS) {
  booksByAlias.set(normalizeBookName(book.name), book);
}

export function getScriptureBook(bookId: string) {
  return booksById.get(bookId) ?? null;
}

export function getScriptureBookUrl(book: ScriptureBook) {
  return `/data/douay-rheims/${encodeURIComponent(book.fileName)}`;
}

export function getTestamentLabel(testament: ScriptureTestament) {
  return testament === "old" ? "Old Testament" : "New Testament";
}

export function formatScriptureReference(
  book: ScriptureBook,
  chapter: number,
  verseStart: number | null = null,
  verseEnd: number | null = verseStart,
) {
  if (verseStart === null) {
    return `${book.name} ${chapter}`;
  }

  const verseRange =
    verseEnd !== null && verseEnd !== verseStart
      ? `${verseStart}-${verseEnd}`
      : String(verseStart);

  return `${book.name} ${chapter}:${verseRange}`;
}

export function parseScriptureReference(
  rawReference: string,
): ParsedScriptureReference {
  const reference = rawReference.trim();
  const match = reference.match(
    /^(.+?)\s+(\d+)(?:\s*:\s*(\d+)(?:\s*[-\u2013\u2014]\s*(\d+))?)?$/,
  );

  if (!match) {
    return {
      ok: false,
      message: "Use a reference such as John 3, John 3:16, or John 3:16-18.",
    };
  }

  const book = booksByAlias.get(normalizeBookName(match[1]));

  if (!book) {
    return {
      ok: false,
      message: `Book not found: ${match[1].trim()}.`,
    };
  }

  const chapter = Number(match[2]);

  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    return {
      ok: false,
      message: `${book.name} has ${book.chapters} ${
        book.chapters === 1 ? "chapter" : "chapters"
      } in this local edition.`,
    };
  }

  const verseStart = match[3] ? Number(match[3]) : null;
  const verseEnd = match[4] ? Number(match[4]) : verseStart;

  if (
    verseStart !== null &&
    (!Number.isSafeInteger(verseStart) || verseStart < 1)
  ) {
    return {
      ok: false,
      message: "Verse numbers must be positive whole numbers.",
    };
  }

  if (
    verseEnd !== null &&
    (!Number.isSafeInteger(verseEnd) ||
      verseEnd < 1 ||
      (verseStart !== null && verseEnd < verseStart))
  ) {
    return {
      ok: false,
      message: "The ending verse must be at or after the starting verse.",
    };
  }

  return { ok: true, book, chapter, verseStart, verseEnd };
}

export function parseScripturePassage(
  rawPassage: string | readonly string[] | undefined,
): ScripturePassage | null {
  const passage = Array.isArray(rawPassage) ? rawPassage[0] : rawPassage;

  if (!passage) {
    return null;
  }

  const match = passage.match(
    /^([a-z0-9]+(?:-[a-z0-9]+)*)\.(\d+)(?:\.(\d+)(?:-(\d+))?)?$/,
  );

  if (!match) {
    return null;
  }

  const book = getScriptureBook(match[1]);
  const chapter = Number(match[2]);
  const verseStart = match[3] ? Number(match[3]) : null;
  const verseEnd = match[4] ? Number(match[4]) : verseStart;

  if (
    !book ||
    !Number.isSafeInteger(chapter) ||
    chapter < 1 ||
    chapter > book.chapters ||
    (verseStart !== null &&
      (!Number.isSafeInteger(verseStart) || verseStart < 1)) ||
    (verseEnd !== null &&
      (!Number.isSafeInteger(verseEnd) ||
        verseEnd < 1 ||
        (verseStart !== null && verseEnd < verseStart)))
  ) {
    return null;
  }

  return {
    bookId: book.id,
    chapter,
    verseStart,
    verseEnd,
  };
}

export function formatScripturePassage(passage: ScripturePassage) {
  const book = getScriptureBook(passage.bookId);

  if (!book || !isValidScripturePassage(passage, book)) {
    return null;
  }

  const verseRange =
    passage.verseStart === null
      ? ""
      : passage.verseEnd !== null &&
          passage.verseEnd !== passage.verseStart
        ? `.${passage.verseStart}-${passage.verseEnd}`
        : `.${passage.verseStart}`;

  return `${book.id}.${passage.chapter}${verseRange}`;
}

export function getScriptureHref(
  passage: ScripturePassage,
  from?: ScriptureReturnSource | null,
) {
  const formattedPassage = formatScripturePassage(passage);

  if (!formattedPassage) {
    return "/scripture";
  }

  const params = new URLSearchParams({ passage: formattedPassage });

  if (from) {
    params.set("from", from);
  }

  return `/scripture?${params.toString()}`;
}

export function parseScriptureReturnSource(
  rawSource: string | readonly string[] | undefined,
): ScriptureReturnSource | null {
  const source = Array.isArray(rawSource) ? rawSource[0] : rawSource;

  return source === "today" ||
    source === "office-morning" ||
    source === "office-evening" ||
    source === "office-night"
    ? source
    : null;
}

export function isScriptureBookData(value: unknown): value is ScriptureBookData {
  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).every(([chapterNumber, chapter]) => {
    return (
      /^\d+$/.test(chapterNumber) &&
      isRecord(chapter) &&
      Object.entries(chapter).every(
        ([verseNumber, text]) => /^\d+$/.test(verseNumber) && typeof text === "string",
      )
    );
  });
}

export function getChapterVerses(
  data: ScriptureBookData,
  chapter: number,
): ScriptureVerse[] {
  const verses = data[String(chapter)];

  if (!verses) {
    return [];
  }

  return Object.entries(verses)
    .map(([label, text]) => ({ number: Number(label), label, text }))
    .filter((verse) => Number.isFinite(verse.number))
    .sort((left, right) => left.number - right.number);
}

export function getAdjacentScriptureChapter(
  location: ScriptureLocation,
  direction: -1 | 1,
): ScriptureLocation | null {
  const bookIndex = SCRIPTURE_BOOKS.findIndex(
    (book) => book.id === location.bookId,
  );

  if (bookIndex < 0) {
    return null;
  }

  const book = SCRIPTURE_BOOKS[bookIndex];

  if (direction === -1) {
    if (location.chapter > 1) {
      return { bookId: book.id, chapter: location.chapter - 1 };
    }

    const previousBook = SCRIPTURE_BOOKS[bookIndex - 1];
    return previousBook
      ? { bookId: previousBook.id, chapter: previousBook.chapters }
      : null;
  }

  if (location.chapter < book.chapters) {
    return { bookId: book.id, chapter: location.chapter + 1 };
  }

  const nextBook = SCRIPTURE_BOOKS[bookIndex + 1];
  return nextBook ? { bookId: nextBook.id, chapter: 1 } : null;
}

function normalizeBookName(value: string) {
  return value.toLocaleLowerCase("en-US").replace(/[^a-z0-9]/g, "");
}

function isValidScripturePassage(
  passage: ScripturePassage,
  book: ScriptureBook,
) {
  return (
    Number.isSafeInteger(passage.chapter) &&
    passage.chapter >= 1 &&
    passage.chapter <= book.chapters &&
    ((passage.verseStart === null && passage.verseEnd === null) ||
      (passage.verseStart !== null &&
        passage.verseEnd !== null &&
        Number.isSafeInteger(passage.verseStart) &&
        Number.isSafeInteger(passage.verseEnd) &&
        passage.verseStart >= 1 &&
        passage.verseEnd >= passage.verseStart))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
