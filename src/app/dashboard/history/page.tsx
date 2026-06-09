"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import { getDayName, formatUKDate, isFutureDate, getFormatDate } from "@/lib/dates";

export default function StudentHistory() {
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const prayersList = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const todayDateStr = getFormatDate(new Date());

  useEffect(() => {
    const studentId = localStorage.getItem("studentId");
    if (!studentId) {
      router.push("/");
      return;
    }
    fetchStudent(studentId);
  }, []);

  const fetchStudent = async (id: string) => {
    try {
      const res = await fetch(`/api/students/${id}`);
      if (res.ok) {
        const data = await res.json();
        // sort prayers by date descending
        data.prayers.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setStudent(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!student) return null;

  // calculate stats
  const totalLogs = student.prayers.length;
  let totalPrayersDone = 0;
  student.prayers.forEach((log: any) => {
    prayersList.forEach(p => {
      if (log[p]) totalPrayersDone++;
    });
  });
  const totalPoints = totalPrayersDone * 30;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={`text-gradient ${styles.title}`}>My History</h1>
        <Link href="/dashboard" className={styles.backBtn}>&larr; Back to Dashboard</Link>
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
        {student.prayers.map((log: any) => {
          const isFuture = isFutureDate(log.date, todayDateStr);
          return (
          <div key={log.id} className={`glass-panel ${styles.historyItem}`}>
            <div>
              <div className={styles.dateTitle}>{formatUKDate(log.date)}</div>
              <div style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>{getDayName(log.date)}</div>
            </div>
            
            <div className={styles.prayersRow}>
              {prayersList.map(prayer => {
                const isMissed = !log[prayer] && !isFuture;
                return (
                <div 
                  key={prayer} 
                  className={`${styles.prayerPill} ${log[prayer] ? styles.prayed : (isFuture ? styles.future : styles.missed)}`}
                >
                  {prayer.charAt(0).toUpperCase() + prayer.slice(1)}
                  {isMissed && <span className={styles.missedPill}>Missed</span>}
                </div>
                );
              })}
            </div>
          </div>
          );
        })}
        {student.prayers.length === 0 && (
          <div className="glass-panel" style={{padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
            No prayers recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
