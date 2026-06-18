import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentHistoryClient } from "@/components/StudentHistoryClient";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import styles from "@/app/page.module.css";

export const dynamic = "force-dynamic";

type StudentHistoryPageProps = {
  params: Promise<{ mosqueSlug: string }>;
};

export default async function StudentHistoryPage({ params }: StudentHistoryPageProps) {
  const { mosqueSlug } = await params;
  const organization = await prisma.organization.findUnique({
    where: { slug: mosqueSlug },
    select: { id: true, name: true, town: true, slug: true },
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

  const session = await getSession();
  if (!session || session.role !== "student" || session.organizationId !== organization.id || session.mosqueSlug !== mosqueSlug) {
    redirect(`/m/${mosqueSlug}`);
  }

  const student = await prisma.student.findFirst({
    where: {
      id: session.studentId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      organizationId: true,
      classId: true,
      fullName: true,
      dateOfBirth: true,
      class: {
        select: {
          id: true,
          organizationId: true,
          name: true,
        },
      },
      prayers: {
        select: {
          id: true,
          organizationId: true,
          studentId: true,
          date: true,
          fajr: true,
          dhuhr: true,
          asr: true,
          maghrib: true,
          isha: true,
        },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!student) {
    redirect(`/m/${mosqueSlug}`);
  }

  return <StudentHistoryClient organization={organization} student={student} mosqueSlug={mosqueSlug} />;
}
