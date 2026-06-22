import { getDateRange, getIsoFromDateTime, getTodayIso } from "./dates";
import { prisma } from "./prisma";

type StudentHistorySeed = {
  id: string;
  organizationId: string;
  createdAt: Date | string;
};

export async function ensurePrayerLogsThroughToday(student: StudentHistorySeed): Promise<void> {
  const startDate = getIsoFromDateTime(student.createdAt);
  const today = getTodayIso();
  const dates = getDateRange(startDate, today);
  if (dates.length === 0) return;

  const existingLogs = await prisma.prayerLog.findMany({
    where: {
      studentId: student.id,
      date: { in: dates },
    },
    select: { date: true },
  });

  const existingDates = new Set(existingLogs.map((log) => log.date));
  const missingDates = dates.filter((date) => !existingDates.has(date));
  if (missingDates.length === 0) return;

  await prisma.prayerLog.createMany({
    data: missingDates.map((date) => ({
      organizationId: student.organizationId,
      studentId: student.id,
      date,
    })),
    skipDuplicates: true,
  });
}

export async function ensurePrayerLogsForStudents(students: StudentHistorySeed[]): Promise<void> {
  for (const student of students) {
    await ensurePrayerLogsThroughToday(student);
  }
}
