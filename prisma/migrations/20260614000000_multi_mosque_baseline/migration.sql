-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "dateOfBirth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "dateOfBirth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrayerLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "fajr" BOOLEAN NOT NULL DEFAULT false,
    "dhuhr" BOOLEAN NOT NULL DEFAULT false,
    "asr" BOOLEAN NOT NULL DEFAULT false,
    "maghrib" BOOLEAN NOT NULL DEFAULT false,
    "isha" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrayerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrayerTime" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "fajr" TEXT NOT NULL,
    "dhuhr" TEXT NOT NULL,
    "asr" TEXT NOT NULL,
    "maghrib" TEXT NOT NULL,
    "isha" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrayerTime_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Admin_organizationId_idx" ON "Admin"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_organizationId_normalizedName_dateOfBirth_key" ON "Admin"("organizationId", "normalizedName", "dateOfBirth");

-- CreateIndex
CREATE INDEX "Student_organizationId_idx" ON "Student"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_organizationId_normalizedName_dateOfBirth_key" ON "Student"("organizationId", "normalizedName", "dateOfBirth");

-- CreateIndex
CREATE INDEX "PrayerLog_organizationId_date_idx" ON "PrayerLog"("organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PrayerLog_studentId_date_key" ON "PrayerLog"("studentId", "date");

-- CreateIndex
CREATE INDEX "PrayerTime_organizationId_idx" ON "PrayerTime"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PrayerTime_organizationId_date_key" ON "PrayerTime"("organizationId", "date");

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerLog" ADD CONSTRAINT "PrayerLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerLog" ADD CONSTRAINT "PrayerLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerTime" ADD CONSTRAINT "PrayerTime_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
