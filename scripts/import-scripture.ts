import { execFile } from "node:child_process";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

type CanonBook = {
  sourceSlug: string;
  outputFile: string;
  chapters: number;
};

type SourceVerse = {
  verse: number;
  text: string;
};

type SourceChapter = {
  chapter: number;
  verses: SourceVerse[];
};

type SourceBook = {
  book: string;
  chapters: SourceChapter[];
};

type ReaderBook = Record<string, Record<string, string>>;

type SourceRevision = {
  commit: string;
  verified: boolean;
};

const sourceCommit = "0bf4218b9b46b5b00d29a703b5b74226051b97a5";
const defaultSourceRoot = "C:/tmp/original-douay-rheims";
const allowUnpinnedSource =
  process.env.SCRIPTURE_ALLOW_UNPINNED_SOURCE === "1";
const execFileAsync = promisify(execFile);

const catholicCanon: readonly CanonBook[] = [
  { sourceSlug: "genesis", outputFile: "Genesis.json", chapters: 50 },
  { sourceSlug: "exodus", outputFile: "Exodus.json", chapters: 40 },
  { sourceSlug: "leviticus", outputFile: "Leviticus.json", chapters: 27 },
  { sourceSlug: "numbers", outputFile: "Numbers.json", chapters: 36 },
  { sourceSlug: "deuteronomy", outputFile: "Deuteronomy.json", chapters: 34 },
  { sourceSlug: "josue", outputFile: "Josue.json", chapters: 24 },
  { sourceSlug: "judges", outputFile: "Judges.json", chapters: 21 },
  { sourceSlug: "ruth", outputFile: "Ruth.json", chapters: 4 },
  { sourceSlug: "1-kings", outputFile: "1 Kings.json", chapters: 31 },
  { sourceSlug: "2-kings", outputFile: "2 Kings.json", chapters: 24 },
  { sourceSlug: "3-kings", outputFile: "3 Kings.json", chapters: 22 },
  { sourceSlug: "4-kings", outputFile: "4 Kings.json", chapters: 25 },
  {
    sourceSlug: "1-paralipomenon",
    outputFile: "1 Paralipomenon.json",
    chapters: 29,
  },
  {
    sourceSlug: "2-paralipomenon",
    outputFile: "2 Paralipomenon.json",
    chapters: 36,
  },
  { sourceSlug: "1-esdras", outputFile: "1 Esdras.json", chapters: 10 },
  { sourceSlug: "2-esdras", outputFile: "2 Esdras.json", chapters: 13 },
  { sourceSlug: "tobias", outputFile: "Tobias.json", chapters: 14 },
  { sourceSlug: "judith", outputFile: "Judith.json", chapters: 16 },
  { sourceSlug: "esther", outputFile: "Esther.json", chapters: 16 },
  {
    sourceSlug: "1-machabees",
    outputFile: "1 Machabees.json",
    chapters: 16,
  },
  {
    sourceSlug: "2-machabees",
    outputFile: "2 Machabees.json",
    chapters: 15,
  },
  { sourceSlug: "job", outputFile: "Job.json", chapters: 42 },
  { sourceSlug: "psalms", outputFile: "Psalms.json", chapters: 150 },
  { sourceSlug: "proverbs", outputFile: "Proverbs.json", chapters: 31 },
  {
    sourceSlug: "ecclesiastes",
    outputFile: "Ecclesiastes.json",
    chapters: 12,
  },
  {
    sourceSlug: "canticle-of-canticles",
    outputFile: "Canticle of Canticles.json",
    chapters: 8,
  },
  { sourceSlug: "wisdom", outputFile: "Wisdom.json", chapters: 19 },
  {
    sourceSlug: "ecclesiasticus",
    outputFile: "Ecclesiasticus.json",
    chapters: 51,
  },
  { sourceSlug: "isaie", outputFile: "Isaie.json", chapters: 66 },
  { sourceSlug: "jeremie", outputFile: "Jeremie.json", chapters: 52 },
  {
    sourceSlug: "lamentations",
    outputFile: "Lamentations.json",
    chapters: 5,
  },
  { sourceSlug: "baruch", outputFile: "Baruch.json", chapters: 6 },
  { sourceSlug: "ezechiel", outputFile: "Ezechiel.json", chapters: 48 },
  { sourceSlug: "daniel", outputFile: "Daniel.json", chapters: 14 },
  { sourceSlug: "osee", outputFile: "Osee.json", chapters: 14 },
  { sourceSlug: "joel", outputFile: "Joel.json", chapters: 3 },
  { sourceSlug: "amos", outputFile: "Amos.json", chapters: 9 },
  { sourceSlug: "abdias", outputFile: "Abdias.json", chapters: 1 },
  { sourceSlug: "jonas", outputFile: "Jonas.json", chapters: 4 },
  { sourceSlug: "micheas", outputFile: "Micheas.json", chapters: 7 },
  { sourceSlug: "nahum", outputFile: "Nahum.json", chapters: 3 },
  { sourceSlug: "habacuc", outputFile: "Habacuc.json", chapters: 3 },
  { sourceSlug: "sophonias", outputFile: "Sophonias.json", chapters: 3 },
  { sourceSlug: "aggeus", outputFile: "Aggeus.json", chapters: 2 },
  { sourceSlug: "zacharias", outputFile: "Zacharias.json", chapters: 14 },
  { sourceSlug: "malachie", outputFile: "Malachie.json", chapters: 4 },
  { sourceSlug: "matthew", outputFile: "Matthew.json", chapters: 28 },
  { sourceSlug: "mark", outputFile: "Mark.json", chapters: 16 },
  { sourceSlug: "luke", outputFile: "Luke.json", chapters: 24 },
  { sourceSlug: "john", outputFile: "John.json", chapters: 21 },
  { sourceSlug: "acts", outputFile: "Acts.json", chapters: 28 },
  { sourceSlug: "romans", outputFile: "Romans.json", chapters: 16 },
  {
    sourceSlug: "1-corinthians",
    outputFile: "1 Corinthians.json",
    chapters: 16,
  },
  {
    sourceSlug: "2-corinthians",
    outputFile: "2 Corinthians.json",
    chapters: 13,
  },
  { sourceSlug: "galatians", outputFile: "Galatians.json", chapters: 6 },
  { sourceSlug: "ephesians", outputFile: "Ephesians.json", chapters: 6 },
  {
    sourceSlug: "philippians",
    outputFile: "Philippians.json",
    chapters: 4,
  },
  { sourceSlug: "colossians", outputFile: "Colossians.json", chapters: 4 },
  {
    sourceSlug: "1-thessalonians",
    outputFile: "1 Thessalonians.json",
    chapters: 5,
  },
  {
    sourceSlug: "2-thessalonians",
    outputFile: "2 Thessalonians.json",
    chapters: 3,
  },
  { sourceSlug: "1-timothy", outputFile: "1 Timothy.json", chapters: 6 },
  { sourceSlug: "2-timothy", outputFile: "2 Timothy.json", chapters: 4 },
  { sourceSlug: "titus", outputFile: "Titus.json", chapters: 3 },
  { sourceSlug: "philemon", outputFile: "Philemon.json", chapters: 1 },
  { sourceSlug: "hebrews", outputFile: "Hebrews.json", chapters: 13 },
  { sourceSlug: "james", outputFile: "James.json", chapters: 5 },
  { sourceSlug: "1-peter", outputFile: "1 Peter.json", chapters: 5 },
  { sourceSlug: "2-peter", outputFile: "2 Peter.json", chapters: 3 },
  { sourceSlug: "1-john", outputFile: "1 John.json", chapters: 5 },
  { sourceSlug: "2-john", outputFile: "2 John.json", chapters: 1 },
  { sourceSlug: "3-john", outputFile: "3 John.json", chapters: 1 },
  { sourceSlug: "jude", outputFile: "Jude.json", chapters: 1 },
  { sourceSlug: "apocalypse", outputFile: "Apocalypse.json", chapters: 22 },
];

function buildSourceNote(sourceRevision: SourceRevision) {
  const revisionLabel = sourceRevision.verified
    ? `\`${sourceRevision.commit}\``
    : `\`${sourceRevision.commit}\` (unverified override)`;

  return `# Scripture data source

The Scripture JSON files in this directory are derived from the **Original
Douay-Rheims Bible (1582–1610)** dataset maintained at
[janvier-s/original-douay-rheims](https://github.com/janvier-s/original-douay-rheims).

- Source commit: ${revisionLabel}
- Source path: \`bible/raw/*.json\`
- License: CC0 1.0 Universal; see [LICENSE.txt](./LICENSE.txt)
- Imported scope: the 73-book Catholic canon
- Excluded source works: 3 Esdras, 4 Esdras, and both Prayer of Manasses files
- Canon normalization: the source's Tobias chapter-zero title artifact is omitted;
  canonical chapters 1–14 are retained

The import keeps only each verse number and its plain-prose text, converting the
source arrays into \`Record<chapter, Record<verse, text>>\` JSON for the local
reader. Introductions, summaries, annotations, notes, and cross-references remain
available in the upstream repository but are not copied into this compact reader
format.
`;
}

async function importScripture() {
  const sourceRoot = path.resolve(
    process.argv[2] ?? process.env.SCRIPTURE_SOURCE_DIR ?? defaultSourceRoot,
  );
  const rawDirectory = path.join(sourceRoot, "bible", "raw");
  const outputDirectory = path.join(
    process.cwd(),
    "public",
    "data",
    "douay-rheims",
  );

  assertUniqueCanon();
  const sourceRevision = await verifySourceRevision(sourceRoot);

  const convertedBooks = new Map<string, ReaderBook>();
  let verseCount = 0;

  for (const canonBook of catholicCanon) {
    const sourcePath = path.join(
      rawDirectory,
      `${canonBook.sourceSlug}.json`,
    );
    const sourceJson = await readFile(sourcePath, "utf8");
    const source: unknown = JSON.parse(sourceJson);
    const sourceBook = validateSourceBook(source, canonBook);
    const converted = convertBook(sourceBook);

    validateConvertedBook(converted, canonBook);
    verseCount += countVerses(converted);
    convertedBooks.set(canonBook.sourceSlug, converted);
  }

  validateKnownVerse(convertedBooks);
  const licenseContents = await readFile(path.join(sourceRoot, "LICENSE"));

  await installValidatedCorpus(
    outputDirectory,
    convertedBooks,
    licenseContents,
    buildSourceNote(sourceRevision),
  );

  const revisionSuffix = sourceRevision.verified ? "" : " (override)";
  console.log(
    `Imported ${catholicCanon.length} books and ${verseCount.toLocaleString(
      "en-US",
    )} verses from janvier-s/original-douay-rheims@${sourceRevision.commit}${revisionSuffix}.`,
  );
}

async function verifySourceRevision(
  sourceRoot: string,
): Promise<SourceRevision> {
  const safeDirectory = sourceRoot.replaceAll("\\", "/");
  let commit: string;
  let worktreeStatus: string;

  try {
    const revisionResult = await execFileAsync(
      "git",
      [
        "-c",
        `safe.directory=${safeDirectory}`,
        "-C",
        sourceRoot,
        "rev-parse",
        "HEAD",
      ],
      { encoding: "utf8" },
    );
    commit = String(revisionResult.stdout).trim();

    const statusResult = await execFileAsync(
      "git",
      [
        "-c",
        `safe.directory=${safeDirectory}`,
        "-C",
        sourceRoot,
        "status",
        "--short",
        "--untracked-files=no",
        "--",
        "bible/raw",
        "LICENSE",
      ],
      { encoding: "utf8" },
    );
    worktreeStatus = String(statusResult.stdout).trim();
  } catch (error) {
    const message =
      `Unable to verify the Scripture source Git revision at ${sourceRoot}. ` +
      "Use a Git checkout at the pinned commit";

    if (!allowUnpinnedSource) {
      throw new Error(
        `${message}, or set SCRIPTURE_ALLOW_UNPINNED_SOURCE=1 to import this source deliberately.`,
      );
    }

    console.warn(
      `${message}. Continuing because SCRIPTURE_ALLOW_UNPINNED_SOURCE=1 is set.`,
      error,
    );
    return { commit: "unverified-source", verified: false };
  }

  const problems: string[] = [];

  if (commit !== sourceCommit) {
    problems.push(`found commit ${commit}; expected ${sourceCommit}`);
  }

  if (worktreeStatus) {
    problems.push("tracked Scripture source files have local modifications");
  }

  if (problems.length === 0) {
    return { commit, verified: true };
  }

  const message = `Scripture source verification failed: ${problems.join(
    "; ",
  )}.`;

  if (!allowUnpinnedSource) {
    throw new Error(
      `${message} Check out the pinned clean source, or set SCRIPTURE_ALLOW_UNPINNED_SOURCE=1 to override deliberately.`,
    );
  }

  console.warn(
    `${message} Continuing because SCRIPTURE_ALLOW_UNPINNED_SOURCE=1 is set.`,
  );
  return { commit, verified: false };
}

async function installValidatedCorpus(
  outputDirectory: string,
  convertedBooks: ReadonlyMap<string, ReaderBook>,
  licenseContents: Buffer,
  sourceNote: string,
) {
  const transactionId = `${process.pid}-${Date.now()}`;
  const stagingDirectory = `${outputDirectory}.staging-${transactionId}`;
  const backupDirectory = `${outputDirectory}.backup-${transactionId}`;

  await mkdir(path.dirname(outputDirectory), { recursive: true });
  await mkdir(stagingDirectory, { recursive: false });

  try {
    for (const canonBook of catholicCanon) {
      const converted = convertedBooks.get(canonBook.sourceSlug);

      if (!converted) {
        throw new Error(
          `${canonBook.sourceSlug}: validated book is missing from the staged corpus.`,
        );
      }

      await writeFile(
        path.join(stagingDirectory, canonBook.outputFile),
        `${JSON.stringify(converted, null, 2)}\n`,
        "utf8",
      );
    }

    await writeFile(
      path.join(stagingDirectory, "LICENSE.txt"),
      licenseContents,
    );
    await writeFile(
      path.join(stagingDirectory, "SOURCE.md"),
      sourceNote,
      "utf8",
    );

    await swapCorpusDirectories(
      outputDirectory,
      stagingDirectory,
      backupDirectory,
    );
  } catch (error) {
    await rm(stagingDirectory, { force: true, recursive: true });
    throw error;
  }
}

async function swapCorpusDirectories(
  outputDirectory: string,
  stagingDirectory: string,
  backupDirectory: string,
) {
  let existingCorpusMoved = false;

  try {
    await rename(outputDirectory, backupDirectory);
    existingCorpusMoved = true;
  } catch (error) {
    if (!isFileSystemError(error, "ENOENT")) {
      throw error;
    }
  }

  try {
    await rename(stagingDirectory, outputDirectory);
  } catch (replacementError) {
    if (existingCorpusMoved) {
      try {
        await rename(backupDirectory, outputDirectory);
      } catch (rollbackError) {
        throw new AggregateError(
          [replacementError, rollbackError],
          `Scripture corpus replacement and rollback both failed. The previous corpus remains at ${backupDirectory}.`,
        );
      }
    }

    throw replacementError;
  }

  if (existingCorpusMoved) {
    await rm(backupDirectory, { force: true, recursive: true });
  }
}

function isFileSystemError(error: unknown, code: string) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === code
  );
}

function validateSourceBook(value: unknown, expected: CanonBook): SourceBook {
  if (!isRecord(value)) {
    throw new Error(`${expected.sourceSlug}: source root is not an object.`);
  }

  if (value.book !== expected.sourceSlug || !Array.isArray(value.chapters)) {
    throw new Error(`${expected.sourceSlug}: source metadata is invalid.`);
  }

  const sourceChapters = getCanonicalSourceChapters(value.chapters, expected);

  if (sourceChapters.length !== expected.chapters) {
    throw new Error(
      `${expected.sourceSlug}: expected ${expected.chapters} chapters, found ${sourceChapters.length}.`,
    );
  }

  const chapters: SourceChapter[] = sourceChapters.map(
    (chapterValue, chapterIndex) => {
      if (!isRecord(chapterValue) || !Array.isArray(chapterValue.verses)) {
        throw new Error(
          `${expected.sourceSlug} ${chapterIndex + 1}: chapter is invalid.`,
        );
      }

      const chapter = chapterValue.chapter;

      if (chapter !== chapterIndex + 1) {
        throw new Error(
          `${expected.sourceSlug}: expected chapter ${chapterIndex + 1}, found ${String(
            chapter,
          )}.`,
        );
      }

      if (chapterValue.verses.length === 0) {
        throw new Error(`${expected.sourceSlug} ${chapter}: chapter is empty.`);
      }

      const verses: SourceVerse[] = chapterValue.verses.map(
        (verseValue, verseIndex) => {
          if (
            !isRecord(verseValue) ||
            verseValue.verse !== verseIndex + 1 ||
            typeof verseValue.text !== "string" ||
            verseValue.text.trim().length === 0
          ) {
            throw new Error(
              `${expected.sourceSlug} ${chapter}:${verseIndex + 1}: verse is invalid.`,
            );
          }

          return {
            verse: verseValue.verse,
            text: verseValue.text.trim(),
          };
        },
      );

      return { chapter, verses };
    },
  );

  return { book: value.book, chapters };
}

function getCanonicalSourceChapters(
  chapters: unknown[],
  expected: CanonBook,
) {
  if (expected.sourceSlug !== "tobias") {
    return chapters;
  }

  const sourcePreface = chapters[0];

  if (!isRecord(sourcePreface) || sourcePreface.chapter !== 0) {
    throw new Error("tobias: expected the source's chapter-zero title artifact.");
  }

  return chapters.slice(1);
}

function convertBook(sourceBook: SourceBook): ReaderBook {
  return Object.fromEntries(
    sourceBook.chapters.map((chapter) => [
      String(chapter.chapter),
      Object.fromEntries(
        chapter.verses.map((verse) => [String(verse.verse), verse.text]),
      ),
    ]),
  );
}

function validateConvertedBook(book: ReaderBook, expected: CanonBook) {
  const chapters = Object.keys(book);

  if (chapters.length !== expected.chapters) {
    throw new Error(`${expected.outputFile}: converted chapter count changed.`);
  }

  for (let chapter = 1; chapter <= expected.chapters; chapter += 1) {
    const verses = book[String(chapter)];

    if (!verses || !Object.hasOwn(verses, "1")) {
      throw new Error(
        `${expected.outputFile}: chapter ${chapter} is missing verse 1.`,
      );
    }

    for (const [verse, text] of Object.entries(verses)) {
      if (!/^\d+$/.test(verse) || text.trim().length === 0) {
        throw new Error(
          `${expected.outputFile}: chapter ${chapter}, verse ${verse} is invalid.`,
        );
      }
    }
  }
}

function validateKnownVerse(convertedBooks: Map<string, ReaderBook>) {
  const john316 = convertedBooks.get("john")?.["3"]?.["16"];
  const expectedJohn316 =
    "For so God loved the world, that he gave his only-begotten Son; that every one that believeth in him, perish not, but may have life everlasting.";

  if (john316 !== expectedJohn316) {
    throw new Error("John 3:16 does not match the pinned source text.");
  }
}

function assertUniqueCanon() {
  if (catholicCanon.length !== 73) {
    throw new Error(`Expected 73 canonical books, found ${catholicCanon.length}.`);
  }

  const sourceSlugs = new Set(catholicCanon.map((book) => book.sourceSlug));
  const outputFiles = new Set(catholicCanon.map((book) => book.outputFile));

  if (
    sourceSlugs.size !== catholicCanon.length ||
    outputFiles.size !== catholicCanon.length
  ) {
    throw new Error("Canonical Scripture mappings must be unique.");
  }
}

function countVerses(book: ReaderBook) {
  return Object.values(book).reduce(
    (total, chapter) => total + Object.keys(chapter).length,
    0,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

importScripture().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
