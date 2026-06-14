"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "@/app/admin/page.module.css";
import {
  formatIsoToUkDate,
  formatPrayerTime,
  formatUKDate,
  getFormatDate,
} from "@/lib/dates";
import {
  calculatePointsFromLogs,
  countCompletedPrayers,
  PRAYER_LABELS,
  PRAYERS,
} from "@/lib/prayers";
import type {
  OrganizationSummary,
  PrayerLogSummary,
  PrayerTimeSummary,
  PrayerTimeValues,
  StudentSummary,
  StudentWithStats,
} from "@/lib/types";

type AdminDashboardClientProps = {
  organization: OrganizationSummary;
  initialStudents: StudentSummary[];
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

type PrayerTimeResponse = {
  prayerTime?: PrayerTimeSummary;
  error?: string;
};

type FilterMode = "all" | "completed" | "incomplete";
type SortMode = "name" | "points" | "mostToday" | "leastToday";

function blankPrayerTimes(): PrayerTimeValues {
  return {
    fajr: "",
    dhuhr: "",
    asr: "",
    maghrib: "",
    isha: "",
  };
}

function toPrayerTimeValues(prayerTime: PrayerTimeSummary | null): PrayerTimeValues {
  if (!prayerTime) return blankPrayerTimes();
  return {
    fajr: prayerTime.fajr,
    dhuhr: prayerTime.dhuhr,
    asr: prayerTime.asr,
    maghrib: prayerTime.maghrib,
    isha: prayerTime.isha,
  };
}

function getTodayLog(student: StudentSummary, today: string): PrayerLogSummary | undefined {
  return student.prayers.find((log) => log.date === today);
}

function applyPrayerLog(students: StudentSummary[], prayerLog: PrayerLogSummary): StudentSummary[] {
  return students.map((student) => {
    if (student.id !== prayerLog.studentId) return student;

    const hasLog = student.prayers.some((log) => log.date === prayerLog.date);
    return {
      ...student,
      prayers: hasLog
        ? student.prayers.map((log) => (log.date === prayerLog.date ? prayerLog : log))
        : [...student.prayers, prayerLog],
    };
  });
}

export function AdminDashboardClient({
  organization,
  initialStudents,
  initialPrayerTime,
  mosqueSlug,
}: AdminDashboardClientProps) {
  const [students, setStudents] = useState(initialStudents);
  const [newFullName, setNewFullName] = useState("");
  const [newDob, setNewDob] = useState("");
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [editingStudentId, setEditingStudentId] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editDob, setEditDob] = useState("");
  const [prayerTime, setPrayerTime] = useState(initialPrayerTime);
  const [prayerTimeForm, setPrayerTimeForm] = useState<PrayerTimeValues>(toPrayerTimeValues(initialPrayerTime));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const todayDateStr = getFormatDate(new Date());

  const studentsWithStats = useMemo<StudentWithStats[]>(() => {
    return students.map((student) => {
      const todayLog = getTodayLog(student, todayDateStr);
      return {
        ...student,
        totalPoints: calculatePointsFromLogs(student.prayers),
        todayCompleted: countCompletedPrayers(todayLog),
      };
    });
  }, [students, todayDateStr]);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return studentsWithStats
      .filter((student) => {
        if (normalizedQuery && !student.fullName.toLowerCase().includes(normalizedQuery)) return false;
        if (filterMode === "completed") return student.todayCompleted === PRAYERS.length;
        if (filterMode === "incomplete") return student.todayCompleted < PRAYERS.length;
        return true;
      })
      .sort((a, b) => {
        if (sortMode === "points") return b.totalPoints - a.totalPoints || a.fullName.localeCompare(b.fullName);
        if (sortMode === "mostToday") return b.todayCompleted - a.todayCompleted || a.fullName.localeCompare(b.fullName);
        if (sortMode === "leastToday") return a.todayCompleted - b.todayCompleted || a.fullName.localeCompare(b.fullName);
        return a.fullName.localeCompare(b.fullName);
      });
  }, [filterMode, query, sortMode, studentsWithStats]);

  const summary = useMemo(() => {
    const totalStudents = studentsWithStats.length;
    const activeToday = studentsWithStats.filter((student) => getTodayLog(student, todayDateStr)).length;
    const totalCompleted = studentsWithStats.reduce((total, student) => total + student.todayCompleted, 0);
    const averageCompletion = totalStudents ? Math.round((totalCompleted / (totalStudents * PRAYERS.length)) * 100) : 0;
    const perPrayer = Object.fromEntries(
      PRAYERS.map((prayer) => [
        prayer,
        studentsWithStats.filter((student) => Boolean(getTodayLog(student, todayDateStr)?.[prayer])).length,
      ]),
    ) as Record<(typeof PRAYERS)[number], number>;

    return { totalStudents, activeToday, totalCompleted, averageCompletion, perPrayer };
  }, [studentsWithStats, todayDateStr]);

  async function handleCreateStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: newFullName, dob: newDob }),
      });
      const data = (await response.json()) as StudentResponse;

      if (!response.ok || !data.student) {
        throw new Error(data.error || "Failed to create student");
      }

      setStudents((currentStudents) => [...currentStudents, data.student as StudentSummary]);
      setNewFullName("");
      setNewDob("");
      setSuccess("Student added.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create student");
    }
  }

  function startEdit(student: StudentSummary) {
    setEditingStudentId(student.id);
    setEditFullName(student.fullName);
    setEditDob(formatIsoToUkDate(student.dateOfBirth));
    setError("");
    setSuccess("");
  }

  async function handleEditStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingStudentId) return;
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/students/${editingStudentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: editFullName, dob: editDob }),
      });
      const data = (await response.json()) as StudentResponse;

      if (!response.ok || !data.student) {
        throw new Error(data.error || "Failed to update student");
      }

      setStudents((currentStudents) =>
        currentStudents.map((student) => (student.id === data.student?.id ? data.student : student)),
      );
      setEditingStudentId("");
      setSuccess("Student updated.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update student");
    }
  }

  async function deleteStudent(id: string, name: string) {
    if (!window.confirm(`Are you sure you want to permanently delete ${name} and all their prayer history?`)) return;
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/students/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete student");
      }

      setStudents((currentStudents) => currentStudents.filter((student) => student.id !== id));
      setSuccess("Student deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete student");
    }
  }

  async function togglePrayer(studentId: string, prayerName: (typeof PRAYERS)[number], currentStatus: boolean) {
    const previousStudents = students;
    setError("");
    setSuccess("");

    setStudents((currentStudents) => {
      const optimisticLog: PrayerLogSummary = {
        id: `temp-${studentId}-${todayDateStr}`,
        organizationId: organization.id,
        studentId,
        date: todayDateStr,
        fajr: false,
        dhuhr: false,
        asr: false,
        maghrib: false,
        isha: false,
        [prayerName]: !currentStatus,
      };

      return currentStudents.map((student) => {
        if (student.id !== studentId) return student;
        const existingLog = getTodayLog(student, todayDateStr);
        return {
          ...student,
          prayers: existingLog
            ? student.prayers.map((log) =>
                log.date === todayDateStr ? { ...log, [prayerName]: !currentStatus } : log,
              )
            : [...student.prayers, optimisticLog],
        };
      });
    });

    try {
      const response = await fetch("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mosqueSlug,
          studentId,
          date: todayDateStr,
          prayerName,
          status: !currentStatus,
        }),
      });
      const data = (await response.json()) as PrayerResponse;
      if (!response.ok || !data.prayerLog) {
        throw new Error(data.error || "Failed to update prayer");
      }

      setStudents((currentStudents) => applyPrayerLog(currentStudents, data.prayerLog as PrayerLogSummary));
    } catch (toggleError) {
      setStudents(previousStudents);
      setError(toggleError instanceof Error ? toggleError.message : "Failed to update prayer");
    }
  }

  async function handlePrayerTimeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/prayer-times/today", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prayerTimeForm),
      });
      const data = (await response.json()) as PrayerTimeResponse;

      if (!response.ok || !data.prayerTime) {
        throw new Error(data.error || "Failed to update prayer times");
      }

      setPrayerTime(data.prayerTime);
      setPrayerTimeForm(toPrayerTimeValues(data.prayerTime));
      setSuccess("Prayer times updated.");
    } catch (timeError) {
      setError(timeError instanceof Error ? timeError.message : "Failed to update prayer times");
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={`text-gradient ${styles.title}`}>Admin Dashboard</h1>
          <p className={styles.mosqueMeta}>
            {organization.name} · {organization.town} · {formatUKDate(todayDateStr)}
          </p>
        </div>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = `/m/${mosqueSlug}/admin`;
          }}
          className={styles.logoutBtn}
        >
          Logout
        </button>
      </div>

      <div className={`glass-panel ${styles.summaryCard}`}>
        <div className={styles.summaryGrid}>
          <div>
            <span className={styles.statValue}>{summary.totalStudents}</span>
            <span className={styles.statLabel}>Students</span>
          </div>
          <div>
            <span className={styles.statValue}>{summary.activeToday}</span>
            <span className={styles.statLabel}>Active Today</span>
          </div>
          <div>
            <span className={styles.statValue}>{summary.totalCompleted}</span>
            <span className={styles.statLabel}>Prayers Today</span>
          </div>
          <div>
            <span className={styles.statValue}>{summary.averageCompletion}%</span>
            <span className={styles.statLabel}>Average</span>
          </div>
        </div>
        <div className={styles.prayerCountRow}>
          {PRAYERS.map((prayer) => (
            <span key={prayer} className={styles.countChip}>
              {PRAYER_LABELS[prayer]} {summary.perPrayer[prayer]}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.sidebar}>
          <div className={`glass-panel ${styles.card}`}>
            <h2 className={styles.cardTitle}>Add Student</h2>
            <form className={styles.form} onSubmit={handleCreateStudent}>
              <input
                type="text"
                placeholder="First Name"
                className={styles.input}
                value={newFullName}
                onChange={(event) => setNewFullName(event.target.value)}
                required
              />
              <input
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/YYYY"
                className={styles.input}
                value={newDob}
                onChange={(event) => setNewDob(event.target.value)}
                required
              />
              <button type="submit" className={styles.submitBtn}>
                Create Student
              </button>
            </form>
          </div>

          <div className={`glass-panel ${styles.card}`}>
            <h2 className={styles.cardTitle}>Today&apos;s Prayer Times</h2>
            <form className={styles.form} onSubmit={handlePrayerTimeSubmit}>
              {PRAYERS.map((prayer) => (
                <label key={prayer} className={styles.timeLabel}>
                  <span>{PRAYER_LABELS[prayer]}</span>
                  <input
                    type="time"
                    className={styles.input}
                    value={prayerTimeForm[prayer]}
                    onChange={(event) =>
                      setPrayerTimeForm((current) => ({ ...current, [prayer]: event.target.value }))
                    }
                    required
                  />
                </label>
              ))}
              <button type="submit" className={styles.submitBtn}>
                Save Prayer Times
              </button>
            </form>
            {prayerTime && (
              <p className={styles.timeSummary}>
                Current Fajr time: {formatPrayerTime(prayerTime.fajr)}
              </p>
            )}
          </div>
        </div>

        <div className={styles.studentList}>
          <div className={`glass-panel ${styles.card}`}>
            <div className={styles.controls}>
              <input
                type="search"
                placeholder="Search students"
                className={styles.input}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select
                className={styles.input}
                value={filterMode}
                onChange={(event) => setFilterMode(event.target.value as FilterMode)}
              >
                <option value="all">All students</option>
                <option value="completed">Completed today</option>
                <option value="incomplete">Incomplete today</option>
              </select>
              <select
                className={styles.input}
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
              >
                <option value="name">Sort by name</option>
                <option value="points">Sort by points</option>
                <option value="mostToday">Most prayers today</option>
                <option value="leastToday">Least prayers today</option>
              </select>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            {success && <p className={styles.success}>{success}</p>}
          </div>

          {filteredStudents.map((student) => {
            const todayLog = getTodayLog(student, todayDateStr);
            const isEditing = editingStudentId === student.id;

            return (
              <div key={student.id} className={`glass-panel ${styles.studentCard}`}>
                <div className={styles.studentHeader}>
                  <div>
                    <h3 className={styles.studentName}>{student.fullName}</h3>
                    <p className={styles.studentMeta}>
                      DOB {formatIsoToUkDate(student.dateOfBirth)} · {student.todayCompleted}/5 today ·{" "}
                      {student.totalPoints} pts
                    </p>
                  </div>
                  <div className={styles.actionRow}>
                    <Link href={`/m/${mosqueSlug}/admin/student/${student.id}`} className={styles.btnSecondary}>
                      Details
                    </Link>
                    <button type="button" onClick={() => startEdit(student)} className={styles.btnSecondary}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteStudent(student.id, student.fullName)}
                      className={styles.deleteBtn}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <form className={styles.editForm} onSubmit={handleEditStudent}>
                    <input
                      type="text"
                      className={styles.input}
                      value={editFullName}
                      onChange={(event) => setEditFullName(event.target.value)}
                      required
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      className={styles.input}
                      value={editDob}
                      onChange={(event) => setEditDob(event.target.value)}
                      required
                    />
                    <button type="submit" className={styles.submitBtn}>
                      Save
                    </button>
                    <button type="button" className={styles.btnSecondary} onClick={() => setEditingStudentId("")}>
                      Cancel
                    </button>
                  </form>
                )}

                <div className={styles.statusGrid}>
                  {PRAYERS.map((prayer) => {
                    const isPrayed = Boolean(todayLog?.[prayer]);
                    return (
                      <button
                        key={prayer}
                        type="button"
                        className={`${styles.statusChip} ${isPrayed ? styles.prayed : styles.missed}`}
                        onClick={() => togglePrayer(student.id, prayer, isPrayed)}
                      >
                        {PRAYER_LABELS[prayer]}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredStudents.length === 0 && (
            <div className={`glass-panel ${styles.card}`} style={{ textAlign: "center", color: "var(--text-secondary)" }}>
              No students found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
