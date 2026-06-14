"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "@/app/page.module.css";
import type { OrganizationSummary } from "@/lib/types";

type LoginResponse = {
  redirectTo?: string;
  error?: string;
};

type AdminLoginFormProps = {
  organization: OrganizationSummary;
};

export function AdminLoginForm({ organization }: AdminLoginFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/admin-login", {
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
          <h1 className={`text-gradient ${styles.title}`}>Admin Login</h1>
          <p className={styles.mosqueTitle}>{organization.name}</p>
          <p className={styles.subtitle}>{organization.town}</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="admin-name">
              Admin Name
            </label>
            <input
              id="admin-name"
              type="text"
              className={styles.input}
              placeholder="e.g. Aisha"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="admin-dob">
              Date of Birth
            </label>
            <input
              id="admin-dob"
              type="text"
              inputMode="numeric"
              className={styles.input}
              placeholder="DD/MM/YYYY"
              value={dob}
              onChange={(event) => setDob(event.target.value)}
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className={styles.linkStack}>
          <Link href={`/m/${organization.slug}`} className={styles.secondaryLink}>
            Student login
          </Link>
          <Link href="/create-mosque" className={styles.secondaryLink}>
            Create your mosque
          </Link>
        </div>
      </div>
    </main>
  );
}
