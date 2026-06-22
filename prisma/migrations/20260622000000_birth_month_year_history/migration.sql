-- Add month/year birthday identity fields.
-- Keep the legacy dateOfBirth columns physically present during rollout so the
-- current production deployment keeps working until the new deployment is live.

ALTER TABLE "Admin" ADD COLUMN "birthMonth" INTEGER;
ALTER TABLE "Admin" ADD COLUMN "birthYear" INTEGER;

UPDATE "Admin"
SET
  "birthMonth" = CAST(SUBSTRING("dateOfBirth" FROM 6 FOR 2) AS INTEGER),
  "birthYear" = CAST(SUBSTRING("dateOfBirth" FROM 1 FOR 4) AS INTEGER)
WHERE "dateOfBirth" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';

ALTER TABLE "Admin" ALTER COLUMN "birthMonth" SET NOT NULL;
ALTER TABLE "Admin" ALTER COLUMN "birthYear" SET NOT NULL;

ALTER TABLE "Student" ADD COLUMN "birthMonth" INTEGER;
ALTER TABLE "Student" ADD COLUMN "birthYear" INTEGER;

UPDATE "Student"
SET
  "birthMonth" = CAST(SUBSTRING("dateOfBirth" FROM 6 FOR 2) AS INTEGER),
  "birthYear" = CAST(SUBSTRING("dateOfBirth" FROM 1 FOR 4) AS INTEGER)
WHERE "dateOfBirth" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';

ALTER TABLE "Student" ALTER COLUMN "birthMonth" SET NOT NULL;
ALTER TABLE "Student" ALTER COLUMN "birthYear" SET NOT NULL;

DROP INDEX "Admin_organizationId_normalizedName_dateOfBirth_key";
DROP INDEX "Student_organizationId_normalizedName_dateOfBirth_key";

CREATE UNIQUE INDEX "Admin_organizationId_normalizedName_birthMonth_birthYear_key"
  ON "Admin"("organizationId", "normalizedName", "birthMonth", "birthYear");

CREATE UNIQUE INDEX "Student_organizationId_classId_normalizedName_birthMonth_birthYear_key"
  ON "Student"("organizationId", "classId", "normalizedName", "birthMonth", "birthYear");
