# Prayer Tracking

A simple mobile-first prayer tracking app for children, mosque classes, madrasahs, families, and community organisations.

The app is organized by mosque URL slug. Students and admins do not use email, passwords, PINs, or mosque codes.

## Local Setup

```bash
npm install
npm run prisma:generate
npm run dev
```

Open `http://localhost:3000`.

## Database Setup

The app uses Prisma with PostgreSQL.

Required environment variables:

- `POSTGRES_PRISMA_URL`
- `DATABASE_URL_UNPOOLED`
- `SESSION_SECRET` for production session signing. If it is not set, the app falls back to an existing server-only database secret so production sessions still work, but an explicit `SESSION_SECRET` is preferred.

For local/dev only, reset with:

```bash
npm run db:reset:dev
npm run prisma:generate
npm run db:seed
```

Do not run the reset command against production, hosted, or real-user data. This repo currently contains Vercel/Postgres-style environment variables, so confirm the target database is local/dev before resetting.

The class migration keeps mosques, admins, prayer settings, and prayer times, but intentionally removes existing students and prayer logs because every student must now belong to one class.

## Main Routes

- `/` choose mosque
- `/create-mosque` create a mosque and first admin
- `/m/[mosqueSlug]` student login
- `/m/[mosqueSlug]/dashboard` student dashboard
- `/m/[mosqueSlug]/dashboard/history` student history
- `/m/[mosqueSlug]/admin` admin login
- `/m/[mosqueSlug]/admin/dashboard` admin dashboard
- `/m/[mosqueSlug]/admin/student/[studentId]` admin student history/details

Legacy `/dashboard`, `/dashboard/history`, `/admin`, and `/admin/student/[id]` redirect to the scoped route when a valid session exists.

## Seeded Logins

Seed data creates two mosques.

Green Lane Masjid (East Ham), slug `green-lane-masjid`:

- Admin: `Aisha`, Birthday `February 1990`
- Classes: `Beginners`, `Level 1`
- Student: `Abdullah`, Birthday `February 2020`, class `Beginners`
- Student: `Maryam`, Birthday `May 2019`, class `Beginners`
- Student: `Yusuf`, Birthday `August 2018`, class `Level 1`

Masjid Umar (Luton), slug `masjid-umar`:

- Admin: `Omar`, Birthday `June 1988`
- Classes: `Weekday Class`, `Weekend Class`
- Student: `Abdullah`, Birthday `February 2020`, class `Weekday Class`
- Student: `Safiya`, Birthday `November 2019`, class `Weekend Class`
- Student: `Ibrahim`, Birthday `March 2018`, class `Weekday Class`

All birthday entry in the UI uses Month and Year dropdowns. The database stores birthday values as `birthMonth` and `birthYear`.

## Classes

Classes belong to a mosque, not to an individual admin. Every student must be assigned to exactly one class. Admins can create classes from the admin dashboard or while adding a new student. The admin student list can search by student name or class name and filter by class.

## Security Model

Login creates an HTTP-only signed session cookie containing role, organization, mosque slug, user id, and expiry.

Protected API routes verify the cookie on every request:

- no session returns `401`
- wrong role returns `403`
- wrong mosque/session mismatch returns `403`
- missing scoped resources return `404`

Students can only access their own record and prayer logs. Admins can only access students, prayer logs, and prayer times inside their own mosque.

## Prayer Times

Each mosque stores prayer calculation settings for AlAdhan: city, country, timezone, calculation method, school, and high-latitude adjustment. Admins choose these settings from the admin dashboard. The app fetches today's Fajr, Dhuhr, Asr, Maghrib, and Isha times from AlAdhan, saves the calculated snapshot, and displays it to students as 12-hour AM/PM pills below the existing prayer buttons.

## Checks

```bash
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run lint
npm run build
```
