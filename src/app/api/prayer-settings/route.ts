import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { fetchAladhanPrayerTimes, normalizePrayerSettings } from "@/lib/aladhan";
import { getTodayIso } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function serializeSettings(organization: {
  prayerCity: string;
  prayerCountry: string;
  prayerTimezone: string;
  prayerCalculationMethod: number;
  prayerSchool: number;
  prayerLatitudeAdjustmentMethod: number;
}) {
  return {
    city: organization.prayerCity,
    country: organization.prayerCountry,
    timezone: organization.prayerTimezone,
    method: organization.prayerCalculationMethod,
    school: organization.prayerSchool,
    latitudeAdjustmentMethod: organization.prayerLatitudeAdjustmentMethod,
  };
}

export async function GET() {
  const auth = await requireApiSession({ role: "admin" });
  if (auth.response) return auth.response;

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: auth.session.organizationId },
      select: {
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

    const prayerTime = await prisma.prayerTime.findUnique({
      where: {
        organizationId_date: {
          organizationId: auth.session.organizationId,
          date: getTodayIso(),
        },
      },
    });

    return NextResponse.json({
      settings: serializeSettings(organization),
      prayerTime,
    });
  } catch (error) {
    console.error("Error fetching prayer settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireApiSession({ role: "admin" });
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const settings = normalizePrayerSettings({
      city: body.city,
      country: body.country,
      timezone: body.timezone,
      method: Number(body.method),
      school: Number(body.school),
      latitudeAdjustmentMethod: Number(body.latitudeAdjustmentMethod),
    });

    let values;
    try {
      values = await fetchAladhanPrayerTimes(settings);
    } catch (error) {
      console.error("AlAdhan fetch failed:", error);
      return NextResponse.json(
        { error: "Could not fetch prayer times. Please check the location and method." },
        { status: 400 },
      );
    }

    const date = getTodayIso();
    const [organization, prayerTime] = await prisma.$transaction([
      prisma.organization.update({
        where: { id: auth.session.organizationId },
        data: {
          prayerCity: settings.city,
          prayerCountry: settings.country,
          prayerTimezone: settings.timezone,
          prayerCalculationMethod: settings.method,
          prayerSchool: settings.school,
          prayerLatitudeAdjustmentMethod: settings.latitudeAdjustmentMethod,
        },
        select: {
          prayerCity: true,
          prayerCountry: true,
          prayerTimezone: true,
          prayerCalculationMethod: true,
          prayerSchool: true,
          prayerLatitudeAdjustmentMethod: true,
        },
      }),
      prisma.prayerTime.upsert({
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
      }),
    ]);

    return NextResponse.json({
      settings: serializeSettings(organization),
      prayerTime,
    });
  } catch (error) {
    console.error("Error updating prayer settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
