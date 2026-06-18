-- Existing student records are intentionally removed because every student must
-- now belong to a class. Organizations, admins, prayer times, and settings are kept.
DELETE FROM "PrayerLog";
DELETE FROM "Student";

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "classId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Class_organizationId_idx" ON "Class"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Class_organizationId_normalizedName_key" ON "Class"("organizationId", "normalizedName");

-- CreateIndex
CREATE INDEX "Student_organizationId_classId_idx" ON "Student"("organizationId", "classId");

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
