import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { cleanDisplayName, normalizeName } from "@/lib/names";
import { isValidIsoDate, parseUkDobToIso } from "@/lib/dates";

export const runtime = "nodejs";

const DUPLICATE_STUDENT_MESSAGE =
  "A student with this name and birthday already exists. Please add a surname or extra name.";
const DUPLICATE_CLASS_MESSAGE = "A class with this name already exists for this mosque.";
const CLASS_REQUIRED_MESSAGE = "Choose a class or create a new class before adding a student.";

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
        class: {
          select: {
            id: true,
            organizationId: true,
            name: true,
          },
        },
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
    const dob = String(body.dob ?? "");
    const classId = String(body.classId ?? "");
    const newClassName = cleanDisplayName(String(body.newClassName ?? ""));

    if (!fullName) {
      return NextResponse.json({ error: "First Name is required" }, { status: 400 });
    }

    if (!classId && !newClassName) {
      return NextResponse.json({ error: CLASS_REQUIRED_MESSAGE }, { status: 400 });
    }

    const dateOfBirth = parseUkDobToIso(dob);
    if (!dateOfBirth) {
      return NextResponse.json({ error: "Enter the birthday as DD/MM/YYYY" }, { status: 400 });
    }

    const normalizedName = normalizeName(fullName);
    const existing = await prisma.student.findUnique({
      where: {
        organizationId_normalizedName_dateOfBirth: {
          organizationId: auth.session.organizationId,
          normalizedName,
          dateOfBirth,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: DUPLICATE_STUDENT_MESSAGE }, { status: 400 });
    }

    const targetClassId = classId;
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

        const student = await tx.student.create({
          data: {
            organizationId: auth.session.organizationId,
            classId: studentClass.id,
            fullName,
            normalizedName,
            dateOfBirth,
          },
          include: {
            class: {
              select: {
                id: true,
                organizationId: true,
                name: true,
              },
            },
            prayers: true,
          },
        });

        return { student, class: studentClass };
      });

      return NextResponse.json(result, { status: 201 });
    }

    const existingClass = await prisma.class.findFirst({
      where: {
        id: targetClassId,
        organizationId: auth.session.organizationId,
      },
      select: { id: true },
    });

    if (!existingClass) {
      return NextResponse.json({ error: CLASS_REQUIRED_MESSAGE }, { status: 400 });
    }

    const student = await prisma.student.create({
      data: {
        organizationId: auth.session.organizationId,
        classId: targetClassId,
        fullName,
        normalizedName,
        dateOfBirth,
      },
      include: {
        class: {
          select: {
            id: true,
            organizationId: true,
            name: true,
          },
        },
        prayers: true,
      },
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
