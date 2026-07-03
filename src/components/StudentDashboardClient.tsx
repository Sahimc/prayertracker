"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "@/app/dashboard/page.module.css";
import {
  formatPrayerTime,
  formatUKDate,
  getCurrentWeekDates,
  getDayName,
  getFormatDate,
  getIsoFromDateTime,
  isFutureDate,
} from "@/lib/dates";
import { calculatePointsFromLogs, PRAYER_LABELS, PRAYERS, RAKAAT_MAP } from "@/lib/prayers";
import type { OrganizationSummary, PrayerLogSummary, PrayerTimeSummary, StudentSummary } from "@/lib/types";

type StudentDashboardClientProps = {
  organization: OrganizationSummary;
  initialStudent: StudentSummary;
  initialPrayerTime: PrayerTimeSummary | null;
  mosqueSlug: string;
};

type StudentResponse = {
  student?: StudentSummary;
  error?: string;
};

type PrayerResponse = {
  prayerLog?: PrayerLogSummary;
  error?: string;
};

function getMinutesFromTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const [hourValue, minuteValue] = value.split(":");
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function getCurrentPrayer(prayerTime: PrayerTimeSummary | null): (typeof PRAYERS)[number] | null {
  if (!prayerTime) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let currentPrayer: (typeof PRAYERS)[number] | null = null;

  for (const prayer of PRAYERS) {
    const prayerMinutes = getMinutesFromTime(prayerTime[prayer]);
    if (prayerMinutes !== null && prayerMinutes <= currentMinutes) {
      currentPrayer = prayer;
    }
  }

  return currentPrayer ?? "isha";
}

export function StudentDashboardClient({
  organization,
  initialStudent,
  initialPrayerTime,
  mosqueSlug,
}: StudentDashboardClientProps) {
  const router = useRouter();
  const [student, setStudent] = useState(initialStudent);
  const [error, setError] = useState("");
  const weekDates = getCurrentWeekDates();
  const todayDateStr = getFormatDate(new Date());

  async function refreshStudent() {
    const response = await fetch(`/api/students/${student.id}`);
    const data = (await response.json()) as StudentResponse;
    if (response.ok && data.student) {
      setStudent(data.student);
    }
  }

  function getPrayerStatus(date: string, prayerName: (typeof PRAYERS)[number]): boolean {
    const log = student.prayers.find((prayerLog) => prayerLog.date === date);
    return log ? log[prayerName] : false;
  }

  async function togglePrayer(date: string, prayerName: (typeof PRAYERS)[number]) {
    const currentStatus = getPrayerStatus(date, prayerName);
    const newStatus = !currentStatus;
    const previousStudent = student;

    setError("");
    setStudent((currentStudent) => {
      const existingLog = currentStudent.prayers.find((prayerLog) => prayerLog.date === date);
      const updatedPrayers = existingLog
        ? currentStudent.prayers.map((prayerLog) =>
            prayerLog.date === date ? { ...prayerLog, [prayerName]: newStatus } : prayerLog,
          )
        : [
            ...currentStudent.prayers,
            {
              id: `temp-${date}`,
              organizationId: currentStudent.organizationId,
              studentId: currentStudent.id,
              date,
              fajr: prayerName === "fajr" ? newStatus : false,
              dhuhr: prayerName === "dhuhr" ? newStatus : false,
              asr: prayerName === "asr" ? newStatus : false,
              maghrib: prayerName === "maghrib" ? newStatus : false,
              isha: prayerName === "isha" ? newStatus : false,
            },
          ];

      return { ...currentStudent, prayers: updatedPrayers };
    });

    try {
      const response = await fetch("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mosqueSlug,
          date,
          prayerName,
          status: newStatus,
        }),
      });
      const data = (await response.json()) as PrayerResponse;

      if (!response.ok || !data.prayerLog) {
        throw new Error(data.error || "Failed to update prayer");
      }

      setStudent((currentStudent) => ({
        ...currentStudent,
        prayers: currentStudent.prayers.map((prayerLog) =>
          prayerLog.date === date ? data.prayerLog as PrayerLogSummary : prayerLog,
        ),
      }));
    } catch (toggleError) {
      setStudent(previousStudent);
      setError(toggleError instanceof Error ? toggleError.message : "Failed to update prayer");
      await refreshStudent();
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/m/${mosqueSlug}`);
  }

  const totalPoints = calculatePointsFromLogs(student.prayers);
  const firstName = student.fullName.split(" ")[0] || student.fullName;
  const titleLengthClass =
    firstName.length >= 12 ? styles.titleLong : firstName.length >= 9 ? styles.titleMedium : "";
  const currentPrayer = getCurrentPrayer(initialPrayerTime);
  const studentStartDate = getIsoFromDateTime(student.createdAt);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={["text-gradient", styles.title, titleLengthClass].filter(Boolean).join(" ")}>
            Salaam, {firstName}
          </h1>
          <p className={styles.mosqueMeta}>
            {organization.name} {"\u00b7"} {organization.town} {"\u00b7"} {student.class.name}
          </p>
        </div>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          Logout
        </button>
      </div>

      <div className={`glass-panel ${styles.todayCard}`}>
        <h2 className={styles.sectionTitle}>Today&apos;s Prayers</h2>
        <p className={styles.todayDate}>{formatUKDate(todayDateStr)}</p>
        <div className={styles.prayersGrid}>
          {PRAYERS.map((prayer) => {
            const isPrayed = getPrayerStatus(todayDateStr, prayer);
            const prayerTime = initialPrayerTime ? formatPrayerTime(initialPrayerTime[prayer]) : "";
            const isCurrentPrayer = currentPrayer === prayer;
            return (
              <div
                key={prayer}
                className={`${styles.prayerButtonShell} ${isCurrentPrayer ? styles.currentPrayerShell : ""}`}
              >
                <button
                  className={`${styles.bigPrayerBtn} ${isPrayed ? styles.prayed : ""} ${
                    isCurrentPrayer ? styles.currentPrayer : ""
                  }`}
                  onClick={() => togglePrayer(todayDateStr, prayer)}
                  aria-label={`${PRAYER_LABELS[prayer]}${isCurrentPrayer ? " current prayer" : ""}`}
                >
                  {isCurrentPrayer && <div className={styles.nowBadge}>Now</div>}
                  <div className={styles.prayerName}>{PRAYER_LABELS[prayer]}</div>
                  <div className={styles.rakaatPill}>{RAKAAT_MAP[prayer]}</div>
                </button>
                {prayerTime && (
                  <span className={`${styles.timePill} ${isCurrentPrayer ? styles.currentTimePill : ""}`}>
                    {prayerTime}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {!initialPrayerTime && <p className={styles.timeMissing}>Mosque prayer times not set.</p>}
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.scoreRow}>
          <div>
            Lifetime Score: <strong>{totalPoints} pts</strong>
          </div>
        </div>
      </div>

      <div className={`glass-panel ${styles.weekCard}`}>
        <div className={styles.weekHeader}>
          <h2 className={styles.sectionTitle}>This Week</h2>
          <Link href={`/m/${mosqueSlug}/dashboard/history`} className={styles.historyLink}>
            View Full History
          </Link>
        </div>
        <div className={styles.weekGrid}>
          {weekDates.days.map((dateStr) => {
            const isFuture = isFutureDate(dateStr, todayDateStr);
            const isBeforeStudentStart = dateStr < studentStartDate;
            return (
              <div key={dateStr} className={styles.dayColumn}>
                <div className={styles.dayName}>
                  {getDayName(dateStr)}
                  <br />
                  <span>{formatUKDate(dateStr)}</span>
                </div>
                {PRAYERS.map((prayer) => {
                  const isPrayed = getPrayerStatus(dateStr, prayer);
                  const isMissed = !isPrayed && !isFuture && !isBeforeStudentStart;
                  return (
                    <button
                      key={`${dateStr}-${prayer}`}
                      disabled={isFuture || isBeforeStudentStart}
                      className={`${styles.smallPrayerBtn} ${
                        isPrayed ? styles.prayed : isFuture || isBeforeStudentStart ? styles.future : styles.missed
                      }`}
                      title={
                        isBeforeStudentStart
                          ? "Not tracked before this student was created"
                          : `${PRAYER_LABELS[prayer]} on ${dateStr}`
                      }
                      onClick={() => togglePrayer(dateStr, prayer)}
                    >
                      {PRAYER_LABELS[prayer]}
                      {isMissed && <span className={styles.missedPill}>Missed</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className={`glass-panel ${styles.infoCard}`}>
        <h3 className={styles.infoTitle}>Prayer Guide</h3>
        <p>Each prayer earns 30 points.</p>
        <p>You must pray at least the Fardh:</p>
        <ul className={styles.infoList}>
          <li>
            <strong>Fajr:</strong> 2 rakaats
          </li>
          <li>
            <strong>Dhuhr:</strong> 4 rakaats
          </li>
          <li>
            <strong>Asr:</strong> 4 rakaats
          </li>
          <li>
            <strong>Maghrib:</strong> 3 rakaats
          </li>
          <li>
            <strong>Isha:</strong> 4 rakaats
          </li>
        </ul>
        <p>
          <strong>
            If you miss or forget a prayer, pray it as soon as you remember, even if the next prayer time has
            started or you overslept.
          </strong>
        </p>
        <p>
          <strong>Even if you missed 2 or 3 prayers in a row, pray them all straight away on the same day.</strong>
        </p>
        <p>
          <strong>As long as you pray the prayers, you can mark them as prayed and get your points.</strong>
        </p>
      </div>
    </div>
  );
}
