export const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

export type PrayerName = (typeof PRAYERS)[number];

export type PrayerFlags = Record<PrayerName, boolean>;

export const PRAYER_LABELS: Record<PrayerName, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

export const RAKAAT_MAP: Record<PrayerName, number> = {
  fajr: 2,
  dhuhr: 4,
  asr: 4,
  maghrib: 3,
  isha: 4,
};

export const POINTS_PER_PRAYER = 30;

export function isPrayerName(value: string): value is PrayerName {
  return PRAYERS.includes(value as PrayerName);
}

export function countCompletedPrayers(log: Partial<PrayerFlags> | null | undefined): number {
  if (!log) return 0;
  return PRAYERS.reduce((total, prayer) => total + (log[prayer] ? 1 : 0), 0);
}

export function calculatePointsFromLogs<T extends Partial<PrayerFlags>>(logs: T[] = []): number {
  return logs.reduce((total, log) => total + countCompletedPrayers(log) * POINTS_PER_PRAYER, 0);
}
