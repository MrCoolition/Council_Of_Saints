export type OfficeWeekday =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export type PsalmSchedule = {
  displayCitation: string;
  douayChapter: number;
  douayRanges: [number, number][];
  containsHalfVerse: boolean;
};

type CompactPsalter = Record<number, Record<OfficeWeekday, string[]>>;

const OFFICE_OF_READINGS_ORDINARY: CompactPsalter = {
  1: {
    sunday: ["1", "2", "3"],
    monday: ["6", "9:2-11", "9:12-21"],
    tuesday: ["10:1-11", "10:12-18", "12"],
    wednesday: ["18:2-7", "18:8-20", "18:21-30"],
    thursday: ["18:31-35", "18:36-46", "18:47-51"],
    friday: ["35:1-2,3c,9-12", "35:13-16", "35:17-19,22-23,27-28"],
    saturday: ["131", "132:1-10", "132:11-18"],
  },
  2: {
    sunday: ["104:1-12", "104:13-23", "104:24-35"],
    monday: ["31:2-9", "31:10-17", "31:20-25"],
    tuesday: ["37:1-11", "37:12-29", "37:30-40"],
    wednesday: ["39:2-7", "39:8-14", "52"],
    thursday: ["44:2-9", "44:10-17", "44:18-27"],
    friday: ["38:2-5", "38:6-13", "38:14-23"],
    saturday: ["136:1-9", "136:10-15", "136:16-26"],
  },
  3: {
    sunday: ["145:1-9", "145:10-13a", "145:13b-21"],
    monday: ["50:1-6", "50:7-15", "50:16-23"],
    tuesday: ["68:2-11", "68:12-24", "68:25-36"],
    wednesday: ["89:2-19", "89:20-30", "89:31-38"],
    thursday: ["89:39-46", "89:47-53", "90"],
    friday: ["69:2-13", "69:14-22", "69:30-37"],
    saturday: ["107:1-16", "107:17-32", "107:33-43"],
  },
  4: {
    sunday: ["24", "66:2-12", "66:13-20"],
    monday: ["73:1-12", "73:13-20", "73:21-28"],
    tuesday: ["102:2-12", "102:13-23", "102:24-29"],
    wednesday: ["103:1-7", "103:8-16", "103:17-22"],
    thursday: ["44:2-9", "44:10-17", "44:18-27"],
    friday: ["55:2-10a", "55:10b-15", "55:17-24"],
    saturday: ["50:1-6", "50:7-15", "50:16-23"],
  },
};

const OFFICE_OF_READINGS_SEASONAL_OVERRIDES: Partial<
  Record<number, Partial<Record<OfficeWeekday, string[]>>>
> = {
  1: {
    saturday: ["105:1-15", "105:16-22", "105:23-45"],
  },
  2: {
    saturday: ["106:1-18", "106:19-33", "106:34-48"],
  },
  4: {
    friday: ["78:1-16", "78:17-31", "78:32-39"],
    saturday: ["78:40-51", "78:52-64", "78:65-72"],
  },
};

const DAYTIME: CompactPsalter = {
  1: {
    sunday: ["118:1-9", "118:10-18", "118:19-29"],
    monday: ["19:8-15", "7:2-10", "7:11-18"],
    tuesday: ["119:1-8", "13", "14"],
    wednesday: ["119:9-16", "17:1-9a", "17:9b-15"],
    thursday: ["119:17-24", "25:1-11", "25:12-22"],
    friday: ["119:25-32", "26", "28:1-3,6-9"],
    saturday: ["119:33-40", "34:2-11", "34:12-23"],
  },
  2: {
    sunday: ["23", "76:2-7", "76:8-13"],
    monday: ["119:41-48", "40:2-9", "40:10-14,17-18"],
    tuesday: ["119:49-56", "53", "54:3-6,8-9"],
    wednesday: ["119:57-64", "55:2-12", "55:13-15,17-24"],
    thursday: ["119:65-72", "56:2-7b,9-14", "57"],
    friday: ["119:73-80", "59:2-5,10-11,17-18", "60"],
    saturday: ["119:81-88", "61", "64"],
  },
  3: {
    sunday: ["118:1-9", "118:10-18", "118:19-29"],
    monday: ["119:89-96", "71:1-13", "71:14-24"],
    tuesday: ["119:97-104", "74:1-12", "74:13-23"],
    wednesday: ["119:105-112", "70", "75"],
    thursday: ["119:113-120", "79:1-5,8-11,13", "80"],
    friday: ["22:2-12", "22:13-23", "22:24-32"],
    saturday: ["119:121-128", "34:2-11", "34:12-23"],
  },
  4: {
    sunday: ["23", "76:2-7", "76:8-13"],
    monday: ["119:129-136", "82", "120"],
    tuesday: ["119:137-144", "88:2-8", "88:9-19"],
    wednesday: ["119:145-152", "94:1-11", "94:12-23"],
    thursday: ["119:153-160", "128", "129"],
    friday: ["119:161-168", "133", "140:2-9,13-14"],
    saturday: ["119:169-176", "45:2-10", "45:11-18"],
  },
};

const COMPLEMENTARY = {
  midmorning_prayer: ["120", "121", "122"],
  midday_prayer: ["123", "124", "125"],
  midafternoon_prayer: ["126", "127", "128"],
} as const;

export function getOfficeOfReadingsPsalmody(
  psalterWeek: number,
  weekday: OfficeWeekday,
  season: string,
): PsalmSchedule[] {
  const week = normalizeWeek(psalterWeek);
  const isOrdinaryTime = season.trim().toLowerCase() === "ordinary time";
  const compact =
    (!isOrdinaryTime &&
      OFFICE_OF_READINGS_SEASONAL_OVERRIDES[week]?.[weekday]) ||
    OFFICE_OF_READINGS_ORDINARY[week][weekday];

  return compact.map(parsePsalmSchedule);
}

export function getDaytimePsalmody(
  psalterWeek: number,
  weekday: OfficeWeekday,
): PsalmSchedule[] {
  return DAYTIME[normalizeWeek(psalterWeek)][weekday].map(parsePsalmSchedule);
}

export function getComplementaryPsalmody(
  hourType: keyof typeof COMPLEMENTARY,
): PsalmSchedule[] {
  return COMPLEMENTARY[hourType].map(parsePsalmSchedule);
}

export function parsePsalmSchedule(value: string): PsalmSchedule {
  const [chapterText, rangeText] = value.split(":");
  const modernChapter = Number(chapterText);
  const offset = modernChapter === 10 ? 21 : 0;
  const douayRanges = rangeText
    ? rangeText.split(",").map((part): [number, number] => {
        const numbers = part.match(/\d+/g)?.map(Number) ?? [];
        const start = toDouayVerse(
          modernChapter,
          (numbers[0] ?? 1) + offset,
        );
        const end = toDouayVerse(
          modernChapter,
          (numbers[1] ?? numbers[0] ?? 1) + offset,
        );
        return [start, end];
      })
    : [];

  return {
    displayCitation: `Psalm ${value.replaceAll("-", "–")}`,
    douayChapter: toDouayPsalm(modernChapter),
    douayRanges,
    containsHalfVerse: /[a-z]/i.test(rangeText ?? ""),
  };
}

function toDouayPsalm(modernChapter: number) {
  if (modernChapter <= 8) {
    return modernChapter;
  }

  if (modernChapter === 9 || modernChapter === 10) {
    return 9;
  }

  if (modernChapter <= 113) {
    return modernChapter - 1;
  }

  if (modernChapter === 114 || modernChapter === 115) {
    return 113;
  }

  if (modernChapter === 116) {
    return 114;
  }

  if (modernChapter <= 146) {
    return modernChapter - 1;
  }

  return modernChapter;
}

function toDouayVerse(modernChapter: number, modernVerse: number) {
  // Modern Psalm 44 ends at verse 27; the Douay Psalm 43 corpus numbers the
  // same closing prayer as verse 26.
  if (modernChapter === 44 && modernVerse === 27) {
    return 26;
  }

  if (modernChapter === 56 && modernVerse === 14) {
    return 13;
  }

  return modernVerse;
}

function normalizeWeek(value: number) {
  return value >= 1 && value <= 4 ? value : 1;
}
