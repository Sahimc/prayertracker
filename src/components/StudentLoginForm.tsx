"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import styles from "@/app/page.module.css";
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
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 8) val = val.slice(0, 8);
    let formatted = val;
    if (val.length >= 5) {
      formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
    } else if (val.length >= 3) {
      formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setDob(formatted);
  };

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const parts = val.split("-");
    if (parts.length === 3) {
      setDob(`${parts[2]}/${parts[1]}/${parts[0]}`);
    }
  };

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
          dob,
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
              First Name
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
            <label className={styles.label} htmlFor="student-dob">
              Date of Birth
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="student-dob"
                type="text"
                inputMode="numeric"
                className={styles.input}
                placeholder="DD/MM/YYYY"
                value={dob}
                onChange={handleDobChange}
                required
                style={{ paddingRight: '40px' }}
              />
              <input
                type="date"
                ref={dateInputRef}
                onChange={handleNativeDateChange}
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
