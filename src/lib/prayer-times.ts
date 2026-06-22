import { fetchAladhanPrayerTimes, normalizePrayerSettings, type AladhanPrayerSettings } from "./aladhan";
import { getTodayIso } from "./dates";
import { prisma } from "./prisma";
import type { PrayerTimeSummary } from "./types";

export type PrayerTimeOrganization = {
  id: string;
  prayerCity: string;
  prayerCountry: string;
  prayerTimezone: string;
  prayerCalculationMethod: number;
  prayerSchool: number;
  prayerLatitudeAdjustmentMethod: number;
};

type PrayerSettingsSource = Omit<PrayerTimeOrganization, "id">;

const PRAYER_TIME_SELECT = {
  id: true,
  organizationId: true,
  date: true,
  fajr: true,
  dhuhr: true,
  asr: true,
  maghrib: true,
  isha: true,
} as const;

export function prayerSettingsFromOrganization(organization: PrayerSettingsSource): AladhanPrayerSettings {
  return normalizePrayerSettings({
    city: organization.prayerCity,
    country: organization.prayerCountry,
    timezone: organization.prayerTimezone,
    method: organization.prayerCalculationMethod,
    school: organization.prayerSchool,
    latitudeAdjustmentMethod: organization.prayerLatitudeAdjustmentMethod,
  });
}

export async function ensureTodaysPrayerTime(
  organization: PrayerTimeOrganization,
): Promise<PrayerTimeSummary | null> {
  const date = getTodayIso();
  const existingPrayerTime = await prisma.prayerTime.findUnique({
    where: {
      organizationId_date: {
        organizationId: organization.id,
        date,
      },
    },
    select: PRAYER_TIME_SELECT,
  });

  if (existingPrayerTime) return existingPrayerTime;

  const settings = prayerSettingsFromOrganization(organization);

  try {
    const values = await fetchAladhanPrayerTimes(settings, date);
    return prisma.prayerTime.upsert({
      where: {
        organizationId_date: {
          organizationId: organization.id,
          date,
        },
      },
      update: values,
      create: {
        organizationId: organization.id,
        date,
        ...values,
      },
      select: PRAYER_TIME_SELECT,
    });
  } catch (error) {
    console.error("Could not calculate default prayer times:", error);
    return null;
  }
}
