import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { getTodayIso, isValidPrayerTime } from "@/lib/dates";
import { PRAYERS } from "@/lib/prayers";
import type { PrayerName } from "@/lib/prayers";

export const runtime = "nodejs";

function readPrayerTimes(body: Record<string, unknown>): Record<PrayerName, string> | null {
  const values = {} as Record<PrayerName, string>;

  for (const prayer of PRAYERS) {
    const value = String(body[prayer] ?? "").trim();
    if (!isValidPrayerTime(value)) return null;
    values[prayer] = value;
  }

  return values;
}

export async function GET() {
  const auth = await requireApiSession({ role: "admin" });
  if (auth.response) return auth.response;

  try {
    const prayerTime = await prisma.prayerTime.findUnique({
      where: {
        organizationId_date: {
          organizationId: auth.session.organizationId,
          date: getTodayIso(),
        },
      },
    });

    return NextResponse.json({ prayerTime });
  } catch (error) {
    console.error("Error fetching prayer times:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireApiSession({ role: "admin" });
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const values = readPrayerTimes(body);

    if (!values) {
      return NextResponse.json({ error: "Prayer times must use HH:mm format" }, { status: 400 });
    }

    const date = getTodayIso();
    const prayerTime = await prisma.prayerTime.upsert({
      where: {
        organizationId_date: {
          organizationId: auth.session.organizationId,
          date,
        },
      },
      update: values,
      create: {
        organizationId: auth.session.organizationId,
        date,
        ...values,
      },
    });

    return NextResponse.json({ prayerTime });
  } catch (error) {
    console.error("Error updating prayer times:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
