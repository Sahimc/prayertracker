"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./AdminClassDetailClient.module.css";
import { formatBirthMonthYear } from "@/lib/birthdays";
import { formatUKDate, getDateRange, getDayName, getIsoFromDateTime, getTodayIso } from "@/lib/dates";
import { countCompletedPrayers, PRAYER_LABELS, PRAYERS, type PrayerName } from "@/lib/prayers";
import type { ClassSummary, OrganizationSummary, PrayerLogSummary, StudentSummary } from "@/lib/types";

type AdminClassDetailClientProps = {
  organization: OrganizationSummary;
  studentClass: ClassSummary;
  initialStudents: StudentSummary[];
  mosqueSlug: string;
};

type SelectedCell = {
  date: string;
  studentId: string;
};

type PrayerUpdateResponse = {
  prayerLog?: PrayerLogSummary;
  error?: string;
};

function createEmptyPrayerLog(student: StudentSummary, date: string): PrayerLogSummary {
  return {
    id: `missing-${student.id}-${date}`,
    organizationId: student.organizationId,
    studentId: student.id,
    date,
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
  };
}

function getCellClass(total: number): string {
  if (total === PRAYERS.length) return styles.completeCell;
  if (total > 0) return styles.partialCell;
  return styles.missedCell;
}

function mergePrayerLog(students: StudentSummary[], studentId: string, prayerLog: PrayerLogSummary): StudentSummary[] {
  return students.map((student) => {
    if (student.id !== studentId) return student;

    const hasExistingLog = student.prayers.some((log) => log.date === prayerLog.date);
    const prayers = hasExistingLog
      ? student.prayers.map((log) => (log.date === prayerLog.date ? prayerLog : log))
      : [prayerLog, ...student.prayers];

    return {
      ...student,
      prayers: prayers.sort((a, b) => b.date.localeCompare(a.date)),
    };
  });
}

export function AdminClassDetailClient({
  organization,
  studentClass,
  initialStudents,
  mosqueSlug,
}: AdminClassDetailClientProps) {
  const [students, setStudents] = useState<StudentSummary[]>(initialStudents);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [savingPrayer, setSavingPrayer] = useState<PrayerName | null>(null);
  const [modalError, setModalError] = useState("");
  const todayDateStr = getTodayIso();

  const studentStartDates = useMemo(() => {
    return new Map(students.map((student) => [student.id, getIsoFromDateTime(student.createdAt)]));
  }, [students]);

  const dateColumns = useMemo(() => {
    if (students.length === 0) return [];

    const earliestStartDate = [...studentStartDates.values()].sort()[0];
    return getDateRange(earliestStartDate, todayDateStr).sort((a, b) => b.localeCompare(a));
  }, [students.length, studentStartDates, todayDateStr]);

  const logMaps = useMemo(() => {
    return new Map(
      students.map((student) => [
        student.id,
        new Map(student.prayers.map((log) => [log.date, log])),
      ]),
    );
  }, [students]);

  function getPrayerLog(student: StudentSummary, date: string): PrayerLogSummary {
    return logMaps.get(student.id)?.get(date) ?? createEmptyPrayerLog(student, date);
  }

  const selectedStudent = selectedCell ? students.find((student) => student.id === selectedCell.studentId) ?? null : null;
  const selectedLog = selectedCell && selectedStudent ? getPrayerLog(selectedStudent, selectedCell.date) : null;

  async function handlePrayerToggle(prayerName: PrayerName) {
    if (!selectedCell || !selectedStudent || !selectedLog || savingPrayer) return;

    const nextStatus = !selectedLog[prayerName];
    const optimisticLog = {
      ...selectedLog,
      [prayerName]: nextStatus,
    };
    const previousStudents = students;

    setModalError("");
    setSavingPrayer(prayerName);
    setStudents((currentStudents) => mergePrayerLog(currentStudents, selectedStudent.id, optimisticLog));

    try {
      const response = await fetch("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mosqueSlug,
          studentId: selectedStudent.id,
          date: selectedCell.date,
          prayerName,
          status: nextStatus,
        }),
      });

      const data = (await response.json()) as PrayerUpdateResponse;
      if (!response.ok || !data.prayerLog) {
        throw new Error(data.error || "Prayer update failed");
      }

      const updatedPrayerLog = data.prayerLog;
      setStudents((currentStudents) => mergePrayerLog(currentStudents, selectedStudent.id, updatedPrayerLog));
    } catch (error) {
      setStudents(previousStudents);
      setModalError(error instanceof Error ? error.message : "Prayer update failed");
    } finally {
      setSavingPrayer(null);
    }
  }

  const totalPossibleCells = students.reduce((total, student) => {
    const startDate = studentStartDates.get(student.id);
    if (!startDate) return total;
    return total + dateColumns.filter((date) => date >= startDate).length;
  }, 0);

  const totalCompletedPrayers = students.reduce((total, student) => {
    const startDate = studentStartDates.get(student.id);
    if (!startDate) return total;

    return total + dateColumns.reduce((studentTotal, date) => {
      if (date < startDate) return studentTotal;
      return studentTotal + countCompletedPrayers(getPrayerLog(student, date));
    }, 0);
  }, 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Class Register</p>
          <h1 className={`text-gradient ${styles.title}`}>{studentClass.name}</h1>
          <p className={styles.mosqueMeta}>
            {organization.name} {"\u00b7"} {organization.town} {"\u00b7"} {students.length}{" "}
            {students.length === 1 ? "student" : "students"}
          </p>
        </div>
        <Link href={`/m/${mosqueSlug}/admin/dashboard`} className={styles.backBtn}>
          Back to Dashboard
        </Link>
      </div>

      <div className={`glass-panel ${styles.statsCard}`}>
        <div>
          <span className={styles.statValue}>{students.length}</span>
          <span className={styles.statLabel}>Students</span>
        </div>
        <div>
          <span className={styles.statValue}>{dateColumns.length}</span>
          <span className={styles.statLabel}>Days</span>
        </div>
        <div>
          <span className={styles.statValue}>{totalCompletedPrayers}</span>
          <span className={styles.statLabel}>Prayers Logged</span>
        </div>
        <div>
          <span className={styles.statValue}>{totalPossibleCells ? Math.round((totalCompletedPrayers / (totalPossibleCells * PRAYERS.length)) * 100) : 0}%</span>
          <span className={styles.statLabel}>Average</span>
        </div>
      </div>

      {students.length === 0 ? (
        <div className={`glass-panel ${styles.emptyState}`}>
          <h2>No students in this class yet</h2>
          <p>Add a student from the dashboard and choose this class to start the register.</p>
        </div>
      ) : (
        <section className={`glass-panel ${styles.matrixCard}`} aria-label={`${studentClass.name} prayer register`}>
          <div className={styles.matrixHeader}>
            <div>
              <h2>Daily Prayer Register</h2>
              <p>Click any score to see the exact prayers for that student and date.</p>
            </div>
            <span className={styles.todayBadge}>Today: {formatUKDate(todayDateStr)}</span>
          </div>
          <div className={styles.tableScroller}>
            <table className={styles.matrixTable}>
              <thead>
                <tr>
                  <th className={`${styles.stickyTop} ${styles.stickyLeft} ${styles.cornerCell}`}>Student</th>
                  {dateColumns.map((date) => (
                    <th key={date} className={`${styles.stickyTop} ${styles.dateHead}`}>
                      <span>{formatUKDate(date)}</span>
                      <small>{getDayName(date)}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const startDate = studentStartDates.get(student.id) ?? todayDateStr;
                  return (
                    <tr key={student.id}>
                      <th className={`${styles.stickyLeft} ${styles.studentCell}`} scope="row">
                        <span>{student.fullName}</span>
                        <small>{formatBirthMonthYear(student.birthMonth, student.birthYear)}</small>
                      </th>
                      {dateColumns.map((date) => {
                        const isBeforeStart = date < startDate;
                        const log = getPrayerLog(student, date);
                        const total = countCompletedPrayers(log);

                        return (
                          <td key={`${student.id}-${date}`} className={isBeforeStart ? styles.notTrackedCell : undefined}>
                            {isBeforeStart ? (
                              <span className={styles.notTrackedMark}>-</span>
                            ) : (
                              <button
                                type="button"
                                className={`${styles.scoreButton} ${getCellClass(total)}`}
                                onClick={() => {
                                  setSelectedCell({ studentId: student.id, date });
                                  setModalError("");
                                }}
                                aria-label={`${student.fullName}, ${formatUKDate(date)}, ${total} out of ${PRAYERS.length} prayers`}
                              >
                                {total}/{PRAYERS.length}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selectedCell && selectedStudent && selectedLog && (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setSelectedCell(null)}>
          <section
            className={styles.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="class-prayer-breakdown-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>{formatUKDate(selectedCell.date)}</p>
                <h2 id="class-prayer-breakdown-title">{selectedStudent.fullName}</h2>
                <p>
                  {countCompletedPrayers(selectedLog)}/{PRAYERS.length} prayers completed
                </p>
              </div>
              <button type="button" className={styles.closeBtn} onClick={() => setSelectedCell(null)}>
                Close
              </button>
            </div>
            {modalError && <p className={styles.modalError}>{modalError}</p>}
            <div className={styles.breakdownList}>
              {PRAYERS.map((prayer) => {
                const prayed = selectedLog[prayer];
                const isSavingThisPrayer = savingPrayer === prayer;
                return (
                  <button
                    key={prayer}
                    type="button"
                    className={`${styles.breakdownRow} ${prayed ? styles.breakdownPrayed : styles.breakdownMissed}`}
                    onClick={() => handlePrayerToggle(prayer)}
                    disabled={savingPrayer !== null}
                    aria-pressed={prayed}
                    aria-label={`${PRAYER_LABELS[prayer]} ${prayed ? "prayed" : "missed"} for ${selectedStudent.fullName} on ${formatUKDate(selectedCell.date)}`}
                  >
                    <span>{PRAYER_LABELS[prayer]}</span>
                    <strong>{isSavingThisPrayer ? "Saving..." : prayed ? "Prayed" : "Missed"}</strong>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
