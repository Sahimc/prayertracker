"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import styles from "@/app/page.module.css";

type CreateMosqueResponse = {
  organization?: {
    id: string;
    name: string;
    town: string;
    slug: string;
  };
  redirectTo?: string;
  error?: string;
};

type CreatedMosque = {
  name: string;
  town: string;
  slug: string;
  redirectTo: string;
};

export function CreateMosqueForm() {
  const [mosqueName, setMosqueName] = useState("");
  const [town, setTown] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminDob, setAdminDob] = useState("");
  const [error, setError] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [createdMosque, setCreatedMosque] = useState<CreatedMosque | null>(null);
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
    setAdminDob(formatted);
  };

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // YYYY-MM-DD
    if (!val) return;
    const parts = val.split("-");
    if (parts.length === 3) {
      setAdminDob(`${parts[2]}/${parts[1]}/${parts[0]}`);
    }
  };

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
      if (!response.ok || !data.redirectTo || !data.organization) {
        throw new Error(data.error || "Could not create mosque");
      }

      setCreatedMosque({
        name: data.organization.name,
        town: data.organization.town,
        slug: data.organization.slug,
        redirectTo: data.redirectTo,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create mosque");
    } finally {
      setLoading(false);
    }
  }

  async function handleShareMosque() {
    if (!createdMosque) return;

    const mosqueUrl = `https://prayertracking.com/m/${createdMosque.slug}`;
    const shareText = `${createdMosque.name} is now on Prayer Tracking. Use this link to log in.`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${createdMosque.name} on Prayer Tracking`,
          text: shareText,
          url: mosqueUrl,
        });
        setShareStatus("Share sheet opened.");
        return;
      }

      await navigator.clipboard.writeText(mosqueUrl);
      setShareStatus("Unique URL copied.");
    } catch {
      try {
        await navigator.clipboard.writeText(mosqueUrl);
        setShareStatus("Unique URL copied.");
      } catch {
        setShareStatus("Could not copy automatically. Press and hold the URL to copy it.");
      }
    }
  }

  async function handleCopyMosqueUrl() {
    if (!createdMosque) return;

    try {
      await navigator.clipboard.writeText(`https://prayertracking.com/m/${createdMosque.slug}`);
      setShareStatus("Unique URL copied.");
    } catch {
      setShareStatus("Could not copy automatically. Press and hold the URL to copy it.");
    }
  }

  if (createdMosque) {
    const mosqueUrl = `https://prayertracking.com/m/${createdMosque.slug}`;

    return (
      <main className={styles.container}>
        <div className={`glass-panel ${styles.loginCard}`}>
          <div>
            <p className={styles.successEyebrow}>Mosque created</p>
            <h1 className={`text-gradient ${styles.title}`}>{createdMosque.name}</h1>
            <p className={styles.subtitle}>
              {createdMosque.town} now has its own unique Prayer Tracking URL.
            </p>
          </div>

          <div className={styles.uniqueUrlCard}>
            <span>Your unique URL</span>
            <strong>{mosqueUrl}</strong>
            <p>Share this with students, parents, and teachers so they can use the correct mosque page.</p>
          </div>

          <p className={styles.adminLoginNote}>
            Admins can log in later from Admin Login on this mosque page.
            <Link href={`/m/${createdMosque.slug}/admin`}> Open admin login</Link>
          </p>

          <div className={styles.shareActions}>
            <button type="button" className={styles.submitBtn} onClick={handleShareMosque}>
              Share URL
            </button>
            <button
              type="button"
              className={styles.copyBtn}
              onClick={handleCopyMosqueUrl}
            >
              Copy link
            </button>
          </div>

          {shareStatus && <p className={styles.success}>{shareStatus}</p>}

          <Link href={createdMosque.redirectTo} className={styles.submitBtn}>
            Go to your admin dashboard
          </Link>

          <Link href="/" className={styles.secondaryLink}>
            Back to find your mosque
          </Link>
        </div>
      </main>
    );
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
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="admin-dob"
                type="text"
                inputMode="numeric"
                className={styles.input}
                placeholder="DD/MM/YYYY"
                value={adminDob}
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
            {loading ? "Creating..." : "Create mosque"}
          </button>
        </form>

        <Link href="/" className={styles.secondaryLink}>
          Back to find your mosque
        </Link>
      </div>
    </main>
  );
}
