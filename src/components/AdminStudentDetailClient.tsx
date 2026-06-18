"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "@/app/admin/student/[id]/page.module.css";
import { formatIsoToUkDate, formatUKDate, getDayName, getFormatDate, isFutureDate } from "@/lib/dates";
import { countCompletedPrayers, PRAYER_LABELS, PRAYERS } from "@/lib/prayers";
import type { OrganizationSummary, PrayerLogSummary, StudentSummary } from "@/lib/types";

type AdminStudentDetailClientProps = {
  organization: OrganizationSummary;
  initialStudent: StudentSummary;
  mosqueSlug: string;
};

type PrayerResponse = {
  prayerLog?: PrayerLogSummary;
  error?: string;
};

function applyPrayerLog(student: StudentSummary, prayerLog: PrayerLogSummary): StudentSummary {
  const hasLog = student.prayers.some((log) => log.date === prayerLog.date);
  return {
    ...student,
    prayers: hasLog
      ? student.prayers.map((log) => (log.date === prayerLog.date ? prayerLog : log))
      : [...student.prayers, prayerLog],
  };
}

export function AdminStudentDetailClient({
  organization,
  initialStudent,
  mosqueSlug,
}: AdminStudentDetailClientProps) {
  const [student, setStudent] = useState(initialStudent);
  const [error, setError] = useState("");
  const todayDateStr = getFormatDate(new Date());
  const sortedPrayers = [...student.prayers].sort((a, b) => b.date.localeCompare(a.date));
  const totalPrayersDone = sortedPrayers.reduce((total, log) => total + countCompletedPrayers(log), 0);

  async function togglePrayer(log: PrayerLogSummary, prayerName: (typeof PRAYERS)[number]) {
    const currentStatus = log[prayerName];
    const previousStudent = student;
    setError("");

    setStudent((currentStudent) =>
      applyPrayerLog(currentStudent, {
        ...log,
        [prayerName]: !currentStatus,
      }),
    );

    try {
      const response = await fetch("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mosqueSlug,
          studentId: student.id,
          date: log.date,
          prayerName,
          status: !currentStatus,
        }),
      });
      const data = (await response.json()) as PrayerResponse;

      if (!response.ok || !data.prayerLog) {
        throw new Error(data.error || "Failed to update prayer");
      }

      setStudent((currentStudent) => applyPrayerLog(currentStudent, data.prayerLog as PrayerLogSummary));
    } catch (toggleError) {
      setStudent(previousStudent);
      setError(toggleError instanceof Error ? toggleError.message : "Failed to update prayer");
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={`text-gradient ${styles.title}`}>{student.fullName} History</h1>
          <p className={styles.mosqueMeta}>
            {organization.name} {"\u00b7"} Class {student.class.name} {"\u00b7"} DOB{" "}
            {formatIsoToUkDate(student.dateOfBirth)}
          </p>
        </div>
        <Link href={`/m/${mosqueSlug}/admin/dashboard`} className={styles.backBtn}>
          Back to Dashboard
        </Link>
      </div>

      <div className={`glass-panel ${styles.statsCard}`}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{sortedPrayers.length}</span>
          <span className={styles.statLabel}>Days Tracked</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{totalPrayersDone}</span>
          <span className={styles.statLabel}>Total Prayers</span>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.historyList}>
        {sortedPrayers.map((log) => {
          const isFuture = isFutureDate(log.date, todayDateStr);
          return (
            <div key={log.id} className={`glass-panel ${styles.historyItem}`}>
              <div>
                <div className={styles.dateTitle}>{formatUKDate(log.date)}</div>
                <div className={styles.dayMeta}>{getDayName(log.date)}</div>
              </div>

              <div className={styles.prayersRow}>
                {PRAYERS.map((prayer) => {
                  const isMissed = !log[prayer] && !isFuture;
                  return (
                    <button
                      key={prayer}
                      disabled={isFuture}
                      className={`${styles.prayerPill} ${
                        log[prayer] ? styles.prayed : isFuture ? styles.future : styles.missed
                      }`}
                      onClick={() => togglePrayer(log, prayer)}
                    >
                      {PRAYER_LABELS[prayer]}
                      {isMissed && <span className={styles.missedPill}>Missed</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {sortedPrayers.length === 0 && (
          <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
            No prayers recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
