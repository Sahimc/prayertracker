import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { parseBirthMonthYear } from "@/lib/birthdays";
import { getTodayIso, isValidIsoDate } from "@/lib/dates";
import { cleanDisplayName, normalizeName } from "@/lib/names";

export const runtime = "nodejs";

const DUPLICATE_STUDENT_MESSAGE =
  "A student with this name and birthday already exists in this class. Add the student's full name, or delete the old student if they no longer need access.";
const DUPLICATE_CLASS_MESSAGE = "A class with this name already exists for this mosque.";
const CLASS_REQUIRED_MESSAGE = "Choose a class or create a new class before adding a student.";

const studentInclude = {
  class: {
    select: {
      id: true,
      organizationId: true,
      name: true,
    },
  },
  prayers: true,
} as const;

export async function GET(request: Request) {
  const auth = await requireApiSession({ role: "admin" });
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const prayers =
      startDate && endDate && isValidIsoDate(startDate) && isValidIsoDate(endDate)
        ? {
            where: {
              date: {
                gte: startDate,
                lte: endDate,
              },
            },
            orderBy: { date: "desc" as const },
          }
        : {
            orderBy: { date: "desc" as const },
          };

    const students = await prisma.student.findMany({
      where: { organizationId: auth.session.organizationId },
      include: {
        class: studentInclude.class,
        prayers,
      },
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiSession({ role: "admin" });
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const fullName = cleanDisplayName(String(body.fullName ?? ""));
    const birthday = parseBirthMonthYear(body.birthMonth, body.birthYear);
    const classId = String(body.classId ?? "");
    const newClassName = cleanDisplayName(String(body.newClassName ?? ""));

    if (!fullName) {
      return NextResponse.json({ error: "First Name is required" }, { status: 400 });
    }

    if (!classId && !newClassName) {
      return NextResponse.json({ error: CLASS_REQUIRED_MESSAGE }, { status: 400 });
    }

    if (!birthday) {
      return NextResponse.json({ error: "Choose a birthday month and year." }, { status: 400 });
    }

    const normalizedName = normalizeName(fullName);

    if (newClassName) {
      const normalizedClassName = normalizeName(newClassName);
      const existingClass = await prisma.class.findUnique({
        where: {
          organizationId_normalizedName: {
            organizationId: auth.session.organizationId,
            normalizedName: normalizedClassName,
          },
        },
        select: { id: true },
      });

      if (existingClass) {
        return NextResponse.json({ error: DUPLICATE_CLASS_MESSAGE }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        const studentClass = await tx.class.create({
          data: {
            organizationId: auth.session.organizationId,
            name: newClassName,
            normalizedName: normalizedClassName,
          },
          select: {
            id: true,
            organizationId: true,
            name: true,
          },
        });

        const createdStudent = await tx.student.create({
          data: {
            organizationId: auth.session.organizationId,
            classId: studentClass.id,
            fullName,
            normalizedName,
            birthMonth: birthday.birthMonth,
            birthYear: birthday.birthYear,
          },
          select: { id: true },
        });

        await tx.prayerLog.create({
          data: {
            organizationId: auth.session.organizationId,
            studentId: createdStudent.id,
            date: getTodayIso(),
          },
        });

        const student = await tx.student.findUniqueOrThrow({
          where: { id: createdStudent.id },
          include: studentInclude,
        });

        return { student, class: studentClass };
      });

      return NextResponse.json(result, { status: 201 });
    }

    const existingClass = await prisma.class.findFirst({
      where: {
        id: classId,
        organizationId: auth.session.organizationId,
      },
      select: { id: true },
    });

    if (!existingClass) {
      return NextResponse.json({ error: CLASS_REQUIRED_MESSAGE }, { status: 400 });
    }

    const existing = await prisma.student.findUnique({
      where: {
        organizationId_classId_normalizedName_birthMonth_birthYear: {
          organizationId: auth.session.organizationId,
          classId,
          normalizedName,
          birthMonth: birthday.birthMonth,
          birthYear: birthday.birthYear,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: DUPLICATE_STUDENT_MESSAGE }, { status: 400 });
    }

    const student = await prisma.$transaction(async (tx) => {
      const createdStudent = await tx.student.create({
        data: {
          organizationId: auth.session.organizationId,
          classId,
          fullName,
          normalizedName,
          birthMonth: birthday.birthMonth,
          birthYear: birthday.birthYear,
        },
        select: { id: true },
      });

      await tx.prayerLog.create({
        data: {
          organizationId: auth.session.organizationId,
          studentId: createdStudent.id,
          date: getTodayIso(),
        },
      });

      return tx.student.findUniqueOrThrow({
        where: { id: createdStudent.id },
        include: studentInclude,
      });
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: DUPLICATE_STUDENT_MESSAGE }, { status: 400 });
    }

    console.error("Error creating student:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
