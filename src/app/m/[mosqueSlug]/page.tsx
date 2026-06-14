import Link from "next/link";
import { StudentLoginForm } from "@/components/StudentLoginForm";
import { prisma } from "@/lib/prisma";
import styles from "@/app/page.module.css";

export const dynamic = "force-dynamic";

type MosquePageProps = {
  params: Promise<{ mosqueSlug: string }>;
};

export default async function MosqueStudentLoginPage({ params }: MosquePageProps) {
  const { mosqueSlug } = await params;
  const organization = await prisma.organization.findUnique({
    where: { slug: mosqueSlug },
    select: {
      id: true,
      name: true,
      town: true,
      slug: true,
    },
  });

  if (!organization) {
    return (
      <main className={styles.container}>
        <div className={`glass-panel ${styles.loginCard}`}>
          <h1 className={`text-gradient ${styles.title}`}>Mosque not found</h1>
          <p className={styles.subtitle}>We could not find a mosque with this link.</p>
          <Link href="/" className={styles.submitBtn}>
            Choose your mosque
          </Link>
        </div>
      </main>
    );
  }

  return <StudentLoginForm organization={organization} />;
}
