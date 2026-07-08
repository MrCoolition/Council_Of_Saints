export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getLocalIsoDate(
  timeZone = "America/New_York",
  date = new Date(),
) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function getMonthBounds(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));

  return {
    first: toIsoDate(first),
    last: toIsoDate(last),
    daysInMonth: last.getUTCDate(),
  };
}
