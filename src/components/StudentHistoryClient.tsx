"use client";

import Link from "next/link";
import styles from "@/app/dashboard/history/page.module.css";
import { formatUKDate, getDayName, getFormatDate, isFutureDate } from "@/lib/dates";
import { calculatePointsFromLogs, countCompletedPrayers, PRAYER_LABELS, PRAYERS } from "@/lib/prayers";
import type { OrganizationSummary, StudentSummary } from "@/lib/types";

type StudentHistoryClientProps = {
  organization: OrganizationSummary;
  student: StudentSummary;
  mosqueSlug: string;
};

export function StudentHistoryClient({ organization, student, mosqueSlug }: StudentHistoryClientProps) {
  const todayDateStr = getFormatDate(new Date());
  const sortedPrayers = [...student.prayers].sort((a, b) => b.date.localeCompare(a.date));
  const totalPrayersDone = sortedPrayers.reduce((total, log) => total + countCompletedPrayers(log), 0);
  const totalPoints = calculatePointsFromLogs(sortedPrayers);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={`text-gradient ${styles.title}`}>My History</h1>
          <p className={styles.mosqueMeta}>
            {organization.name} {"\u00b7"} {organization.town} {"\u00b7"} {student.class.name}
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
      </div>

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
                    <div
                      key={prayer}
                      className={`${styles.prayerPill} ${
                        log[prayer] ? styles.prayed : isFuture ? styles.future : styles.missed
                      }`}
                    >
                      {PRAYER_LABELS[prayer]}
                      {isMissed && <span className={styles.missedPill}>Missed</span>}
                    </div>
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
