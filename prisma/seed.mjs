import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

function normalizeName(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function logFor(student, date, completePrayers) {
  return {
    organizationId: student.organizationId,
    studentId: student.id,
    date,
    fajr: completePrayers.includes("fajr"),
    dhuhr: completePrayers.includes("dhuhr"),
    asr: completePrayers.includes("asr"),
    maghrib: completePrayers.includes("maghrib"),
    isha: completePrayers.includes("isha"),
  };
}

async function createOrganization({ name, town, slug, admin, students, prayerTimes }) {
  const organization = await prisma.organization.create({
    data: { name, town, slug },
  });

  await prisma.admin.create({
    data: {
      organizationId: organization.id,
      fullName: admin.fullName,
      normalizedName: normalizeName(admin.fullName),
      dateOfBirth: admin.dateOfBirth,
    },
  });

  const createdStudents = [];
  for (const student of students) {
    const created = await prisma.student.create({
      data: {
        organizationId: organization.id,
        fullName: student.fullName,
        normalizedName: normalizeName(student.fullName),
        dateOfBirth: student.dateOfBirth,
      },
    });
    createdStudents.push(created);
  }

  await prisma.prayerTime.create({
    data: {
      organizationId: organization.id,
      date: prayerTimes.date,
      fajr: prayerTimes.fajr,
      dhuhr: prayerTimes.dhuhr,
      asr: prayerTimes.asr,
      maghrib: prayerTimes.maghrib,
      isha: prayerTimes.isha,
    },
  });

  return { organization, students: createdStudents };
}

async function main() {
  await prisma.prayerLog.deleteMany();
  await prisma.prayerTime.deleteMany();
  await prisma.student.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.organization.deleteMany();

  const today = new Date();
  const todayIso = formatDate(today);
  const yesterdayIso = formatDate(addDays(today, -1));

  const greenLane = await createOrganization({
    name: "Green Lane Masjid",
    town: "East Ham",
    slug: "green-lane-masjid",
    admin: { fullName: "Aisha", dateOfBirth: "1990-02-01" },
    students: [
      { fullName: "Abdullah", dateOfBirth: "2020-02-01" },
      { fullName: "Maryam", dateOfBirth: "2019-05-15" },
      { fullName: "Yusuf", dateOfBirth: "2018-08-22" },
    ],
    prayerTimes: {
      date: todayIso,
      fajr: "05:12",
      dhuhr: "13:08",
      asr: "17:42",
      maghrib: "21:18",
      isha: "22:35",
    },
  });

  const masjidUmar = await createOrganization({
    name: "Masjid Umar",
    town: "Luton",
    slug: "masjid-umar",
    admin: { fullName: "Omar", dateOfBirth: "1988-06-05" },
    students: [
      { fullName: "Abdullah", dateOfBirth: "2020-02-01" },
      { fullName: "Safiya", dateOfBirth: "2019-11-09" },
      { fullName: "Ibrahim", dateOfBirth: "2018-03-17" },
    ],
    prayerTimes: {
      date: todayIso,
      fajr: "05:05",
      dhuhr: "13:04",
      asr: "17:36",
      maghrib: "21:11",
      isha: "22:28",
    },
  });

  await prisma.prayerLog.createMany({
    data: [
      logFor(greenLane.students[0], todayIso, ["fajr", "dhuhr", "asr"]),
      logFor(greenLane.students[0], yesterdayIso, prayers),
      logFor(greenLane.students[1], todayIso, ["fajr", "dhuhr"]),
      logFor(greenLane.students[2], todayIso, ["fajr", "dhuhr", "asr", "maghrib"]),
      logFor(masjidUmar.students[0], todayIso, ["fajr"]),
      logFor(masjidUmar.students[1], todayIso, ["fajr", "dhuhr", "asr", "maghrib", "isha"]),
      logFor(masjidUmar.students[2], yesterdayIso, ["dhuhr", "asr"]),
    ],
  });

  console.log("Seeded organizations:");
  console.log("- Green Lane Masjid (East Ham), admin Aisha, DOB 01/02/1990");
  console.log("- Masjid Umar (Luton), admin Omar, DOB 05/06/1988");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
