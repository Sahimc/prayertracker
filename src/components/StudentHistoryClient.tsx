"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "@/app/dashboard/history/page.module.css";
import { formatUKDate, getIsoDaysAgo, getTodayIso } from "@/lib/dates";
import { buildCompleteHistoryRows, getHistoryDayLabel, groupHistoryRowsByMonth } from "@/lib/history-range";
import { calculatePointsFromLogs, countCompletedPrayers, PRAYER_LABELS, PRAYERS } from "@/lib/prayers";
import type { OrganizationSummary, PrayerLogSummary, StudentSummary } from "@/lib/types";

type StudentHistoryClientProps = {
  organization: OrganizationSummary;
  student: StudentSummary;
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

export function StudentHistoryClient({ organization, student, mosqueSlug }: StudentHistoryClientProps) {
  const [currentStudent, setCurrentStudent] = useState(student);
  const [error, setError] = useState("");
  const todayDateStr = getTodayIso();
  const editCutoffDate = getIsoDaysAgo(27, todayDateStr);

  const rows = useMemo(() => buildCompleteHistoryRows(currentStudent, todayDateStr), [currentStudent, todayDateStr]);
  const monthGroups = useMemo(() => groupHistoryRowsByMonth(rows), [rows]);
  const totalPrayersDone = rows.reduce((total, log) => total + countCompletedPrayers(log), 0);
  const totalPoints = calculatePointsFromLogs(rows);

  async function togglePrayer(log: PrayerLogSummary, prayerName: (typeof PRAYERS)[number]) {
    if (log.date < editCutoffDate) return;

    const currentStatus = log[prayerName];
    const previousStudent = currentStudent;
    setError("");

    setCurrentStudent((nextStudent) =>
      applyPrayerLog(nextStudent, {
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
          date: log.date,
          prayerName,
          status: !currentStatus,
        }),
      });
      const data = (await response.json()) as PrayerResponse;

      if (!response.ok || !data.prayerLog) {
        throw new Error(data.error || "Failed to update prayer");
      }

      setCurrentStudent((nextStudent) => applyPrayerLog(nextStudent, data.prayerLog as PrayerLogSummary));
    } catch (toggleError) {
      setCurrentStudent(previousStudent);
      setError(toggleError instanceof Error ? toggleError.message : "Failed to update prayer");
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={`text-gradient ${styles.title}`}>My History</h1>
          <p className={styles.mosqueMeta}>
            {organization.name} {"\u00b7"} {organization.town} {"\u00b7"} {currentStudent.class.name}
          </p>
        </div>
        <Link href={`/m/${mosqueSlug}/dashboard`} className={styles.backBtn}>
          Back to Dashboard
        </Link>
      </div>

      <div className={`glass-panel ${styles.statsCard}`}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{totalPoints}</span>
          <span className={styles.statLabel}>Total Points</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{totalPrayersDone}</span>
          <span className={styles.statLabel}>Total Prayers</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{rows.length}</span>
          <span className={styles.statLabel}>Days Tracked</span>
        </div>
      </div>

      <p className={styles.lockNote}>You can update prayers from the last 4 weeks. Older days stay visible but locked.</p>
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
                  {group.rows.map((log) => {
                    const isToday = log.date === todayDateStr;
                    const isLocked = log.date < editCutoffDate;

                    return (
                      <tr key={log.date} className={isToday ? styles.todayRow : undefined}>
                        <td className={styles.dateCell}>{formatUKDate(log.date)}</td>
                        <td>{getHistoryDayLabel(log.date)}</td>
                        {PRAYERS.map((prayer) => (
                          <td key={prayer}>
                            <button
                              type="button"
                              className={`${styles.prayerCell} ${log[prayer] ? styles.prayed : styles.missed} ${
                                isLocked ? styles.locked : ""
                              }`}
                              disabled={isLocked}
                              title={isLocked ? "Locked after 4 weeks" : `Toggle ${PRAYER_LABELS[prayer]}`}
                              onClick={() => togglePrayer(log, prayer)}
                            >
                              {log[prayer] ? "Prayed" : "Missed"}
                            </button>
                          </td>
                        ))}
                        <td className={styles.totalCell}>{countCompletedPrayers(log)}/5</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
