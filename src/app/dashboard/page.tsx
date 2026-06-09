"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import { getCurrentWeekDates, getDayName, getFormatDate, formatUKDate, isFutureDate } from "@/lib/dates";

export default function Dashboard() {
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [weekDates, setWeekDates] = useState(getCurrentWeekDates());
  const todayDateStr = getFormatDate(new Date());
  
  const prayersList = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const rakaatMap: Record<string, number> = {
    fajr: 2,
    dhuhr: 4,
    asr: 4,
    maghrib: 3,
    isha: 4
  };

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
      // Fetch all prayers for points calculation
      const res = await fetch(`/api/students/${id}`);
      if (res.ok) {
        const data = await res.json();
        setStudent(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getPrayerStatus = (date: string, prayerName: string) => {
    if (!student) return false;
    const log = student.prayers?.find((p: any) => p.date === date);
    return log ? log[prayerName] : false;
  };

  const togglePrayer = async (date: string, prayerName: string) => {
    if (!student) return;
    
    const currentStatus = getPrayerStatus(date, prayerName);
    const newStatus = !currentStatus;

    // Optimistic update
    const updatedStudent = { ...student };
    const logIndex = updatedStudent.prayers.findIndex((p: any) => p.date === date);
    if (logIndex > -1) {
      updatedStudent.prayers[logIndex][prayerName] = newStatus;
    } else {
      updatedStudent.prayers.push({
        date,
        [prayerName]: newStatus
      });
    }
    setStudent(updatedStudent);

    try {
      await fetch("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          date,
          prayerName,
          status: newStatus
        })
      });
    } catch (err) {
      console.error("Failed to update prayer", err);
      fetchStudent(student.id); // revert on error
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("studentId");
    router.push("/");
  };

  if (!student) return null; // Or a loading spinner

  // Calculate total points
  let totalPoints = 0;
  student.prayers?.forEach((log: any) => {
    prayersList.forEach(p => {
      if (log[p]) totalPoints += 30;
    });
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={`text-gradient ${styles.title}`}>Hello, {student.fullName.split(' ')[0]}</h1>
        <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
      </div>

      <div className={`glass-panel ${styles.todayCard}`}>
        <h2 className={styles.sectionTitle}>Today's Prayers</h2>
        <div className={styles.prayersGrid}>
          {prayersList.map(prayer => {
            const isPrayed = getPrayerStatus(todayDateStr, prayer);
            return (
              <button
                key={prayer}
                className={`${styles.bigPrayerBtn} ${isPrayed ? styles.prayed : ""}`}
                onClick={() => togglePrayer(todayDateStr, prayer)}
              >
                <div className={styles.prayerName}>{prayer.charAt(0).toUpperCase() + prayer.slice(1)}</div>
                <div className={styles.rakaatPill}>{rakaatMap[prayer]}</div>
              </button>
            );
          })}
        </div>
        <div className={styles.prayersGrid} style={{marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)'}}>
          <div style={{fontSize: '1.2rem', color: 'var(--text-secondary)'}}>
            Total Score: <strong style={{color: 'var(--accent-warning)', fontSize: '2rem'}}>{totalPoints} pts</strong>
          </div>
        </div>
      </div>

      <div className={`glass-panel ${styles.weekCard}`}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
          <h2 className={styles.sectionTitle} style={{marginBottom: 0}}>This Week</h2>
          <Link href="/dashboard/history" style={{background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '8px', color: 'white', fontSize: '0.9rem'}}>View Full History</Link>
        </div>
        <div className={styles.weekGrid}>
          {weekDates.days.map((dateStr) => {
            const isFuture = isFutureDate(dateStr, todayDateStr);
            return (
            <div key={dateStr} className={styles.dayColumn}>
              <div className={styles.dayName}>
                {getDayName(dateStr)}<br/>
                <span style={{fontSize: '0.8rem', opacity: 0.7}}>{formatUKDate(dateStr)}</span>
              </div>
              {prayersList.map(prayer => {
                const isPrayed = getPrayerStatus(dateStr, prayer);
                const isMissed = !isPrayed && !isFuture;
                return (
                  <button
                    key={`${dateStr}-${prayer}`}
                    disabled={isFuture}
                    className={`${styles.smallPrayerBtn} ${isPrayed ? styles.prayed : (isFuture ? styles.future : styles.missed)}`}
                    title={`${prayer} on ${dateStr}`}
                    onClick={() => togglePrayer(dateStr, prayer)}
                  >
                    {prayer.charAt(0).toUpperCase() + prayer.slice(1)}
                    {isMissed && <span className={styles.missedPill}>Missed</span>}
                  </button>
                );
              })}
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
