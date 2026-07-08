export const FORMATION_MOTTO = "Each day I shall draw closer to God.";

export const PRAYER_ITEM_TYPES = [
  "office_readings",
  "morning_prayer",
  "daytime_prayer",
  "evening_prayer",
  "night_prayer",
  "mass",
  "rosary",
  "mental_prayer",
  "spiritual_reading",
  "study",
  "service",
  "sacrifice",
] as const;

export const HABIT_STATUSES = [
  "done",
  "partial",
  "missed",
  "impeded",
  "deferred",
] as const;

export const COUNCIL_SESSION_TYPES = [
  "morning",
  "midday",
  "night",
  "confession_prep",
  "study",
  "vocation_discernment",
] as const;

export type PrayerItemType = (typeof PRAYER_ITEM_TYPES)[number];
export type HabitStatus = (typeof HABIT_STATUSES)[number];
export type CouncilSessionType = (typeof COUNCIL_SESSION_TYPES)[number];

export type UserSignal =
  | "missed_prayer"
  | "confused_vocation"
  | "needs_study"
  | "preparing_confession"
  | "discouraged"
  | "needs_chastity"
  | "needs_surrender";

export function isPrayerItemType(value: unknown): value is PrayerItemType {
  return (
    typeof value === "string" &&
    PRAYER_ITEM_TYPES.includes(value as PrayerItemType)
  );
}

export function isHabitStatus(value: unknown): value is HabitStatus {
  return (
    typeof value === "string" && HABIT_STATUSES.includes(value as HabitStatus)
  );
}

export function isCouncilSessionType(
  value: unknown,
): value is CouncilSessionType {
  return (
    typeof value === "string" &&
    COUNCIL_SESSION_TYPES.includes(value as CouncilSessionType)
  );
}

export function isUserSignal(value: unknown): value is UserSignal {
  return (
    value === "missed_prayer" ||
    value === "confused_vocation" ||
    value === "needs_study" ||
    value === "preparing_confession" ||
    value === "discouraged" ||
    value === "needs_chastity" ||
    value === "needs_surrender"
  );
}

export function formatPrayerItem(value: PrayerItemType) {
  switch (value) {
    case "morning_prayer":
      return "Morning Prayer";
    case "night_prayer":
      return "Night Prayer";
    case "office_readings":
      return "Office of Readings";
    case "daytime_prayer":
      return "Daytime Prayer";
    case "evening_prayer":
      return "Evening Prayer";
    case "mass":
      return "Mass";
    case "rosary":
      return "Rosary";
    case "mental_prayer":
      return "Mental Prayer";
    case "spiritual_reading":
      return "Spiritual Reading";
    case "study":
      return "Study";
    case "service":
      return "Service";
    case "sacrifice":
      return "Sacrifice";
  }
}
