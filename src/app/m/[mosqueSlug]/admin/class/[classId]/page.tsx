import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminClassDetailClient } from "@/components/AdminClassDetailClient";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import styles from "@/app/page.module.css";

export const dynamic = "force-dynamic";

type AdminClassDetailPageProps = {
  params: Promise<{ mosqueSlug: string; classId: string }>;
};

export default async function AdminClassDetailPage({ params }: AdminClassDetailPageProps) {
  const { mosqueSlug, classId } = await params;
  const organization = await prisma.organization.findUnique({
    where: { slug: mosqueSlug },
    select: { id: true, name: true, town: true, slug: true },
  });

  if (!organization) {
    return (
      <main className={styles.container}>
        <div className={`glass-panel ${styles.loginCard}`}>
          <h1 className={`text-gradient ${styles.title}`}>Mosque not found</h1>
          <p className={styles.subtitle}>We could not find a mosque with this admin link.</p>
          <Link href="/" className={styles.submitBtn}>
            Choose your mosque
          </Link>
        </div>
      </main>
    );
  }

  const session = await getSession();
  if (!session || session.role !== "admin" || session.organizationId !== organization.id || session.mosqueSlug !== mosqueSlug) {
    redirect(`/m/${mosqueSlug}/admin`);
  }

  const studentClass = await prisma.class.findFirst({
    where: {
      id: classId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      organizationId: true,
      name: true,
      students: {
        select: {
          id: true,
          organizationId: true,
          classId: true,
          fullName: true,
          birthMonth: true,
          birthYear: true,
          createdAt: true,
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
        orderBy: { fullName: "asc" },
      },
    },
  });

  if (!studentClass) {
    redirect(`/m/${mosqueSlug}/admin/dashboard`);
  }

  const classSummary = {
    id: studentClass.id,
    organizationId: studentClass.organizationId,
    name: studentClass.name,
  };

  const students = studentClass.students.map((student) => ({
    ...student,
    class: classSummary,
  }));

  return (
    <AdminClassDetailClient
      organization={organization}
      studentClass={classSummary}
      initialStudents={students}
      mosqueSlug={mosqueSlug}
    />
  );
}
