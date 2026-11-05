const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DateBound =
  | { kind: "dateOnly"; dateOnly: string }
  | { kind: "instant"; instant: Date };

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

/**
 * Tanggal saja (`YYYY-MM-DD`) dianggap sebagai satu hari kalender penuh di zona waktu
 * aplikasi. Timestamp ISO lengkap tetap dianggap sebagai instant persis.
 */
export function parseDateBound(raw: string | undefined): DateBound | undefined {
  if (!raw) return undefined;
  if (DATE_ONLY.test(raw)) {
    return isValidDateOnly(raw) ? { kind: "dateOnly", dateOnly: raw } : undefined;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : { kind: "instant", instant: parsed };
}

export function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month! - 1 &&
    date.getUTCDate() === day
  );
}

export function startOfDayInZone(dateOnly: string, timeZone: string): Date {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const utcMidnight = Date.UTC(year!, month! - 1, day!);

  // Iterasi dua kali agar aman terhadap perubahan offset (DST). Asia/Jakarta tidak memakai DST.
  let guess = utcMidnight;
  for (let i = 0; i < 2; i += 1) {
    const offset = timeZoneOffsetMinutes(new Date(guess), timeZone);
    guess = utcMidnight - offset * 60_000;
  }
  return new Date(guess);
}

export function startOfNextDayInZone(dateOnly: string, timeZone: string): Date {
  return new Date(startOfDayInZone(dateOnly, timeZone).getTime() + DAY_MS);
}

export function formatDateInZone(date: Date, timeZone: string): string {
  const parts = timeZoneParts(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function addDaysToDateOnly(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const shifted = new Date(Date.UTC(year!, month! - 1, day! + days));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function timeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = timeZoneParts(date, timeZone);
  const asUTC = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return (asUTC - date.getTime()) / 60_000;
}

function timeZoneParts(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((part) => part.type === type)?.value;
    return Number(value);
  };

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}
