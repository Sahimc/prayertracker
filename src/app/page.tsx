"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function Login() {
  const [mode, setMode] = useState<"student" | "admin">("student");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Clear existing session on login page load
  useEffect(() => {
    localStorage.removeItem("studentId");
    localStorage.removeItem("isAdmin");
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "student" 
            ? { mode, fullName, dob } 
            : { mode, username, password }
        ),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (mode === "admin") {
        localStorage.setItem("isAdmin", "true");
        router.push("/admin");
      } else {
        localStorage.setItem("studentId", data.studentId);
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <div className={`glass-panel ${styles.loginCard}`}>
        <div>
          <h1 className={`text-gradient ${styles.title}`}>Prayer Tracker</h1>
          <p className={styles.subtitle}>Welcome back! Please log in.</p>
        </div>

        <div className={styles.toggleContainer}>
          <button
            className={`${styles.toggleBtn} ${mode === "student" ? styles.active : ""}`}
            onClick={() => { setMode("student"); setError(""); }}
            type="button"
          >
            Student
          </button>
          <button
            className={`${styles.toggleBtn} ${mode === "admin" ? styles.active : ""}`}
            onClick={() => { setMode("admin"); setError(""); }}
            type="button"
          >
            Admin
          </button>
        </div>

        <form className={styles.form} onSubmit={handleLogin}>
          {mode === "student" ? (
            <>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Full Name</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Date of Birth</label>
                <input
                  type="date"
                  className={styles.input}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Username</label>
                <input
                  type="text"
                  className={styles.input}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Password</label>
                <input
                  type="password"
                  className={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}
