import "server-only";

import type { TodayPayload } from "@/lib/demo-data";
import {
  getHolyMassRiteKind,
  type HolyMassRiteKind,
  type MassCelebrationProfile,
  type MassParticipationRequirements,
} from "@/lib/holy-mass";
import { getLiturgicalDay } from "@/lib/liturgical-calendar";
import {
  getDouayDisplayCitation,
  getUsccbDailyReadingsUrl,
  getUsMassReadingsForDate,
  type MassReadingOption,
  type MassResponsorialPsalm,
  type MassScriptureSelection,
} from "@/lib/mass-readings";
import {
  getCompatibleMassProperTitleAliases,
  type MassCelebrationPropers,
  type MassCelebrationPropersByReadingSetId,
} from "@/lib/mass-propers";
import type { ScripturePassage } from "@/lib/scripture";
import {
  loadScripturePassage,
  type LoadedScriptureSegment,
} from "@/server/scripture-passages";
import { getMassCelebrationPropers } from "@/server/mass-propers";
import { getTodayPayload } from "@/server/today";
import {
  getUsccbLectionaryReadingSetsForDate,
  type UsccbLectionaryItem,
  type UsccbLectionaryReadingSet,
} from "@/server/usccb-lectionary";

export type HolyMassLoadedSelection = {
  title: string;
  lectionaryCitation: string;
  displayCitation: string;
  passages: ScripturePassage[];
  segments: LoadedScriptureSegment[];
};

export type HolyMassLoadedPsalm = HolyMassLoadedSelection & {
  refrains: string[];
};

export type HolyMassLoadedOption = {
  id: string;
  label: string;
  description: string;
  officialUrl: string | null;
  firstReading: HolyMassLoadedSelection;
  responsorialPsalm: HolyMassLoadedPsalm;
  secondReading: HolyMassLoadedSelection | null;
  gospelAcclamation: HolyMassLoadedSelection;
  gospelChoices: HolyMassLoadedSelection[];
};

export type HolyMassReadingSet = UsccbLectionaryReadingSet & {
  douayOptionId: string | null;
};

export type HolyMassCelebrationView = {
  id: string;
  mode: "daytime" | "anticipated";
  localDate: string;
  dateLabel: string;
  title: string;
  rank: string;
  season: string;
  liturgicalColor: string;
  cycleLabel: string | null;
  lectionaryNumbers: number[];
  profile: MassCelebrationProfile;
  officialReadingsUrl: string;
  massLectionary: UsccbLectionaryItem | null;
  readingSets: HolyMassReadingSet[];
  options: HolyMassLoadedOption[];
  propers: MassCelebrationPropers | null;
  propersByReadingSetId: MassCelebrationPropersByReadingSetId;
  riteKind: HolyMassRiteKind;
};

export type HolyMassPageData = {
  civilDate: string;
  civilTime: string;
  timezone: string;
  daytime: HolyMassCelebrationView;
  anticipated: HolyMassCelebrationView | null;
};

type LiturgicalDaySummary = {
  observanceId: string;
  localDate: string;
  title: string;
  rank: string;
  season: string;
  color: string;
  sundayCycle: string | null;
};

export async function getHolyMassPageData(
  todayInput?: TodayPayload,
): Promise<HolyMassPageData> {
  const today = todayInput ?? (await getTodayPayload());
  const civilTime = getLocalTime(today.profile.timezone);
  const daytime = await loadCelebration(
    summarizeToday(today),
    "daytime",
  );

  if (!isSaturday(today.localDate)) {
    return {
      civilDate: today.localDate,
      civilTime,
      timezone: today.profile.timezone,
      daytime,
      anticipated: null,
    };
  }

  const anticipatedDate = addCalendarDays(today.localDate, 1);
  const anticipatedDay = await getLiturgicalDay(
    anticipatedDate,
    today.profile.country,
  );
  const anticipated = await loadCelebration(
    {
      observanceId: anticipatedDay.observanceId,
      localDate: anticipatedDate,
      title: anticipatedDay.title,
      rank: anticipatedDay.rank,
      season: anticipatedDay.season,
      color: anticipatedDay.color,
      sundayCycle: anticipatedDay.cycles.sunday.label,
    },
    "anticipated",
  );

  const resolvedAnticipated: HolyMassCelebrationView =
    today.liturgicalDay.observanceId === "holy_saturday"
      ? {
          ...anticipated,
          id: `${today.localDate}:anticipated:easter-vigil`,
          dateLabel: formatMassDate(today.localDate),
          title: "Easter Vigil in the Holy Night",
          rank: "Paschal Triduum",
          liturgicalColor: "White",
          officialReadingsUrl: getUsccbDailyReadingsUrl(today.localDate),
          massLectionary: null,
          readingSets: [],
          options: [],
          propers: null,
          propersByReadingSetId: {},
          profile: {
            id: "easter-vigil",
            label: "Easter Vigil",
            requirements: {
              gloria: true,
              creed: false,
              secondReading: true,
              sprinklingRite: false,
              sequence: "none",
              gospelAcclamation: "alleluia",
            },
          },
          riteKind: "easter-vigil" as const,
        }
      : anticipated;

  return {
    civilDate: today.localDate,
    civilTime,
    timezone: today.profile.timezone,
    daytime,
    anticipated: resolvedAnticipated,
  };
}

async function loadCelebration(
  day: LiturgicalDaySummary,
  mode: HolyMassCelebrationView["mode"],
): Promise<HolyMassCelebrationView> {
  const riteKind = getHolyMassRiteKind(day.observanceId, mode);
  const entry = getUsMassReadingsForDate(day.localDate);
  const officialReadingsUrl = getUsccbDailyReadingsUrl(day.localDate);
  const requirements = deriveRequirements(day, mode, riteKind);
  const calendarTitle =
    entry.status === "curated" ? entry.observance.title : day.title;
  const readingSetsPromise = getUsccbLectionaryReadingSetsForDate(
    day.localDate,
  );
  const optionsPromise = entry.status === "curated"
    ? Promise.all(entry.options.map(loadOption))
    : Promise.resolve([]);
  const calendarPropersPromise = getMassCelebrationPropers({
    localDate: day.localDate,
    massForm: mode,
    season: day.season,
    title: calendarTitle,
    titleAliases: getCompatibleMassProperTitleAliases(calendarTitle, [
      day.title,
    ]),
  });
  const loadedReadingSets = await readingSetsPromise;
  const massLectionaryReadingSet = loadedReadingSets.find(
    (readingSet) => readingSet.sourceKind === "daily",
  ) ?? null;
  const massLectionary = massLectionaryReadingSet?.item ?? null;
  const title = massLectionary?.title ?? calendarTitle;
  const propersByReadingSetIdPromise = resolveReadingSetPropers({
    calendarPropersPromise,
    calendarTitle,
    day,
    displayTitle: title,
    mode,
    readingSets: loadedReadingSets,
  });
  const [options, calendarPropers, propersByReadingSetId] = await Promise.all([
    optionsPromise,
    calendarPropersPromise,
    propersByReadingSetIdPromise,
  ]);
  const readingSets = loadedReadingSets.map((readingSet) => ({
    ...readingSet,
    douayOptionId: findMatchingDouayOption(readingSet, options)?.id ?? null,
  }));
  const profile: MassCelebrationProfile = entry.status === "curated"
    ? entry.observance.profile
    : {
        id: `${day.localDate}-mass`,
        label: day.rank,
        requirements,
      };
  const lectionaryNumbers = readingSets
    .map((readingSet) => readingSet.lectionaryNumber)
    .filter((number): number is number => number !== null);
  const propers = massLectionaryReadingSet
    ? propersByReadingSetId[massLectionaryReadingSet.id] ?? null
    : calendarPropers;

  return {
    id: `${day.localDate}:${mode}:${profile.id}`,
    mode,
    localDate: day.localDate,
    dateLabel: formatMassDate(day.localDate),
    title,
    rank: entry.status === "curated"
      ? displayRank(entry.observance.rank)
      : day.rank,
    season: day.season,
    liturgicalColor: entry.status === "curated"
      ? displayColor(entry.observance.liturgicalColor)
      : day.color,
    cycleLabel: day.sundayCycle,
    lectionaryNumbers: lectionaryNumbers.length > 0
      ? [...new Set(lectionaryNumbers)]
      : entry.status === "curated"
        ? [...entry.observance.lectionaryNumbers]
        : [],
    profile,
    officialReadingsUrl,
    massLectionary,
    readingSets,
    options,
    propers,
    propersByReadingSetId,
    riteKind,
  };
}

async function resolveReadingSetPropers({
  calendarPropersPromise,
  calendarTitle,
  day,
  displayTitle,
  mode,
  readingSets,
}: {
  calendarPropersPromise: Promise<MassCelebrationPropers | null>;
  calendarTitle: string;
  day: LiturgicalDaySummary;
  displayTitle: string;
  mode: HolyMassCelebrationView["mode"];
  readingSets: readonly UsccbLectionaryReadingSet[];
}): Promise<MassCelebrationPropersByReadingSetId> {
  const calendarKey = normalizeProperLookupTitle(calendarTitle);
  const groupedLookups = new Map<
    string,
    { aliases: Set<string>; readingSetIds: string[]; title: string }
  >();

  for (const readingSet of readingSets) {
    const key = normalizeProperLookupTitle(readingSet.item.title);
    const lookup = groupedLookups.get(key) ?? {
      aliases: new Set<string>(),
      readingSetIds: [],
      title: readingSet.item.title,
    };
    lookup.readingSetIds.push(readingSet.id);
    for (const alias of [calendarTitle, day.title, displayTitle]) {
      if (alias.trim() && normalizeProperLookupTitle(alias) !== key) {
        lookup.aliases.add(alias);
      }
    }
    groupedLookups.set(key, lookup);
  }

  const resolvedGroups = await Promise.all(
    [...groupedLookups.entries()].map(async ([key, lookup]) => ({
      propers: key === calendarKey
        ? await calendarPropersPromise
        : await getMassCelebrationPropers({
            localDate: day.localDate,
            massForm: mode,
            season: day.season,
            title: lookup.title,
            titleAliases: getCompatibleMassProperTitleAliases(
              lookup.title,
              [...lookup.aliases],
            ),
          }),
      readingSetIds: lookup.readingSetIds,
    })),
  );

  return Object.fromEntries(
    resolvedGroups.flatMap(({ propers, readingSetIds }) =>
      readingSetIds.map((readingSetId) => [readingSetId, propers] as const),
    ),
  );
}

function normalizeProperLookupTitle(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/gu, " ");
}

async function loadOption(
  option: MassReadingOption,
): Promise<HolyMassLoadedOption> {
  const [firstReading, responsorialPsalm, secondReading, gospelAcclamation, gospelChoices] =
    await Promise.all([
      loadSelection(option.firstReading),
      loadPsalm(option.responsorialPsalm),
      option.secondReading ? loadSelection(option.secondReading) : null,
      loadSelection(option.gospelAcclamation),
      Promise.all(option.gospelChoices.map(loadSelection)),
    ]);

  return {
    id: option.id,
    label: option.label,
    description: option.description,
    officialUrl: option.officialUrl ?? null,
    firstReading,
    responsorialPsalm,
    secondReading,
    gospelAcclamation,
    gospelChoices,
  };
}

async function loadSelection(
  selection: MassScriptureSelection,
): Promise<HolyMassLoadedSelection> {
  const passages = [...selection.douaySource.passages];
  const segments = await Promise.all(passages.map(loadScripturePassage));

  return {
    title: selection.title,
    lectionaryCitation: selection.displayCitation,
    displayCitation: getDouayDisplayCitation(selection),
    passages,
    segments,
  };
}

function findMatchingDouayOption(
  readingSet: UsccbLectionaryReadingSet,
  options: readonly HolyMassLoadedOption[],
) {
  const readingUrl = normalizeUrl(readingSet.officialUrl);
  const firstReadingCitation = normalizeCitation(
    readingSet.firstReadingCitation ?? "",
  );
  const gospelCitations = new Set(
    readingSet.gospelCitations.map(normalizeCitation),
  );

  return options.find((option) => {
    if (
      readingUrl &&
      option.officialUrl &&
      normalizeUrl(option.officialUrl) === readingUrl
    ) {
      return true;
    }

    return Boolean(
      firstReadingCitation &&
      normalizeCitation(option.firstReading.lectionaryCitation) ===
        firstReadingCitation &&
      option.gospelChoices.some((gospel) =>
        gospelCitations.has(normalizeCitation(gospel.lectionaryCitation)),
      ),
    );
  });
}

function normalizeCitation(value: string) {
  return value
    .toLowerCase()
    .replace(/[–—]/gu, "-")
    .replace(/[^a-z0-9]/gu, "");
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/u, "");
  } catch {
    return null;
  }
}

async function loadPsalm(
  psalm: MassResponsorialPsalm,
): Promise<HolyMassLoadedPsalm> {
  const selection = await loadSelection(psalm);
  return { ...selection, refrains: [...psalm.refrains] };
}

function summarizeToday(today: TodayPayload): LiturgicalDaySummary {
  return {
    observanceId: today.liturgicalDay.observanceId ?? "unknown",
    localDate: today.localDate,
    title: today.liturgicalDay.title,
    rank: today.liturgicalDay.rank,
    season: today.liturgicalDay.season,
    color: today.liturgicalDay.color,
    sundayCycle: today.liturgicalDay.sundayCycle ?? null,
  };
}

function deriveRequirements(
  day: LiturgicalDaySummary,
  mode: HolyMassCelebrationView["mode"],
  riteKind: HolyMassRiteKind,
): MassParticipationRequirements {
  const rank = day.rank.toLowerCase();
  const season = day.season.toLowerCase();
  const sunday = isSunday(day.localDate);
  const solemnity = rank.includes("solemnity");
  const feast = rank.includes("feast");
  const penitentialSeason = season.includes("advent") || season.includes("lent");
  const title = day.title.toLowerCase();
  const requiredSequence =
    title.includes("easter sunday") || title.includes("pentecost sunday");
  const optionalSequence =
    title.includes("body and blood of christ") ||
    title.includes("our lady of sorrows");

  if (riteKind === "holy-thursday") {
    return {
      gloria: true,
      creed: false,
      secondReading: true,
      sprinklingRite: false,
      sequence: "none",
      gospelAcclamation: "verse-before-gospel",
    };
  }

  if (riteKind === "palm-sunday") {
    return {
      gloria: false,
      creed: true,
      secondReading: true,
      sprinklingRite: false,
      sequence: "none",
      gospelAcclamation: "verse-before-gospel",
    };
  }

  if (riteKind === "good-friday" || riteKind === "holy-saturday") {
    return {
      gloria: false,
      creed: false,
      secondReading: false,
      sprinklingRite: false,
      sequence: "none",
      gospelAcclamation: "verse-before-gospel",
    };
  }

  return {
    gloria: (sunday && !penitentialSeason) || solemnity || feast,
    creed: sunday || solemnity,
    secondReading: sunday || solemnity,
    sprinklingRite: sunday,
    sequence: requiredSequence && mode !== "anticipated"
      ? "required"
      : optionalSequence
        ? "optional"
        : "none",
    gospelAcclamation: season.includes("lent")
      ? "verse-before-gospel"
      : "alleluia",
  };
}


function getLocalTime(timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

function formatMassDate(localDate: string) {
  const { year, month, day } = parseDate(localDate);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function addCalendarDays(localDate: string, days: number) {
  const { year, month, day } = parseDate(localDate);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function isSaturday(localDate: string) {
  const { year, month, day } = parseDate(localDate);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 6;
}

function isSunday(localDate: string) {
  const { year, month, day } = parseDate(localDate);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 0;
}

function parseDate(localDate: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  return { year, month, day };
}

function displayRank(value: string) {
  return value
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function displayColor(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
