import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { cleanDisplayName, normalizeName } from "@/lib/names";
import { parseBirthMonthYear } from "@/lib/birthdays";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mosqueSlug = String(body.mosqueSlug ?? "");
    const fullName = cleanDisplayName(String(body.fullName ?? ""));
    const birthday = parseBirthMonthYear(body.birthMonth, body.birthYear);

    if (!mosqueSlug) {
      return NextResponse.json({ error: "Mosque slug is required" }, { status: 400 });
    }

    if (!fullName) {
      return NextResponse.json({ error: "First Name is required" }, { status: 400 });
    }

    if (!birthday) {
      return NextResponse.json({ error: "Choose a birthday month and year." }, { status: 400 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: mosqueSlug },
      select: { id: true, slug: true },
    });

    if (!organization) {
      return NextResponse.json({ error: "Mosque not found" }, { status: 404 });
    }

    const matchingStudents = await prisma.student.findMany({
      where: {
        organizationId: organization.id,
        normalizedName: normalizeName(fullName),
        birthMonth: birthday.birthMonth,
        birthYear: birthday.birthYear,
      },
      select: { id: true },
    });

    if (matchingStudents.length === 0) {
      return NextResponse.json(
        { error: "We could not find that student for this mosque. Please check the name and birthday." },
        { status: 404 },
      );
    }

    if (matchingStudents.length > 1) {
      return NextResponse.json(
        { error: "More than one student matches. Please ask an admin to use the student's full name." },
        { status: 409 },
      );
    }

    const [student] = matchingStudents;

    await createSession({
      role: "student",
      organizationId: organization.id,
      mosqueSlug: organization.slug,
      studentId: student.id,
    });

    return NextResponse.json({ redirectTo: `/m/${organization.slug}/dashboard` });
  } catch (error) {
    console.error("Student login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
