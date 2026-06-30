-- The app now stores birthday identity as birthMonth/birthYear.
-- Keep legacy dateOfBirth columns for rollback compatibility, but allow new
-- records to omit them.
ALTER TABLE "Admin" ALTER COLUMN "dateOfBirth" DROP NOT NULL;
ALTER TABLE "Student" ALTER COLUMN "dateOfBirth" DROP NOT NULL;
