"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./HomeProductShowcase.module.css";
import { ALADHAN_LATITUDE_ADJUSTMENTS, ALADHAN_METHODS, ALADHAN_SCHOOLS } from "@/lib/aladhan";
import { formatPrayerTime } from "@/lib/dates";
import { PRAYER_LABELS, PRAYERS, RAKAAT_MAP, type PrayerName } from "@/lib/prayers";

type DemoLocation = "London" | "Luton" | "Birmingham" | "Manchester";

const DEMO_PRAYER_TIMES: Record<DemoLocation, Record<PrayerName, string>> = {
  London: {
    fajr: "02:30",
    dhuhr: "13:08",
    asr: "17:25",
    maghrib: "21:23",
    isha: "23:27",
  },
  Luton: {
    fajr: "02:35",
    dhuhr: "13:12",
    asr: "17:30",
    maghrib: "21:26",
    isha: "23:31",
  },
  Birmingham: {
    fajr: "02:43",
    dhuhr: "13:17",
    asr: "17:36",
    maghrib: "21:29",
    isha: "23:35",
  },
  Manchester: {
    fajr: "02:50",
    dhuhr: "13:20",
    asr: "17:42",
    maghrib: "21:36",
    isha: "23:42",
  },
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

type AdminDemoMode = "all" | "needsReminder";

function getMinutesFromTime(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function addMinutes(value: string, minutes: number): string {
  const dayMinutes = 24 * 60;
  const total = (getMinutesFromTime(value) + minutes + dayMinutes) % dayMinutes;
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function getDemoPrayerTimes(
  location: DemoLocation,
  method: number,
  school: number,
  latitudeAdjustmentMethod: number,
): Record<PrayerName, string> {
  const methodOffset = method === 15 ? -8 : method === 2 ? 10 : method === 1 ? 4 : 0;
  const latitudeOffset = latitudeAdjustmentMethod === 1 ? 14 : latitudeAdjustmentMethod === 2 ? 8 : 0;
  const base = DEMO_PRAYER_TIMES[location];

  return {
    fajr: addMinutes(base.fajr, methodOffset * -1),
    dhuhr: base.dhuhr,
    asr: addMinutes(base.asr, school === 1 ? 55 : 0),
    maghrib: base.maghrib,
    isha: addMinutes(base.isha, latitudeOffset + methodOffset),
  };
}

function getCurrentPrayer(currentMinutes: number | null, prayerTimes: Record<PrayerName, string>): PrayerName {
  if (currentMinutes === null) return "dhuhr";

  let currentPrayer: PrayerName | null = null;
  for (const prayer of PRAYERS) {
    if (getMinutesFromTime(prayerTimes[prayer]) <= currentMinutes) {
      currentPrayer = prayer;
    }
  }

  return currentPrayer ?? "isha";
}

function getCompletedToday(
  currentMinutes: number | null,
  currentPrayer: PrayerName,
  prayerTimes: Record<PrayerName, string>,
): Set<PrayerName> {
  if (currentMinutes === null) return new Set(["fajr"]);
  if (currentPrayer === "isha" && currentMinutes < getMinutesFromTime(prayerTimes.fajr)) {
    return new Set();
  }

  const currentIndex = PRAYERS.indexOf(currentPrayer);
  return new Set(PRAYERS.filter((_, index) => index < currentIndex));
}

export function HomeScrollCue() {
  return (
    <div className={styles.scrollCue} aria-hidden="true">
      <span>See how it works</span>
      <strong>{"\u2193"}</strong>
    </div>
  );
}

export function HomeStartMosqueCta() {
  return (
    <section className={styles.topCtaWrap} aria-label="Start your mosque">
      <div className={styles.topCtaCard}>
        <h2>Ready to track prayers with your students?</h2>
        <p>Create your mosque, add your first admin, and start using Prayer Tracking today.</p>
        <Link href="/create-mosque" className={styles.topCtaButton}>
          Create your mosque
        </Link>
      </div>
    </section>
  );
}

type HomeProductShowcaseProps = {
  currentYear: number;
};

export function HomeProductShowcase({ currentYear }: HomeProductShowcaseProps) {
  const [currentMinutes, setCurrentMinutes] = useState<number | null>(null);
  const [studentToggles, setStudentToggles] = useState<Set<PrayerName>>(new Set());
  const [lastTappedPrayer, setLastTappedPrayer] = useState<PrayerName | null>(null);
  const [adminMode, setAdminMode] = useState<AdminDemoMode>("all");
  const [showPrayerSettings, setShowPrayerSettings] = useState(false);
  const [demoLocation, setDemoLocation] = useState<DemoLocation>("London");
  const [demoMethod, setDemoMethod] = useState(3);
  const [demoSchool, setDemoSchool] = useState(0);
  const [demoLatitude, setDemoLatitude] = useState(3);

  useEffect(() => {
    function syncClock() {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }

    syncClock();
    const interval = window.setInterval(syncClock, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const demoPrayerTimes = useMemo(
    () => getDemoPrayerTimes(demoLocation, demoMethod, demoSchool, demoLatitude),
    [demoLatitude, demoLocation, demoMethod, demoSchool],
  );
  const currentPrayer = useMemo(() => getCurrentPrayer(currentMinutes, demoPrayerTimes), [currentMinutes, demoPrayerTimes]);
  const completedToday = useMemo(
    () => getCompletedToday(currentMinutes, currentPrayer, demoPrayerTimes),
    [currentMinutes, currentPrayer, demoPrayerTimes],
  );
  const demoCompletedToday = useMemo(() => {
    const next = new Set(completedToday);
    for (const prayer of studentToggles) {
      if (next.has(prayer)) {
        next.delete(prayer);
      } else {
        next.add(prayer);
      }
    }
    return next;
  }, [completedToday, studentToggles]);
  const score = 900 + demoCompletedToday.size * 30;
  const filteredAdminStudents = adminMode === "needsReminder"
    ? ADMIN_STUDENTS.filter((student) => student.completed < PRAYERS.length)
    : ADMIN_STUDENTS;

  function toggleDemoPrayer(prayer: PrayerName) {
    setStudentToggles((current) => {
      const next = new Set(current);
      if (next.has(prayer)) {
        next.delete(prayer);
      } else {
        next.add(prayer);
      }
      return next;
    });
    setLastTappedPrayer(prayer);
  }

  return (
    <section className={styles.showcase} aria-label="Prayer Tracking app preview">
      <div className={styles.promiseCard}>
        <p>Prayer Tracking helps mosques and madrasahs keep children consistent with daily salah.</p>
      </div>

      <div className={styles.sectionHeader}>
        <p className={styles.eyebrow}>Product preview</p>
        <h2>Check out the app!</h2>
        <p>A simple daily view for students, and a clear class view for teachers.</p>
        <p className={styles.freeLine}>This app is 100% free.</p>
      </div>

      <article className={styles.previewSection}>
        <div className={styles.previewCopy}>
          <p className={styles.eyebrow}>Student dashboard</p>
          <div className={styles.parentLine}>
            Parents and students can both log in to view progress and keep daily salah on track.
          </div>
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
                <span>Green Lane Masjid{" \u00b7 "}East Ham</span>
              </div>
              <span className={styles.demoPill}>Student</span>
            </div>

            <div className={styles.studentCard}>
              <div className={styles.cardHeading}>
                <span>Today&apos;s prayers</span>
                <small>Live mosque times</small>
              </div>
              <div className={styles.tryPrompt}>
                <strong>{"\u2193"}</strong>
                <span>Try clicking on the prayers below</span>
              </div>

              <div className={styles.prayerGrid}>
                {PRAYERS.map((prayer) => {
                  const isCurrent = currentPrayer === prayer;
                  const isComplete = demoCompletedToday.has(prayer);

                  return (
                    <div key={prayer} className={styles.prayerStack}>
                      <button
                        type="button"
                        className={`${styles.prayerCircle} ${isComplete ? styles.complete : ""} ${
                          isCurrent ? styles.current : ""
                        }`}
                        onClick={() => toggleDemoPrayer(prayer)}
                        aria-pressed={isComplete}
                      >
                        <strong>{PRAYER_LABELS[prayer]}</strong>
                        <span>{RAKAAT_MAP[prayer]}</span>
                      </button>
                      <div className={`${styles.timePill} ${isCurrent ? styles.now : ""}`}>
                        {isCurrent && <small>Now</small>}
                        {formatPrayerTime(demoPrayerTimes[prayer])}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={styles.scoreRow}>
                <span>Lifetime Score</span>
                <strong>{score} pts</strong>
              </div>
              <p className={styles.demoFeedback}>
                {lastTappedPrayer ? `${PRAYER_LABELS[lastTappedPrayer]} changed. ` : ""}
                {demoCompletedToday.size}/5 prayers complete today. Points update instantly.
              </p>
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
              <span>Green Lane Masjid{" \u00b7 "}East Ham</span>
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
              <small>
                {demoLocation}{" \u00b7 "}
                {demoSchool === 1 ? "Hanafi" : "Shafi"}
              </small>
            </div>
            <div className={styles.timeGrid}>
              {PRAYERS.map((prayer) => (
                <span key={prayer}>
                  <strong>{PRAYER_LABELS[prayer]}</strong>
                  {formatPrayerTime(demoPrayerTimes[prayer])}
                </span>
              ))}
            </div>
            <button
              type="button"
              className={styles.changeTimesButton}
              onClick={() => setShowPrayerSettings((current) => !current)}
            >
              Change prayer times calculation
            </button>
            {showPrayerSettings && (
              <div className={styles.prayerSettingsDemo}>
                <label>
                  <span>Location</span>
                  <select value={demoLocation} onChange={(event) => setDemoLocation(event.target.value as DemoLocation)}>
                    {Object.keys(DEMO_PRAYER_TIMES).map((location) => (
                      <option key={location} value={location}>
                        {location}, GB
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Method</span>
                  <select value={demoMethod} onChange={(event) => setDemoMethod(Number(event.target.value))}>
                    {ALADHAN_METHODS.filter((method) => [1, 2, 3, 15].includes(method.id)).map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>School</span>
                  <select value={demoSchool} onChange={(event) => setDemoSchool(Number(event.target.value))}>
                    {ALADHAN_SCHOOLS.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>High latitude</span>
                  <select value={demoLatitude} onChange={(event) => setDemoLatitude(Number(event.target.value))}>
                    {ALADHAN_LATITUDE_ADJUSTMENTS.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          <div className={styles.fakeControls}>
            <button
              type="button"
              className={adminMode === "all" ? styles.activeControl : ""}
              onClick={() => setAdminMode("all")}
            >
              All students
            </button>
            <button
              type="button"
              className={adminMode === "needsReminder" ? styles.activeControl : ""}
              onClick={() => setAdminMode("needsReminder")}
            >
              Needs reminder
            </button>
          </div>
          <div className={styles.adminTryPrompt}>
            <span>Try it: filter the class</span>
            <strong>{"\u2197"}</strong>
          </div>

          <div className={styles.studentRows}>
            {filteredAdminStudents.map((student) => (
              <div key={student.name} className={styles.adminStudent}>
                <div>
                  <strong>{student.name}</strong>
                  <span>
                    {student.completed}/5 today{" \u00b7 "}
                    {student.points} pts
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

      <div className={styles.bottomCta}>
        <p className={styles.eyebrow}>Start your mosque</p>
        <h2>Ready to track prayers with your students?</h2>
        <p>Create your mosque, add your first admin, and start using Prayer Tracking today.</p>
        <Link href="/create-mosque" className={styles.bottomCtaButton}>
          Create your mosque
        </Link>
      </div>

      <footer className={styles.footer}>
        <span>Copyright {currentYear} prayertracking.com</span>
        <Link href="/terms">Terms and Conditions</Link>
      </footer>
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
