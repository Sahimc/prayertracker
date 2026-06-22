import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { ensureTodaysPrayerTime } from "@/lib/prayer-times";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApiSession({ role: "admin" });
  if (auth.response) return auth.response;

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: auth.session.organizationId },
      select: {
        id: true,
        prayerCity: true,
        prayerCountry: true,
        prayerTimezone: true,
        prayerCalculationMethod: true,
        prayerSchool: true,
        prayerLatitudeAdjustmentMethod: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Mosque not found" }, { status: 404 });
    }

    const prayerTime = await ensureTodaysPrayerTime(organization);

    return NextResponse.json({ prayerTime });
  } catch (error) {
    console.error("Error fetching prayer times:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  await request.text();
  return NextResponse.json(
    { error: "Manual prayer time entry has been replaced by calculated AlAdhan prayer settings." },
    { status: 405 },
  );
}
