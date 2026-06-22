"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import styles from "@/app/page.module.css";
import { BIRTH_MONTHS, getBirthYearOptions } from "@/lib/birthdays";
import type { OrganizationSummary } from "@/lib/types";

type LoginResponse = {
  redirectTo?: string;
  error?: string;
};

type StudentLoginFormProps = {
  organization: OrganizationSummary;
};

export function StudentLoginForm({ organization }: StudentLoginFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const birthYears = useMemo(() => getBirthYearOptions(), []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/student-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mosqueSlug: organization.slug,
          fullName,
          birthMonth,
          birthYear,
        }),
      });

      const data = (await response.json()) as LoginResponse;
      if (!response.ok || !data.redirectTo) {
        throw new Error(data.error || "Login failed");
      }

      router.push(data.redirectTo);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.container}>
      <div className={`glass-panel ${styles.loginCard}`}>
        <div>
          <h1 className={`text-gradient ${styles.title}`}>Prayer Tracking</h1>
          <p className={styles.mosqueTitle}>{organization.name}</p>
          <p className={styles.subtitle}>{organization.town}</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="student-name">
              Student First Name
            </label>
            <input
              id="student-name"
              type="text"
              className={styles.input}
              placeholder="e.g. Abdullah"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="student-birth-month">
              Birthday
            </label>
            <div className={styles.birthdayGrid}>
              <select
                id="student-birth-month"
                className={styles.input}
                value={birthMonth}
                onChange={(event) => setBirthMonth(event.target.value)}
                required
              >
                <option value="">Month</option>
                {BIRTH_MONTHS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <select
                id="student-birth-year"
                className={styles.input}
                value={birthYear}
                onChange={(event) => setBirthYear(event.target.value)}
                required
              >
                <option value="">Year</option>
                {birthYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className={styles.linkStack}>
          <Link href={`/m/${organization.slug}/admin`} className={styles.secondaryLink}>
            Admin login
          </Link>
        </div>
      </div>
    </main>
  );
}
