export type MassLiturgicalColor =
  | "white"
  | "red"
  | "green"
  | "violet"
  | "rose"
  | "black"
  | "gold"
  | "silver";

export type MassCelebrationRank =
  | "triduum"
  | "sunday"
  | "solemnity"
  | "feast"
  | "memorial"
  | "optional-memorial"
  | "weekday";

export type MassGospelAcclamation =
  | "alleluia"
  | "verse-before-gospel";

export type MassParticipationRequirements = {
  gloria: boolean;
  creed: boolean;
  secondReading: boolean;
  sprinklingRite: boolean;
  sequence: "none" | "required" | "optional";
  gospelAcclamation: MassGospelAcclamation;
};

export type MassCelebrationProfile = {
  id: string;
  label: string;
  requirements: MassParticipationRequirements;
};

export type HolyMassRiteKind =
  | "ordinary-mass"
  | "palm-sunday"
  | "holy-thursday"
  | "good-friday"
  | "holy-saturday"
  | "easter-vigil";

export function getHolyMassRiteKind(
  observanceId: string,
  mode: SaturdayMassMode,
): HolyMassRiteKind {
  if (observanceId === "palm_sunday_of_the_passion_of_the_lord") {
    return "palm-sunday";
  }
  if (observanceId === "thursday_of_the_lords_supper") {
    return "holy-thursday";
  }
  if (observanceId === "friday_of_the_passion_of_the_lord") {
    return "good-friday";
  }
  if (observanceId === "holy_saturday") {
    return mode === "anticipated" ? "easter-vigil" : "holy-saturday";
  }
  return "ordinary-mass";
}

export const MEMORIAL_MASS_PROFILE = {
  id: "memorial-ordinary-time",
  label: "Memorial in Ordinary Time",
  requirements: {
    gloria: false,
    creed: false,
    secondReading: false,
    sprinklingRite: false,
    sequence: "none",
    gospelAcclamation: "alleluia",
  },
} as const satisfies MassCelebrationProfile;

export const SUNDAY_ORDINARY_TIME_MASS_PROFILE = {
  id: "sunday-ordinary-time",
  label: "Sunday in Ordinary Time",
  requirements: {
    gloria: true,
    creed: true,
    secondReading: true,
    sprinklingRite: true,
    sequence: "none",
    gospelAcclamation: "alleluia",
  },
} as const satisfies MassCelebrationProfile;

export const DEFAULT_ANTICIPATED_MASS_CUTOFF = "16:00";

export type SaturdayMassMode = "daytime" | "anticipated";

export type SaturdayMassOverride = "auto" | SaturdayMassMode;

export type DatedLiturgicalContext = {
  localDate: string;
};

export type SaturdayMassResolution<T extends DatedLiturgicalContext> = {
  mode: SaturdayMassMode;
  context: T;
  liturgicalDate: string;
  selectedBy:
    | "explicit-override"
    | "anticipated-cutoff"
    | "civil-day";
};

/**
 * Selects the civil Saturday's Mass or the anticipated Sunday Mass.
 *
 * Persistence and time-zone conversion intentionally belong to the caller.
 * The resolver accepts already-local civil values and a caller-supplied cutoff,
 * because universal law says "evening" rather than prescribing one wall-clock
 * hour for every church.
 */
export function resolveSaturdayMassContext<
  Daytime extends DatedLiturgicalContext,
  Anticipated extends DatedLiturgicalContext,
>({
  civilDate,
  civilTime,
  daytime,
  anticipated,
  anticipatedCutoff = DEFAULT_ANTICIPATED_MASS_CUTOFF,
  override = "auto",
}: {
  civilDate: string;
  civilTime: string;
  daytime: Daytime;
  anticipated: Anticipated;
  anticipatedCutoff?: string;
  override?: SaturdayMassOverride;
}): SaturdayMassResolution<Daytime | Anticipated> {
  const parsedDate = parseIsoCalendarDate(civilDate);

  if (getUtcWeekday(parsedDate) !== 6) {
    throw new RangeError(
      `Saturday Mass resolution requires a Saturday: ${civilDate}`,
    );
  }

  if (daytime.localDate !== civilDate) {
    throw new RangeError(
      `Daytime context must match the civil date ${civilDate}`,
    );
  }

  const nextDate = addOneDay(parsedDate);
  if (anticipated.localDate !== nextDate) {
    throw new RangeError(
      `Anticipated context must use the following date ${nextDate}`,
    );
  }

  const civilMinute = parseCivilTime(civilTime, "civil time");
  const cutoffMinute = parseCivilTime(
    anticipatedCutoff,
    "anticipated cutoff",
  );
  const mode =
    override === "auto"
      ? civilMinute >= cutoffMinute
        ? "anticipated"
        : "daytime"
      : override;
  const context = mode === "anticipated" ? anticipated : daytime;

  return {
    mode,
    context,
    liturgicalDate: context.localDate,
    selectedBy:
      override !== "auto"
        ? "explicit-override"
        : mode === "anticipated"
          ? "anticipated-cutoff"
          : "civil-day",
  };
}

type ParsedIsoCalendarDate = {
  year: number;
  month: number;
  day: number;
};

function parseIsoCalendarDate(localDate: string): ParsedIsoCalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  if (!match) {
    throw new RangeError(`Invalid ISO calendar date: ${localDate}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid ISO calendar date: ${localDate}`);
  }

  return { year, month, day };
}

function getUtcWeekday({ year, month, day }: ParsedIsoCalendarDate) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function addOneDay({ year, month, day }: ParsedIsoCalendarDate) {
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  return [
    date.getUTCFullYear(),
    twoDigits(date.getUTCMonth() + 1),
    twoDigits(date.getUTCDate()),
  ].join("-");
}

function parseCivilTime(value: string, label: string) {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) {
    throw new RangeError(
      `Invalid ${label}: ${value}. Use 24-hour HH:mm or HH:mm:ss.`,
    );
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = match[3] ? Number(match[3]) : 0;

  if (hour > 23 || minute > 59 || second > 59) {
    throw new RangeError(
      `Invalid ${label}: ${value}. Use 24-hour HH:mm or HH:mm:ss.`,
    );
  }

  return hour * 60 + minute + second / 60;
}

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}
