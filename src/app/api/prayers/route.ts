import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { getTodayIso, isFutureDate, isValidIsoDate } from "@/lib/dates";
import { isPrayerName } from "@/lib/prayers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const bodyStudentId = String(body.studentId ?? "");
    const date = String(body.date ?? "");
    const prayerName = String(body.prayerName ?? "");
    const status = body.status;
    const mosqueSlug = body.mosqueSlug ? String(body.mosqueSlug) : "";

    if (mosqueSlug && mosqueSlug !== auth.session.mosqueSlug) {
      return NextResponse.json({ error: "This session does not belong to this mosque" }, { status: 403 });
    }

    if (!date || !prayerName || typeof status !== "boolean") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!isValidIsoDate(date)) {
      return NextResponse.json({ error: "Invalid prayer date" }, { status: 400 });
    }

    if (isFutureDate(date, getTodayIso())) {
      return NextResponse.json({ error: "Cannot log prayers for future dates" }, { status: 400 });
    }

    if (!isPrayerName(prayerName)) {
      return NextResponse.json({ error: "Invalid prayer name" }, { status: 400 });
    }

    const studentId = auth.session.role === "student" ? auth.session.studentId : bodyStudentId;
    if (!studentId) {
      return NextResponse.json({ error: "Student is required" }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        organizationId: auth.session.organizationId,
      },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const prayerLog = await prisma.prayerLog.upsert({
      where: {
        studentId_date: {
          studentId: student.id,
          date,
        },
      },
      update: {
        [prayerName]: status,
      },
      create: {
        organizationId: student.organizationId,
        studentId: student.id,
        date,
        [prayerName]: status,
      },
    });

    return NextResponse.json({ prayerLog });
  } catch (error) {
    console.error("Error updating prayer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
