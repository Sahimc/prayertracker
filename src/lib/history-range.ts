import { formatUKDate, getDateRange, getDayName, getIsoFromDateTime, getTodayIso, parseIsoDateParts } from "./dates";
import type { PrayerLogSummary, StudentSummary } from "./types";

export type HistoryRow = PrayerLogSummary;

export type HistoryMonthGroup = {
  key: string;
  label: string;
  rows: HistoryRow[];
};

function createEmptyHistoryRow(student: StudentSummary, date: string): HistoryRow {
  return {
    id: `missing-${student.id}-${date}`,
    organizationId: student.organizationId,
    studentId: student.id,
    date,
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
  };
}

export function getStudentHistoryStartDate(student: Pick<StudentSummary, "createdAt">): string {
  return getIsoFromDateTime(student.createdAt);
}

export function buildCompleteHistoryRows(student: StudentSummary, today = getTodayIso()): HistoryRow[] {
  const byDate = new Map(student.prayers.map((log) => [log.date, log]));
  return getDateRange(getStudentHistoryStartDate(student), today)
    .map((date) => byDate.get(date) ?? createEmptyHistoryRow(student, date))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function groupHistoryRowsByMonth(rows: HistoryRow[]): HistoryMonthGroup[] {
  const groups = new Map<string, HistoryMonthGroup>();

  for (const row of rows) {
    const parts = parseIsoDateParts(row.date);
    const key = parts ? `${parts.year}-${String(parts.month).padStart(2, "0")}` : row.date.slice(0, 7);
    const label = parts ? `${formatUKDate(`${key}-01`).replace(/^1 /, "")} ${parts.year}` : key;
    const group = groups.get(key) ?? { key, label, rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      rows: group.rows.sort((a, b) => b.date.localeCompare(a.date)),
    }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

export function getHistoryDayLabel(date: string): string {
  return getDayName(date);
}
