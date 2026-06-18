"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "@/app/page.module.css";
import type { OrganizationSummary } from "@/lib/types";

export function MosqueChooser() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOrganizations() {
      try {
        const response = await fetch("/api/organizations");
        const data = (await response.json()) as {
          organizations?: OrganizationSummary[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || "Could not load mosques");
        }

        if (isMounted) {
          setOrganizations(data.organizations || []);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Could not load mosques");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadOrganizations();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredOrganizations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return organizations;

    return organizations.filter((organization) =>
      `${organization.name} ${organization.town}`.toLowerCase().includes(normalizedQuery),
    );
  }, [organizations, query]);

  return (
    <main className={styles.homeContainer}>
      <div className={`glass-panel ${styles.loginCard}`}>
        <div>
          <h1 className={`text-gradient ${styles.title}`}>Find your mosque</h1>
          <p className={styles.subtitle}>Search for your mosque or madrasah to continue.</p>
        </div>

        <div className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="mosque-search">
              Search
            </label>
            <input
              id="mosque-search"
              type="search"
              className={styles.input}
              placeholder="e.g. Green Lane Masjid"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {loading && <p className={styles.muted}>Loading mosques...</p>}
          {error && <p className={styles.error}>{error}</p>}

          {!loading && !error && organizations.length === 0 && (
            <p className={styles.muted}>No mosques have been created yet.</p>
          )}

          {!loading && !error && organizations.length > 0 && filteredOrganizations.length === 0 && (
            <p className={styles.muted}>No mosques match that search.</p>
          )}

          {filteredOrganizations.length > 0 && (
            <div className={styles.mosqueList}>
              {filteredOrganizations.map((organization) => (
                <button
                  key={organization.id}
                  type="button"
                  className={styles.mosqueItem}
                  onClick={() => router.push(`/m/${organization.slug}`)}
                >
                  <span>{organization.name}</span>
                  <small>{organization.town}</small>
                </button>
              ))}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
