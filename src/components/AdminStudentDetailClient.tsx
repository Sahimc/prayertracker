"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "@/app/admin/student/[id]/page.module.css";
import { formatBirthMonthYear } from "@/lib/birthdays";
import { formatUKDate, getTodayIso } from "@/lib/dates";
import { buildCompleteHistoryRows, getHistoryDayLabel, groupHistoryRowsByMonth } from "@/lib/history-range";
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
  const todayDateStr = getTodayIso();
  const rows = useMemo(() => buildCompleteHistoryRows(student, todayDateStr), [student, todayDateStr]);
  const monthGroups = useMemo(() => groupHistoryRowsByMonth(rows), [rows]);
  const totalPrayersDone = rows.reduce((total, log) => total + countCompletedPrayers(log), 0);

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
            {organization.name} {"\u00b7"} Class {student.class.name} {"\u00b7"} Birthday{" "}
            {formatBirthMonthYear(student.birthMonth, student.birthYear)}
          </p>
        </div>
        <Link href={`/m/${mosqueSlug}/admin/dashboard`} className={styles.backBtn}>
          Back to Dashboard
        </Link>
      </div>

      <div className={`glass-panel ${styles.statsCard}`}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{rows.length}</span>
          <span className={styles.statLabel}>Days Tracked</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{totalPrayersDone}</span>
          <span className={styles.statLabel}>Total Prayers</span>
        </div>
      </div>

      <p className={styles.lockNote}>Admins can update any non-future day from this student&apos;s start date.</p>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.historyList}>
        {monthGroups.map((group) => (
          <section key={group.key} className={`glass-panel ${styles.monthSection}`}>
            <h2 className={styles.monthTitle}>{group.label}</h2>
            <div className={styles.tableScroller}>
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    {PRAYERS.map((prayer) => (
                      <th key={prayer}>{PRAYER_LABELS[prayer]}</th>
                    ))}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((log) => (
                    <tr key={log.date} className={log.date === todayDateStr ? styles.todayRow : undefined}>
                      <td className={styles.dateCell}>{formatUKDate(log.date)}</td>
                      <td>{getHistoryDayLabel(log.date)}</td>
                      {PRAYERS.map((prayer) => (
                        <td key={prayer}>
                          <button
                            type="button"
                            className={`${styles.prayerCell} ${log[prayer] ? styles.prayed : styles.missed}`}
                            title={`Toggle ${PRAYER_LABELS[prayer]}`}
                            onClick={() => togglePrayer(log, prayer)}
                          >
                            {log[prayer] ? "Prayed" : "Missed"}
                          </button>
                        </td>
                      ))}
                      <td className={styles.totalCell}>{countCompletedPrayers(log)}/5</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
