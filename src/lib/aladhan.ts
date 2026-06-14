import { getTodayIso, isValidPrayerTime } from "./dates";
import type { PrayerTimeValues } from "./types";

export const ALADHAN_METHODS = [
  { id: 0, name: "Jafari / Shia Ithna-Ashari" },
  { id: 1, name: "University of Islamic Sciences, Karachi" },
  { id: 2, name: "Islamic Society of North America" },
  { id: 3, name: "Muslim World League" },
  { id: 4, name: "Umm Al-Qura University, Makkah" },
  { id: 5, name: "Egyptian General Authority of Survey" },
  { id: 7, name: "Institute of Geophysics, University of Tehran" },
  { id: 8, name: "Gulf Region" },
  { id: 9, name: "Kuwait" },
  { id: 10, name: "Qatar" },
  { id: 11, name: "Majlis Ugama Islam Singapura" },
  { id: 12, name: "Union Organization islamic de France" },
  { id: 13, name: "Diyanet, Turkey" },
  { id: 14, name: "Spiritual Administration of Muslims of Russia" },
  { id: 15, name: "Moonsighting Committee Worldwide" },
  { id: 16, name: "Dubai" },
  { id: 17, name: "JAKIM, Malaysia" },
  { id: 18, name: "Tunisia" },
  { id: 19, name: "Algeria" },
  { id: 20, name: "KEMENAG, Indonesia" },
  { id: 21, name: "Morocco" },
  { id: 22, name: "Comunidade Islamica de Lisboa" },
  { id: 23, name: "Ministry of Awqaf, Jordan" },
] as const;

export const ALADHAN_SCHOOLS = [
  { id: 0, name: "Shafi / Standard" },
  { id: 1, name: "Hanafi" },
] as const;

export const ALADHAN_LATITUDE_ADJUSTMENTS = [
  { id: 1, name: "Middle of the Night" },
  { id: 2, name: "One Seventh" },
  { id: 3, name: "Angle Based" },
] as const;

export type AladhanPrayerSettings = {
  city: string;
  country: string;
  timezone: string;
  method: number;
  school: number;
  latitudeAdjustmentMethod: number;
};

type AladhanResponse = {
  code: number;
  status: string;
  data?: {
    timings?: {
      Fajr?: string;
      Dhuhr?: string;
      Asr?: string;
      Maghrib?: string;
      Isha?: string;
    };
  };
};

function isoToAladhanDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}-${month}-${year}`;
}

function normalizeAladhanTime(value: string | undefined): string | null {
  const match = value?.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const normalized = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return isValidPrayerTime(normalized) ? normalized : null;
}

export function normalizePrayerSettings(input: Partial<AladhanPrayerSettings>): AladhanPrayerSettings {
  return {
    city: String(input.city || "London").trim() || "London",
    country: String(input.country || "GB").trim() || "GB",
    timezone: String(input.timezone || "Europe/London").trim() || "Europe/London",
    method: Number.isInteger(input.method) ? Number(input.method) : 3,
    school: input.school === 1 ? 1 : 0,
    latitudeAdjustmentMethod: [1, 2, 3].includes(Number(input.latitudeAdjustmentMethod))
      ? Number(input.latitudeAdjustmentMethod)
      : 3,
  };
}

export async function fetchAladhanPrayerTimes(
  settings: AladhanPrayerSettings,
  date = getTodayIso(),
): Promise<PrayerTimeValues> {
  const params = new URLSearchParams({
    city: settings.city,
    country: settings.country,
    method: String(settings.method),
    school: String(settings.school),
    latitudeAdjustmentMethod: String(settings.latitudeAdjustmentMethod),
    timezonestring: settings.timezone,
  });

  const response = await fetch(
    `https://api.aladhan.com/v1/timingsByCity/${isoToAladhanDate(date)}?${params.toString()}`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error("AlAdhan request failed");
  }

  const data = (await response.json()) as AladhanResponse;
  const timings = data.data?.timings;
  const fajr = normalizeAladhanTime(timings?.Fajr);
  const dhuhr = normalizeAladhanTime(timings?.Dhuhr);
  const asr = normalizeAladhanTime(timings?.Asr);
  const maghrib = normalizeAladhanTime(timings?.Maghrib);
  const isha = normalizeAladhanTime(timings?.Isha);

  if (!fajr || !dhuhr || !asr || !maghrib || !isha) {
    throw new Error("AlAdhan response did not include all five prayer times");
  }

  return { fajr, dhuhr, asr, maghrib, isha };
}
