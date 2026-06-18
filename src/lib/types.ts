import type { PrayerName } from "./prayers";

export type Role = "student" | "admin";

export type OrganizationSummary = {
  id: string;
  name: string;
  town: string;
  slug: string;
};

export type PrayerSettingsSummary = {
  city: string;
  country: string;
  timezone: string;
  method: number;
  school: number;
  latitudeAdjustmentMethod: number;
};

export type PrayerLogSummary = {
  id: string;
  studentId: string;
  organizationId: string;
  date: string;
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
};

export type PrayerTimeSummary = {
  id: string;
  organizationId: string;
  date: string;
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

export type ClassSummary = {
  id: string;
  organizationId: string;
  name: string;
};

export type StudentSummary = {
  id: string;
  organizationId: string;
  classId: string;
  class: ClassSummary;
  fullName: string;
  dateOfBirth: string;
  prayers: PrayerLogSummary[];
};

export type AdminSummary = {
  id: string;
  organizationId: string;
  fullName: string;
  dateOfBirth: string;
};

export type StudentWithStats = StudentSummary & {
  totalPoints: number;
  todayCompleted: number;
};

export type PrayerTimeValues = Record<PrayerName, string>;
