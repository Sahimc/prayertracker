# Prayer Tracker

A simple mobile-first prayer tracker for children, mosque classes, madrasahs, families, and community organisations.

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
- `SESSION_SECRET` for production session signing

For local/dev only, reset with:

```bash
npm run db:reset:dev
npm run prisma:generate
npm run db:seed
```

Do not run the reset command against production, hosted, or real-user data. This repo currently contains Vercel/Postgres-style environment variables, so confirm the target database is local/dev before resetting.

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

- Admin: `Aisha`, DOB `01/02/1990`
- Student: `Abdullah`, DOB `01/02/2020`
- Student: `Maryam`, DOB `15/05/2019`
- Student: `Yusuf`, DOB `22/08/2018`

Masjid Umar (Luton), slug `masjid-umar`:

- Admin: `Omar`, DOB `05/06/1988`
- Student: `Abdullah`, DOB `01/02/2020`
- Student: `Safiya`, DOB `09/11/2019`
- Student: `Ibrahim`, DOB `17/03/2018`

All DOB entry in the UI is UK format `DD/MM/YYYY`. The database stores DOB values as normalized `YYYY-MM-DD`.

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
