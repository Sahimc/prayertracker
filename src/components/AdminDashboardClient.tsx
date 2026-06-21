"use client";

import Link from "next/link";
import { useMemo, useState, useRef } from "react";
import styles from "@/app/admin/page.module.css";
import { ALADHAN_LATITUDE_ADJUSTMENTS, ALADHAN_METHODS, ALADHAN_SCHOOLS } from "@/lib/aladhan";
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
  AdminSummary,
  ClassSummary,
  OrganizationSummary,
  PrayerLogSummary,
  PrayerSettingsSummary,
  PrayerTimeSummary,
  StudentSummary,
  StudentWithStats,
} from "@/lib/types";

type AdminDashboardClientProps = {
  organization: OrganizationSummary;
  initialStudents: StudentSummary[];
  initialAdmins: AdminSummary[];
  initialClasses: ClassSummary[];
  initialPrayerSettings: PrayerSettingsSummary;
  initialPrayerTime: PrayerTimeSummary | null;
  mosqueSlug: string;
};

type StudentResponse = {
  student?: StudentSummary;
  class?: ClassSummary;
  error?: string;
};

type ClassResponse = {
  class?: ClassSummary;
  error?: string;
};

type PrayerResponse = {
  prayerLog?: PrayerLogSummary;
  error?: string;
};

type PrayerTimeResponse = {
  prayerTime?: PrayerTimeSummary;
  settings?: PrayerSettingsSummary;
  error?: string;
};

type AdminResponse = {
  admin?: AdminSummary;
  error?: string;
};

type StudentClassMode = "existing" | "new";
type FilterMode = "all" | "completed" | "incomplete";
type SortMode = "name" | "points" | "mostToday" | "leastToday";

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
  initialAdmins,
  initialClasses,
  initialPrayerSettings,
  initialPrayerTime,
  mosqueSlug,
}: AdminDashboardClientProps) {
  const [students, setStudents] = useState(initialStudents);
  const [admins, setAdmins] = useState(initialAdmins);
  const [classes, setClasses] = useState(initialClasses);
  const [newClassName, setNewClassName] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newStudentClassMode, setNewStudentClassMode] = useState<StudentClassMode>(
    initialClasses.length > 0 ? "existing" : "new",
  );
  const [newStudentClassId, setNewStudentClassId] = useState(initialClasses[0]?.id ?? "");
  const [newStudentNewClassName, setNewStudentNewClassName] = useState("");
  const [newAdminFullName, setNewAdminFullName] = useState("");
  const [newAdminDob, setNewAdminDob] = useState("");
  const [query, setQuery] = useState("");
  const [classFilterId, setClassFilterId] = useState("all");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [editingStudentId, setEditingStudentId] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editClassId, setEditClassId] = useState("");
  const [prayerTime, setPrayerTime] = useState(initialPrayerTime);
  const [prayerSettings, setPrayerSettings] = useState<PrayerSettingsSummary>(initialPrayerSettings);
  const [prayerSettingsLoading, setPrayerSettingsLoading] = useState(false);
  const [showDailyReminder, setShowDailyReminder] = useState(true);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [studentPendingDelete, setStudentPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const newDateInputRef = useRef<HTMLInputElement>(null);
  const newAdminDateInputRef = useRef<HTMLInputElement>(null);
  const editDateInputRef = useRef<HTMLInputElement>(null);

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 8) val = val.slice(0, 8);
    let formatted = val;
    if (val.length >= 5) {
      formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
    } else if (val.length >= 3) {
      formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setter(formatted);
  };

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const val = e.target.value;
    if (!val) return;
    const parts = val.split("-");
    if (parts.length === 3) {
      setter(`${parts[2]}/${parts[1]}/${parts[0]}`);
    }
  };

  const todayDateStr = getFormatDate(new Date());

  const classStudentCounts = useMemo(() => {
    return students.reduce<Record<string, number>>((counts, student) => {
      counts[student.classId] = (counts[student.classId] ?? 0) + 1;
      return counts;
    }, {});
  }, [students]);

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
        const searchableText = `${student.fullName} ${student.class.name}`.toLowerCase();
        if (normalizedQuery && !searchableText.includes(normalizedQuery)) return false;
        if (classFilterId !== "all" && student.classId !== classFilterId) return false;
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
  }, [classFilterId, filterMode, query, sortMode, studentsWithStats]);

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

  function upsertClassInState(nextClass: ClassSummary) {
    setClasses((currentClasses) => {
      if (currentClasses.some((studentClass) => studentClass.id === nextClass.id)) {
        return currentClasses;
      }

      return [...currentClasses, nextClass].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  async function handleCreateClass(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newClassName }),
      });
      const data = (await response.json()) as ClassResponse;

      if (!response.ok || !data.class) {
        throw new Error(data.error || "Failed to create class");
      }

      upsertClassInState(data.class);
      setNewClassName("");
      setNewStudentClassMode("existing");
      setNewStudentClassId(data.class.id);
      setClassFilterId(data.class.id);
      setSuccess("Class created.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create class");
    }
  }

  async function handleCreateStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const shouldCreateClass = classes.length === 0 || newStudentClassMode === "new";
    const studentPayload = shouldCreateClass
      ? { fullName: newFullName, dob: newDob, newClassName: newStudentNewClassName }
      : { fullName: newFullName, dob: newDob, classId: newStudentClassId };

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentPayload),
      });
      const data = (await response.json()) as StudentResponse;

      if (!response.ok || !data.student) {
        throw new Error(data.error || "Failed to create student");
      }

      setStudents((currentStudents) => [...currentStudents, data.student as StudentSummary]);
      if (data.class) {
        upsertClassInState(data.class);
        setNewStudentClassMode("existing");
        setNewStudentClassId(data.class.id);
      } else if (data.student.class) {
        upsertClassInState(data.student.class);
        setNewStudentClassId(data.student.classId);
      }
      setNewFullName("");
      setNewDob("");
      setNewStudentNewClassName("");
      setShowAddStudentModal(false);
      setSuccess("Student added.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create student");
    }
  }

  async function handleCreateAdmin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: newAdminFullName, dob: newAdminDob }),
      });
      const data = (await response.json()) as AdminResponse;

      if (!response.ok || !data.admin) {
        throw new Error(data.error || "Failed to create admin");
      }

      setAdmins((currentAdmins) => [...currentAdmins, data.admin as AdminSummary]);
      setNewAdminFullName("");
      setNewAdminDob("");
      setShowAddAdminModal(false);
      setSuccess("Admin added.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create admin");
    }
  }

  function startEdit(student: StudentSummary) {
    setEditingStudentId(student.id);
    setEditFullName(student.fullName);
    setEditDob(formatIsoToUkDate(student.dateOfBirth));
    setEditClassId(student.classId);
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
        body: JSON.stringify({ fullName: editFullName, dob: editDob, classId: editClassId }),
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

  function openDeleteStudentModal(id: string, name: string) {
    setStudentPendingDelete({ id, name });
    setDeleteConfirmationText("");
    setError("");
    setSuccess("");
  }

  function closeDeleteStudentModal() {
    if (deleteLoading) return;
    setStudentPendingDelete(null);
    setDeleteConfirmationText("");
  }

  async function confirmDeleteStudent() {
    if (!studentPendingDelete || deleteConfirmationText.trim().toUpperCase() !== "DELETE") return;
    setError("");
    setSuccess("");
    setDeleteLoading(true);

    try {
      const response = await fetch(`/api/students/${studentPendingDelete.id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete student");
      }

      setStudents((currentStudents) => currentStudents.filter((student) => student.id !== studentPendingDelete.id));
      setStudentPendingDelete(null);
      setDeleteConfirmationText("");
      setSuccess("Student deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete student");
    } finally {
      setDeleteLoading(false);
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

  async function savePrayerSettings(nextSettings = prayerSettings) {
    setError("");
    setSuccess("");
    setPrayerSettingsLoading(true);

    try {
      const response = await fetch("/api/prayer-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSettings),
      });
      const data = (await response.json()) as PrayerTimeResponse;

      if (!response.ok || !data.prayerTime || !data.settings) {
        throw new Error(data.error || "Could not fetch prayer times. Please check the location and method.");
      }

      setPrayerSettings(data.settings);
      setPrayerTime(data.prayerTime);
      setSuccess("Prayer times calculated and saved.");
    } catch (timeError) {
      setError(timeError instanceof Error ? timeError.message : "Could not fetch prayer times. Please check the location and method.");
    } finally {
      setPrayerSettingsLoading(false);
    }
  }

  async function handlePrayerSettingsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await savePrayerSettings();
  }

  function updatePrayerSetting<K extends keyof PrayerSettingsSummary>(
    key: K,
    value: PrayerSettingsSummary[K],
    shouldSave = false,
  ) {
    const nextSettings = { ...prayerSettings, [key]: value };
    setPrayerSettings(nextSettings);
    if (shouldSave) {
      void savePrayerSettings(nextSettings);
    }
  }

  return (
    <div className={styles.container}>
      {showDailyReminder && (
        <div className={styles.modalOverlay} role="presentation">
          <div
            className={styles.reminderModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="daily-prayer-reminder-title"
          >
            <p className={styles.modalEyebrow}>Daily teacher reminder</p>
            <h2 id="daily-prayer-reminder-title">Check in with every student today</h2>
            <p>
              Teachers and admins should ask students about their daily prayers, encourage them kindly, and remind
              them never to miss prayers on purpose.
            </p>
            <button className={styles.submitBtn} onClick={() => setShowDailyReminder(false)}>
              I understand
            </button>
          </div>
        </div>
      )}

      {studentPendingDelete && (
        <div className={styles.modalOverlay} role="presentation">
          <div
            className={styles.reminderModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-student-title"
            aria-describedby="delete-student-description"
          >
            <p className={styles.deleteEyebrow}>Permanent delete</p>
            <h2 id="delete-student-title">Delete {studentPendingDelete.name}?</h2>
            <p id="delete-student-description">
              This will permanently delete this student and all of their prayer history. This cannot be undone.
            </p>
            <label className={styles.confirmLabel}>
              <span>Type DELETE to confirm</span>
              <input
                type="text"
                className={styles.input}
                value={deleteConfirmationText}
                onChange={(event) => setDeleteConfirmationText(event.target.value)}
                autoFocus
                autoComplete="off"
              />
            </label>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnSecondary} onClick={closeDeleteStudentModal}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.deleteConfirmBtn}
                onClick={confirmDeleteStudent}
                disabled={deleteConfirmationText.trim().toUpperCase() !== "DELETE" || deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete Student"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddStudentModal && (
        <div className={styles.fullScreenModalOverlay} role="presentation">
          <section
            className={styles.fullScreenModalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-student-title"
          >
            <div className={styles.fullScreenModalHeader}>
              <div>
                <p className={styles.modalEyebrow}>Student setup</p>
                <h2 id="add-student-title">Add Student</h2>
                <p>Add a child and place them into a class.</p>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowAddStudentModal(false)}
                aria-label="Close add student form"
              >
                Close
              </button>
            </div>
            <form className={`${styles.form} ${styles.fullScreenForm}`} onSubmit={handleCreateStudent}>
              <label className={styles.fieldLabel}>
                <span>Student name</span>
                <input
                  type="text"
                  placeholder="First Name"
                  className={styles.input}
                  value={newFullName}
                  onChange={(event) => setNewFullName(event.target.value)}
                  required
                />
              </label>
              <label className={styles.fieldLabel}>
                <span>Birthday</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="DD/MM/YYYY"
                    className={styles.input}
                    value={newDob}
                    onChange={(event) => handleDobChange(event, setNewDob)}
                    required
                    style={{ paddingRight: '40px' }}
                  />
                  <input
                    type="date"
                    ref={newDateInputRef}
                    onChange={(e) => handleNativeDateChange(e, setNewDob)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      width: '24px',
                      height: '24px',
                      opacity: 0,
                      cursor: 'pointer',
                      zIndex: 2
                    }}
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      position: 'absolute',
                      right: '12px',
                      width: '20px',
                      height: '20px',
                      color: 'var(--text-secondary)',
                      pointerEvents: 'none',
                      zIndex: 1
                    }}
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
              </label>
              {classes.length > 0 && (
                <label className={styles.fieldLabel}>
                  <span>Class</span>
                  <select
                    className={styles.input}
                    value={newStudentClassMode === "new" ? "__new__" : newStudentClassId}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === "__new__") {
                        setNewStudentClassMode("new");
                        setNewStudentClassId("");
                        return;
                      }

                      setNewStudentClassMode("existing");
                      setNewStudentClassId(value);
                    }}
                    required
                  >
                    <option value="">Choose class</option>
                    {classes.map((studentClass) => (
                      <option key={studentClass.id} value={studentClass.id}>
                        {studentClass.name}
                      </option>
                    ))}
                    <option value="__new__">Create new class</option>
                  </select>
                </label>
              )}
              {(classes.length === 0 || newStudentClassMode === "new") && (
                <label className={styles.fieldLabel}>
                  <span>{classes.length === 0 ? "First class" : "New class"}</span>
                  <input
                    type="text"
                    placeholder={classes.length === 0 ? "First class name" : "New class name"}
                    className={styles.input}
                    value={newStudentNewClassName}
                    onChange={(event) => setNewStudentNewClassName(event.target.value)}
                    required
                  />
                </label>
              )}
              <button type="submit" className={styles.submitBtn}>
                Create Student
              </button>
            </form>
          </section>
        </div>
      )}

      {showAddAdminModal && (
        <div className={styles.fullScreenModalOverlay} role="presentation">
          <section
            className={styles.fullScreenModalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-admin-title"
          >
            <div className={styles.fullScreenModalHeader}>
              <div>
                <p className={styles.modalEyebrow}>Teacher access</p>
                <h2 id="add-admin-title">Add Admin</h2>
                <p>Admins can be teachers too.</p>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowAddAdminModal(false)}
                aria-label="Close add admin form"
              >
                Close
              </button>
            </div>
            <form className={`${styles.form} ${styles.fullScreenForm}`} onSubmit={handleCreateAdmin}>
              <label className={styles.fieldLabel}>
                <span>Admin name</span>
                <input
                  type="text"
                  placeholder="Admin Name"
                  className={styles.input}
                  value={newAdminFullName}
                  onChange={(event) => setNewAdminFullName(event.target.value)}
                  required
                />
              </label>
              <label className={styles.fieldLabel}>
                <span>Birthday</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="DD/MM/YYYY"
                    className={styles.input}
                    value={newAdminDob}
                    onChange={(event) => handleDobChange(event, setNewAdminDob)}
                    required
                    style={{ paddingRight: '40px' }}
                  />
                  <input
                    type="date"
                    ref={newAdminDateInputRef}
                    onChange={(event) => handleNativeDateChange(event, setNewAdminDob)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      width: '24px',
                      height: '24px',
                      opacity: 0,
                      cursor: 'pointer',
                      zIndex: 2
                    }}
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      position: 'absolute',
                      right: '12px',
                      width: '20px',
                      height: '20px',
                      color: 'var(--text-secondary)',
                      pointerEvents: 'none',
                      zIndex: 1
                    }}
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
              </label>
              <button type="submit" className={styles.submitBtn}>
                Create Admin
              </button>
            </form>
          </section>
        </div>
      )}

      <div className={styles.header}>
        <div>
          <h1 className={`text-gradient ${styles.title}`}>Admin Dashboard</h1>
          <p className={styles.mosqueMeta}>
            {organization.name} {"\u00b7"} {organization.town} {"\u00b7"} {formatUKDate(todayDateStr)}
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

      <div className={`glass-panel ${styles.teacherReminderCard}`}>
        <div>
          <p className={styles.reminderEyebrow}>Daily teacher reminder</p>
          <h2>Check prayers with your students</h2>
        </div>
        <p>
          Admins and teachers should check daily with students about their prayers, encourage them with care, and
          remind them never to miss prayers on purpose.
        </p>
      </div>

      <div className={styles.grid}>
        <div className={styles.sidebar}>
          <div className={`glass-panel ${styles.card}`}>
            <h2 className={styles.cardTitle}>Add Student</h2>
            <p className={styles.helperText}>Add a student when you need the form. Keep the dashboard easy to scan.</p>
            <button
              type="button"
              className={styles.primaryActionBtn}
              onClick={() => {
                setError("");
                setSuccess("");
                setShowAddStudentModal(true);
              }}
            >
              Add Student
            </button>
          </div>

          <div className={`glass-panel ${styles.card}`}>
            <h2 className={styles.cardTitle}>Classes</h2>
            <p className={styles.helperText}>Every student must belong to a class.</p>
            <form className={styles.form} onSubmit={handleCreateClass}>
              <input
                type="text"
                placeholder="Class name"
                className={styles.input}
                value={newClassName}
                onChange={(event) => setNewClassName(event.target.value)}
                required
              />
              <button type="submit" className={styles.submitBtn}>
                Create New Class
              </button>
            </form>
            <div className={styles.classList}>
              {classes.map((studentClass) => {
                const studentCount = classStudentCounts[studentClass.id] ?? 0;
                return (
                  <span key={studentClass.id} className={styles.classChip}>
                    <strong>{studentClass.name}</strong>
                    <small>
                      {studentCount} {studentCount === 1 ? "student" : "students"}
                    </small>
                  </span>
                );
              })}
              {classes.length === 0 && (
                <p className={styles.classEmpty}>
                  Create your first class here, or create it while adding the first student.
                </p>
              )}
            </div>
          </div>

          <div className={`glass-panel ${styles.card}`}>
            <h2 className={styles.cardTitle}>Add Admin</h2>
            <p className={styles.helperText}>Admins can be teachers too.</p>
            <button
              type="button"
              className={styles.primaryActionBtn}
              onClick={() => {
                setError("");
                setSuccess("");
                setShowAddAdminModal(true);
              }}
            >
              Add Admin
            </button>
            <div className={styles.adminList}>
              <p className={styles.listTitle}>Current admins</p>
              {admins.map((admin) => (
                <span key={admin.id} className={styles.adminChip}>
                  <strong>{admin.fullName}</strong>
                </span>
              ))}
              {admins.length === 0 && <p className={styles.classEmpty}>No admins have been added yet.</p>}
            </div>
          </div>

          <div className={`glass-panel ${styles.card}`}>
            <h2 className={styles.cardTitle}>Today&apos;s Prayer Times</h2>
            <p className={styles.helperText}>
              Calculated by AlAdhan. Saved times below are shown to students immediately.
            </p>
            <form className={styles.form} onSubmit={handlePrayerSettingsSubmit}>
              <input
                type="text"
                className={styles.input}
                placeholder="City"
                value={prayerSettings.city}
                onChange={(event) => updatePrayerSetting("city", event.target.value)}
                onBlur={() => void savePrayerSettings()}
                required
              />
              <input
                type="text"
                className={styles.input}
                placeholder="Country, e.g. GB"
                value={prayerSettings.country}
                onChange={(event) => updatePrayerSetting("country", event.target.value)}
                onBlur={() => void savePrayerSettings()}
                required
              />
              <input
                type="text"
                className={styles.input}
                placeholder="Timezone"
                value={prayerSettings.timezone}
                onChange={(event) => updatePrayerSetting("timezone", event.target.value)}
                onBlur={() => void savePrayerSettings()}
                required
              />
              <label className={styles.timeLabel}>
                <span>Method</span>
                <select
                  className={styles.input}
                  value={prayerSettings.method}
                  onChange={(event) => updatePrayerSetting("method", Number(event.target.value), true)}
                >
                  {ALADHAN_METHODS.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.timeLabel}>
                <span>School</span>
                <select
                  className={styles.input}
                  value={prayerSettings.school}
                  onChange={(event) => updatePrayerSetting("school", Number(event.target.value), true)}
                >
                  {ALADHAN_SCHOOLS.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.timeLabel}>
                <span>Latitude</span>
                <select
                  className={styles.input}
                  value={prayerSettings.latitudeAdjustmentMethod}
                  onChange={(event) => updatePrayerSetting("latitudeAdjustmentMethod", Number(event.target.value), true)}
                >
                  {ALADHAN_LATITUDE_ADJUSTMENTS.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={styles.submitBtn} disabled={prayerSettingsLoading}>
                {prayerSettingsLoading ? "Calculating..." : "Calculate Prayer Times"}
              </button>
            </form>
            {prayerTime && (
              <div className={styles.prayerTimesPreview} aria-label="Prayer times shown to students">
                <div className={styles.previewTitle}>Showing to students now</div>
                <div className={styles.previewGrid}>
                  {PRAYERS.map((prayer) => (
                    <span key={prayer}>
                      <strong>{PRAYER_LABELS[prayer]}</strong>
                      {formatPrayerTime(prayerTime[prayer])}
                    </span>
                  ))}
                </div>
              </div>
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
                value={classFilterId}
                onChange={(event) => setClassFilterId(event.target.value)}
              >
                <option value="all">All classes</option>
                {classes.map((studentClass) => (
                  <option key={studentClass.id} value={studentClass.id}>
                    {studentClass.name}
                  </option>
                ))}
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
                      Class {student.class.name} {"\u00b7"} Birthday {formatIsoToUkDate(student.dateOfBirth)}{" "}
                      {"\u00b7"} {student.todayCompleted}/5 today {"\u00b7"}{" "}
                      {student.totalPoints} pts
                    </p>
                  </div>
                  <div className={styles.actionRow}>
                    <Link href={`/m/${mosqueSlug}/admin/student/${student.id}`} className={styles.btnSecondary}>
                      History
                    </Link>
                    <button type="button" onClick={() => startEdit(student)} className={styles.btnSecondary}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteStudentModal(student.id, student.fullName)}
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
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={styles.input}
                        value={editDob}
                        onChange={(event) => handleDobChange(event, setEditDob)}
                        required
                        style={{ paddingRight: '40px' }}
                      />
                      <input
                        type="date"
                        ref={editDateInputRef}
                        onChange={(e) => handleNativeDateChange(e, setEditDob)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          width: '24px',
                          height: '24px',
                          opacity: 0,
                          cursor: 'pointer',
                          zIndex: 2
                        }}
                      />
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          position: 'absolute',
                          right: '12px',
                          width: '20px',
                          height: '20px',
                          color: 'var(--text-secondary)',
                          pointerEvents: 'none',
                          zIndex: 1
                        }}
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    </div>
                    <select
                      className={styles.input}
                      value={editClassId}
                      onChange={(event) => setEditClassId(event.target.value)}
                      required
                    >
                      <option value="">Choose class</option>
                      {classes.map((studentClass) => (
                        <option key={studentClass.id} value={studentClass.id}>
                          {studentClass.name}
                        </option>
                      ))}
                    </select>
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
