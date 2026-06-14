const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UK_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function getFormatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayIso(): string {
  return getFormatDate(new Date());
}

export function parseIsoDateParts(dateString: string): { year: number; month: number; day: number } | null {
  if (!ISO_DATE_PATTERN.test(dateString)) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function isValidIsoDate(dateString: string): boolean {
  return parseIsoDateParts(dateString) !== null;
}

export function parseUkDobToIso(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(UK_DATE_PATTERN);
  if (!match) return null;

  const [, dayValue, monthValue, yearValue] = match;
  const day = Number(dayValue);
  const month = Number(monthValue);
  const year = Number(yearValue);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  const iso = getFormatDate(date);
  if (isFutureDate(iso, getTodayIso())) return null;
  return iso;
}

export function formatIsoToUkDate(dateString: string): string {
  const parts = parseIsoDateParts(dateString);
  if (!parts) return dateString;
  return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}/${parts.year}`;
}

export function getCurrentWeekDates(): { start: string; end: string; days: string[] } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    days.push(getFormatDate(date));
  }

  return {
    start: days[0],
    end: days[6],
    days,
  };
}

export function getDayName(dateString: string): string {
  const parts = parseIsoDateParts(dateString);
  if (!parts) return "";
  const date = new Date(parts.year, parts.month - 1, parts.day);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
}

export function formatUKDate(dateString: string): string {
  const parts = parseIsoDateParts(dateString);
  if (!parts) return dateString;
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${parts.day} ${months[parts.month - 1]}`;
}

export function isFutureDate(dateString: string, todayString: string): boolean {
  if (!isValidIsoDate(dateString) || !isValidIsoDate(todayString)) return false;
  return dateString > todayString;
}

export function isValidPrayerTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function formatPrayerTime(value: string | null | undefined): string {
  if (!value || !isValidPrayerTime(value)) return "";
  const [hourValue, minute] = value.split(":");
  const hour = Number(hourValue);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${String(displayHour).padStart(2, "0")}:${minute} ${period}`;
}
