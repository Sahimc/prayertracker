"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "@/app/page.module.css";

type CreateMosqueResponse = {
  redirectTo?: string;
  error?: string;
};

export function CreateMosqueForm() {
  const router = useRouter();
  const [mosqueName, setMosqueName] = useState("");
  const [town, setTown] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminDob, setAdminDob] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mosqueName, town, adminName, adminDob }),
      });

      const data = (await response.json()) as CreateMosqueResponse;
      if (!response.ok || !data.redirectTo) {
        throw new Error(data.error || "Could not create mosque");
      }

      router.push(data.redirectTo);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create mosque");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.container}>
      <div className={`glass-panel ${styles.loginCard}`}>
        <div>
          <h1 className={`text-gradient ${styles.title}`}>Create your mosque</h1>
          <p className={styles.subtitle}>Add your mosque and first admin in one simple step.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="mosque-name">
              Mosque name
            </label>
            <input
              id="mosque-name"
              type="text"
              className={styles.input}
              placeholder="Green Lane Masjid"
              value={mosqueName}
              onChange={(event) => setMosqueName(event.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="town">
              Town
            </label>
            <input
              id="town"
              type="text"
              className={styles.input}
              placeholder="East Ham"
              value={town}
              onChange={(event) => setTown(event.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="admin-name">
              First admin name
            </label>
            <input
              id="admin-name"
              type="text"
              className={styles.input}
              placeholder="Aisha"
              value={adminName}
              onChange={(event) => setAdminName(event.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="admin-dob">
              First admin date of birth
            </label>
            <input
              id="admin-dob"
              type="text"
              inputMode="numeric"
              className={styles.input}
              placeholder="DD/MM/YYYY"
              value={adminDob}
              onChange={(event) => setAdminDob(event.target.value)}
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Creating..." : "Create mosque"}
          </button>
        </form>

        <Link href="/" className={styles.secondaryLink}>
          Back to mosque chooser
        </Link>
      </div>
    </main>
  );
}
