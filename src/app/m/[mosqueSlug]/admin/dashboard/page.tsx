import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";
import { getTodayIso } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import styles from "@/app/page.module.css";

export const dynamic = "force-dynamic";

type AdminDashboardPageProps = {
  params: Promise<{ mosqueSlug: string }>;
};

export default async function AdminDashboardPage({ params }: AdminDashboardPageProps) {
  const { mosqueSlug } = await params;
  const organization = await prisma.organization.findUnique({
    where: { slug: mosqueSlug },
    select: {
      id: true,
      name: true,
      town: true,
      slug: true,
      prayerCity: true,
      prayerCountry: true,
      prayerTimezone: true,
      prayerCalculationMethod: true,
      prayerSchool: true,
      prayerLatitudeAdjustmentMethod: true,
    },
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

  const [students, admins, classes, prayerTime] = await Promise.all([
    prisma.student.findMany({
      where: { organizationId: organization.id },
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
      orderBy: { fullName: "asc" },
    }),
    prisma.admin.findMany({
      where: { organizationId: organization.id },
      select: {
        id: true,
        organizationId: true,
        fullName: true,
        dateOfBirth: true,
      },
      orderBy: { fullName: "asc" },
    }),
    prisma.class.findMany({
      where: { organizationId: organization.id },
      select: {
        id: true,
        organizationId: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.prayerTime.findUnique({
      where: {
        organizationId_date: {
          organizationId: organization.id,
          date: getTodayIso(),
        },
      },
      select: {
        id: true,
        organizationId: true,
        date: true,
        fajr: true,
        dhuhr: true,
        asr: true,
        maghrib: true,
        isha: true,
      },
    }),
  ]);

  return (
    <AdminDashboardClient
      organization={organization}
      initialPrayerSettings={{
        city: organization.prayerCity,
        country: organization.prayerCountry,
        timezone: organization.prayerTimezone,
        method: organization.prayerCalculationMethod,
        school: organization.prayerSchool,
        latitudeAdjustmentMethod: organization.prayerLatitudeAdjustmentMethod,
      }}
      initialStudents={students}
      initialAdmins={admins}
      initialClasses={classes}
      initialPrayerTime={prayerTime}
      mosqueSlug={mosqueSlug}
    />
  );
}
