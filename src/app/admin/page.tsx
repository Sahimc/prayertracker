"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import { getCurrentWeekDates, getDayName, formatUKDate, isFutureDate, getFormatDate } from "@/lib/dates";

export default function AdminDashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [weekDates, setWeekDates] = useState(getCurrentWeekDates());
  const [newFullName, setNewFullName] = useState("");
  const [newDob, setNewDob] = useState("");
  const [error, setError] = useState("");
  const todayDateStr = getFormatDate(new Date());
  
  const prayersList = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdmin");
    if (!isAdmin) {
      router.push("/");
      return;
    }
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await fetch(`/api/students?startDate=${weekDates.start}&endDate=${weekDates.end}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: newFullName, dob: newDob })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create student");
      }
      
      setNewFullName("");
      setNewDob("");
      fetchStudents();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const togglePrayer = async (studentId: string, date: string, prayerName: string, currentStatus: boolean) => {
    try {
      // Optimistic update
      const updatedStudents = [...students];
      const studentIndex = updatedStudents.findIndex(s => s.id === studentId);
      if (studentIndex > -1) {
        const student = updatedStudents[studentIndex];
        const prayerLogIndex = student.prayers.findIndex((p: any) => p.date === date);
        
        if (prayerLogIndex > -1) {
          student.prayers[prayerLogIndex][prayerName] = !currentStatus;
        } else {
          student.prayers.push({
            date,
            [prayerName]: !currentStatus
          });
        }
        setStudents(updatedStudents);
      }

      await fetch("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          date,
          prayerName,
          status: !currentStatus
        })
      });
    } catch (err) {
      console.error("Failed to toggle prayer", err);
      // Revert on error could be implemented here
      fetchStudents();
    }
  };

  const deleteStudent = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${name} and all their prayer history?`)) return;
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStudents(students.filter((s: any) => s.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getPrayerStatus = (student: any, date: string, prayerName: string) => {
    const log = student.prayers?.find((p: any) => p.date === date);
    return log ? log[prayerName] : false;
  };

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    router.push("/");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={`text-gradient ${styles.title}`}>Admin Dashboard</h1>
        <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
      </div>

      <div className={styles.grid}>
        <div>
          <div className={`glass-panel ${styles.card}`}>
            <h2 className={styles.cardTitle}>Add Student</h2>
            <form className={styles.form} onSubmit={handleCreateStudent}>
              <input
                type="text"
                placeholder="Full Name"
                className={styles.input}
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                required
              />
              <input
                type="date"
                className={styles.input}
                value={newDob}
                onChange={(e) => setNewDob(e.target.value)}
                required
              />
              {error && <p style={{color: 'var(--accent-danger)', fontSize: '0.9rem'}}>{error}</p>}
              <button type="submit" className={styles.submitBtn}>Create Student</button>
            </form>
          </div>
        </div>

        <div className={styles.studentList}>
          {students.map((student) => (
            <div key={student.id} className={`glass-panel ${styles.studentCard}`}>
              <div className={styles.studentHeader}>
                <h3 className={styles.studentName}>{student.fullName}</h3>
                <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                  <Link href={`/admin/student/${student.id}`} className={styles.btnSecondary} style={{fontSize: '0.8rem', padding: '0.25rem 0.5rem'}}>
                    Full History &rarr;
                  </Link>
                  <button onClick={() => deleteStudent(student.id, student.fullName)} style={{background: 'rgba(220, 38, 38, 0.2)', color: '#ef4444', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', cursor: 'pointer'}}>
                    Delete
                  </button>
                </div>
              </div>
              
              <div className={styles.weekGrid}>
                {weekDates.days.map((dateStr) => {
                  const isFuture = isFutureDate(dateStr, todayDateStr);
                  return (
                  <div key={dateStr} className={styles.dayColumn}>
                    <div className={styles.dayName}>
                      {getDayName(dateStr)}<br/>
                      <span style={{fontSize: '0.7rem', opacity: 0.7}}>{formatUKDate(dateStr)}</span>
                    </div>
                    {prayersList.map(prayer => {
                      const isPrayed = getPrayerStatus(student, dateStr, prayer);
                      const isMissed = !isPrayed && !isFuture;
                      return (
                        <button
                          key={`${dateStr}-${prayer}`}
                          disabled={isFuture}
                          className={`${styles.prayerBtn} ${isPrayed ? styles.prayed : (isFuture ? styles.future : styles.missed)}`}
                          title={`${prayer} on ${dateStr}`}
                          onClick={() => togglePrayer(student.id, dateStr, prayer, isPrayed)}
                        >
                          {prayer[0].toUpperCase()}
                          {isMissed && <span className={styles.missedPill}>Missed</span>}
                        </button>
                      );
                    })}
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
          {students.length === 0 && (
            <div className={`glass-panel ${styles.card}`} style={{textAlign: 'center', color: 'var(--text-secondary)'}}>
              No students found. Add one on the left.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
