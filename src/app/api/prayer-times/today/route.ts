import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { getTodayIso } from "@/lib/dates";

export const runtime = "nodejs";

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
  await request.text();
  return NextResponse.json(
    { error: "Manual prayer time entry has been replaced by calculated AlAdhan prayer settings." },
    { status: 405 },
  );
}
