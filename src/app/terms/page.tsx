import Link from "next/link";
import styles from "./page.module.css";

export const metadata = {
  title: "Terms and Conditions | Prayer Tracking",
  description: "Terms and Conditions for using Prayer Tracking.",
};

const TERMS_SECTIONS = [
  {
    title: "Who the app is for",
    body: "Prayer Tracking is designed for mosques, madrasahs, teachers, parents, guardians, and students to record and review daily prayer progress.",
  },
  {
    title: "Accounts and access",
    body: "Admins are responsible for adding students, admins, and prayer settings for their mosque. Students, parents, or guardians may use the student login details provided by the mosque to view and update prayer progress.",
  },
  {
    title: "Accurate information",
    body: "Users should enter accurate names, dates of birth, prayer records, and mosque details. Admins should only add people they are authorised to manage.",
  },
  {
    title: "Children and permission",
    body: "Where children use the app, the mosque, parent, guardian, or responsible adult must make sure appropriate permission and supervision is in place.",
  },
  {
    title: "Prayer records",
    body: "Prayer records are provided to support consistency and encouragement. Users remain responsible for their own religious practice and should speak to qualified teachers or scholars for religious guidance.",
  },
  {
    title: "Prayer times",
    body: "Prayer times may be calculated from selected methods, schools, locations, and third-party data. Users should check that the chosen calculation settings match their mosque or local practice.",
  },
  {
    title: "Acceptable use",
    body: "Do not misuse the app, attempt to access another mosque's data, enter false or harmful information, disrupt the service, or use the app for unlawful purposes.",
  },
  {
    title: "Availability and changes",
    body: "The app may change, pause, or stop features from time to time. We will try to keep the service useful and reliable, but we cannot promise uninterrupted access.",
  },
  {
    title: "Data responsibility",
    body: "Mosque admins are responsible for checking that the information they add is appropriate, necessary, and kept up to date. If information is wrong, admins should correct or remove it.",
  },
  {
    title: "Updates to these terms",
    body: "These Terms and Conditions may be updated as the app develops. Continued use of the app after changes means the updated terms are accepted.",
  },
];

export default function TermsPage() {
  return (
    <main className={styles.container}>
      <section className={`glass-panel ${styles.card}`}>
        <Link href="/" className={styles.backLink}>
          Back to Prayer Tracking
        </Link>
        <p className={styles.eyebrow}>Prayer Tracking</p>
        <h1>Terms and Conditions</h1>
        <p className={styles.acceptance}>
          Anyone using this app is accepting these Terms of Use and Conditions. If you do not agree, you should stop
          using the app immediately.
        </p>
        <p className={styles.updated}>Last updated: 18 June 2026</p>

        <div className={styles.sections}>
          {TERMS_SECTIONS.map((section) => (
            <section key={section.title} className={styles.termSection}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
