"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./HomeProductShowcase.module.css";
import { formatPrayerTime } from "@/lib/dates";
import { PRAYER_LABELS, PRAYERS, RAKAAT_MAP, type PrayerName } from "@/lib/prayers";

const DEMO_PRAYER_TIMES: Record<PrayerName, string> = {
  fajr: "02:30",
  dhuhr: "13:08",
  asr: "17:25",
  maghrib: "21:23",
  isha: "23:27",
};

const STUDENT_CALLOUTS = ["Live current prayer", "Mosque prayer times", "30 points per prayer", "Weekly progress"];
const ADMIN_CALLOUTS = [
  "Daily class check-ins",
  "Student completion filters",
  "Prayer times shown to students",
  "Admins can add teachers",
];

const WEEK_PREVIEW = [
  { day: "Mon", label: "5/5", tone: "complete" },
  { day: "Tue", label: "4/5", tone: "missed" },
  { day: "Wed", label: "5/5", tone: "complete" },
  { day: "Thu", label: "3/5", tone: "missed" },
  { day: "Fri", label: "Today", tone: "today" },
  { day: "Sat", label: "Soon", tone: "future" },
  { day: "Sun", label: "Soon", tone: "future" },
] as const;

const ADMIN_STUDENTS = [
  { name: "Abdullah", completed: 4, points: 960, status: [true, true, true, true, false] },
  { name: "Maryam", completed: 5, points: 1230, status: [true, true, true, true, true] },
  { name: "Yusuf", completed: 5, points: 1110, status: [true, true, true, true, true] },
] as const;

function getMinutesFromTime(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function getCurrentPrayer(currentMinutes: number | null): PrayerName {
  if (currentMinutes === null) return "dhuhr";

  let currentPrayer: PrayerName | null = null;
  for (const prayer of PRAYERS) {
    if (getMinutesFromTime(DEMO_PRAYER_TIMES[prayer]) <= currentMinutes) {
      currentPrayer = prayer;
    }
  }

  return currentPrayer ?? "isha";
}

function getCompletedToday(currentMinutes: number | null, currentPrayer: PrayerName): Set<PrayerName> {
  if (currentMinutes === null) return new Set(["fajr"]);
  if (currentPrayer === "isha" && currentMinutes < getMinutesFromTime(DEMO_PRAYER_TIMES.fajr)) {
    return new Set();
  }

  const currentIndex = PRAYERS.indexOf(currentPrayer);
  return new Set(PRAYERS.filter((_, index) => index < currentIndex));
}

export function HomeProductShowcase() {
  const [currentMinutes, setCurrentMinutes] = useState<number | null>(null);

  useEffect(() => {
    function syncClock() {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }

    syncClock();
    const interval = window.setInterval(syncClock, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const currentPrayer = useMemo(() => getCurrentPrayer(currentMinutes), [currentMinutes]);
  const completedToday = useMemo(() => getCompletedToday(currentMinutes, currentPrayer), [currentMinutes, currentPrayer]);
  const score = 900 + completedToday.size * 30;

  return (
    <section className={styles.showcase} aria-label="Prayer Tracking app preview">
      <div className={styles.promiseCard}>
        <p>Prayer Tracking helps mosques and madrasahs keep children consistent with daily salah.</p>
      </div>

      <div className={styles.sectionHeader}>
        <p className={styles.eyebrow}>Product preview</p>
        <h2>Check out the app!</h2>
        <p>A simple daily view for students, and a clear class view for teachers.</p>
      </div>

      <article className={styles.previewSection}>
        <div className={styles.previewCopy}>
          <p className={styles.eyebrow}>Student dashboard</p>
          <h3>Children know what to pray now and what they have completed.</h3>
          <p>
            A friendly daily dashboard shows prayer times, progress, points, and missed prayers without making the
            child search through settings.
          </p>
          <FeatureList items={STUDENT_CALLOUTS} />
        </div>

        <div className={styles.phoneFrame} aria-label="Student dashboard preview">
          <div className={styles.phoneScreen}>
            <div className={styles.previewTopBar}>
              <div>
                <h4>Salaam, Abdullah</h4>
                <span>Green Lane Masjid · East Ham</span>
              </div>
              <span className={styles.demoPill}>Student</span>
            </div>

            <div className={styles.studentCard}>
              <div className={styles.cardHeading}>
                <span>Today&apos;s prayers</span>
                <small>Live mosque times</small>
              </div>

              <div className={styles.prayerGrid}>
                {PRAYERS.map((prayer) => {
                  const isCurrent = currentPrayer === prayer;
                  const isComplete = completedToday.has(prayer);

                  return (
                    <div key={prayer} className={styles.prayerStack}>
                      <div
                        className={`${styles.prayerCircle} ${isComplete ? styles.complete : ""} ${
                          isCurrent ? styles.current : ""
                        }`}
                      >
                        <strong>{PRAYER_LABELS[prayer]}</strong>
                        <span>{RAKAAT_MAP[prayer]}</span>
                      </div>
                      <div className={`${styles.timePill} ${isCurrent ? styles.now : ""}`}>
                        {isCurrent && <small>Now</small>}
                        {formatPrayerTime(DEMO_PRAYER_TIMES[prayer])}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={styles.scoreRow}>
                <span>Lifetime Score</span>
                <strong>{score} pts</strong>
              </div>
            </div>

            <div className={styles.weekPreview}>
              <div className={styles.cardHeading}>
                <span>This week</span>
                <small>Missed prayers stay visible</small>
              </div>
              <div className={styles.weekStrip}>
                {WEEK_PREVIEW.map((day) => (
                  <div key={day.day} className={`${styles.weekDay} ${styles[day.tone]}`}>
                    <strong>{day.day}</strong>
                    <span>{day.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </article>

      <article className={`${styles.previewSection} ${styles.adminSection}`}>
        <div className={styles.previewCopy}>
          <p className={styles.eyebrow}>Admin dashboard</p>
          <h3>Teachers see the class clearly and know who needs a reminder.</h3>
          <p>
            Admins can check daily completion, manage students and teachers, and set mosque prayer times that students
            see immediately.
          </p>
          <FeatureList items={ADMIN_CALLOUTS} />
        </div>

        <div className={styles.adminFrame} aria-label="Admin dashboard preview">
          <div className={styles.adminHeader}>
            <div>
              <h4>Admin Dashboard</h4>
              <span>Green Lane Masjid · East Ham</span>
            </div>
            <span className={styles.demoPill}>Aisha</span>
          </div>

          <div className={styles.adminStats}>
            <Metric value="3" label="Students" />
            <Metric value="3" label="Active today" />
            <Metric value="14" label="Prayers today" />
            <Metric value="93%" label="Average" />
          </div>

          <div className={styles.teacherReminder}>
            <strong>Daily teacher reminder</strong>
            <span>Check in kindly and encourage students never to miss prayers on purpose.</span>
          </div>

          <div className={styles.adminTimes}>
            <div className={styles.cardHeading}>
              <span>Prayer times shown to students</span>
              <small>London · Shafi</small>
            </div>
            <div className={styles.timeGrid}>
              {PRAYERS.map((prayer) => (
                <span key={prayer}>
                  <strong>{PRAYER_LABELS[prayer]}</strong>
                  {formatPrayerTime(DEMO_PRAYER_TIMES[prayer])}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.fakeControls}>
            <span>Search students</span>
            <span>Incomplete today</span>
          </div>

          <div className={styles.studentRows}>
            {ADMIN_STUDENTS.map((student) => (
              <div key={student.name} className={styles.adminStudent}>
                <div>
                  <strong>{student.name}</strong>
                  <span>
                    {student.completed}/5 today · {student.points} pts
                  </span>
                </div>
                <div className={styles.statusDots}>
                  {student.status.map((done, index) => (
                    <span
                      key={`${student.name}-${PRAYERS[index]}`}
                      className={done ? styles.doneDot : styles.missedDot}
                      title={PRAYER_LABELS[PRAYERS[index]]}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.teacherAccess}>
            <strong>Add Admin</strong>
            <span>Admins can be teachers too.</span>
          </div>
        </div>
      </article>
    </section>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <div className={styles.featureList}>
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.metric}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
