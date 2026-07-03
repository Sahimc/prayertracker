"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "@/app/page.module.css";
import type { OrganizationSummary } from "@/lib/types";

type SuggestionReason = "session" | "single" | "recent";

type MosqueChooserProps = {
  initialOrganizations?: OrganizationSummary[];
  suggestedOrganization?: OrganizationSummary | null;
  suggestionReason?: SuggestionReason | null;
};

const SUGGESTION_LABELS: Record<SuggestionReason, string> = {
  session: "You were already signed in here",
  single: "Suggested mosque",
  recent: "Based on your last visit",
};

export function MosqueChooser({
  initialOrganizations,
  suggestedOrganization = null,
  suggestionReason = null,
}: MosqueChooserProps) {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>(initialOrganizations ?? []);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(!initialOrganizations);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialOrganizations) return;

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
  }, [initialOrganizations]);

  const filteredOrganizations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return organizations;

    return organizations.filter((organization) =>
      `${organization.name} ${organization.town}`.toLowerCase().includes(normalizedQuery),
    );
  }, [organizations, query]);

  const listedOrganizations = useMemo(() => {
    if (!suggestedOrganization || query.trim()) return filteredOrganizations;
    return filteredOrganizations.filter((organization) => organization.id !== suggestedOrganization.id);
  }, [filteredOrganizations, query, suggestedOrganization]);

  async function chooseMosque(mosqueSlug: string) {
    try {
      await fetch("/api/preferences/mosque", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mosqueSlug }),
      });
    } finally {
      router.push(`/m/${mosqueSlug}`);
    }
  }

  return (
    <main className={styles.homeContainer}>
      <div className={`glass-panel ${styles.loginCard}`}>
        <div>
          <h1 className={`text-gradient ${styles.title}`}>
            {suggestedOrganization ? "Continue to your mosque" : "Find your mosque"}
          </h1>
          <p className={styles.subtitle}>
            {suggestedOrganization
              ? "Use the mosque below, or search if you need a different one."
              : "Search for your mosque or madrasah to continue."}
          </p>
        </div>

        <div className={styles.form}>
          {suggestedOrganization && suggestionReason && (
            <button
              type="button"
              className={styles.suggestedMosqueCard}
              onClick={() => chooseMosque(suggestedOrganization.slug)}
            >
              <span>{SUGGESTION_LABELS[suggestionReason]}</span>
              <strong>{suggestedOrganization.name}</strong>
              <small>{suggestedOrganization.town}</small>
              <em>Continue</em>
            </button>
          )}

          {(!suggestedOrganization || organizations.length > 1) && (
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="mosque-search">
                {suggestedOrganization ? "Find another mosque" : "Find your mosque"}
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
          )}

          {loading && <p className={styles.muted}>Loading mosques...</p>}
          {error && <p className={styles.error}>{error}</p>}

          {!loading && !error && organizations.length === 0 && (
            <p className={styles.muted}>No mosques have been created yet.</p>
          )}

          {!loading && !error && organizations.length > 0 && filteredOrganizations.length === 0 && (
            <p className={styles.muted}>No mosques match that search.</p>
          )}

          {listedOrganizations.length > 0 && (
            <div className={styles.mosqueList}>
              {listedOrganizations.map((organization) => (
                <button
                  key={organization.id}
                  type="button"
                  className={styles.mosqueItem}
                  onClick={() => chooseMosque(organization.slug)}
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
