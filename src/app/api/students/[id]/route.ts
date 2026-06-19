import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { cleanDisplayName, normalizeName } from "@/lib/names";
import { isValidIsoDate, parseUkDobToIso } from "@/lib/dates";

export const runtime = "nodejs";

const DUPLICATE_STUDENT_MESSAGE =
  "A student with this name and birthday already exists. Please add a surname or extra name.";
const CLASS_REQUIRED_MESSAGE = "Choose a class for this student.";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (auth.session.role === "student" && auth.session.studentId !== id) {
      return NextResponse.json({ error: "You can only access your own student record" }, { status: 403 });
    }

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

    const student = await prisma.student.findFirst({
      where: {
        id,
        organizationId: auth.session.organizationId,
      },
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
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ student });
  } catch (error) {
    console.error("Error fetching student:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession({ role: "admin" });
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const fullName = cleanDisplayName(String(body.fullName ?? ""));
    const dob = String(body.dob ?? "");
    const classId = String(body.classId ?? "");

    if (!fullName) {
      return NextResponse.json({ error: "First Name is required" }, { status: 400 });
    }

    if (!classId) {
      return NextResponse.json({ error: CLASS_REQUIRED_MESSAGE }, { status: 400 });
    }

    const dateOfBirth = parseUkDobToIso(dob);
    if (!dateOfBirth) {
      return NextResponse.json({ error: "Enter the birthday as DD/MM/YYYY" }, { status: 400 });
    }

    const existingStudent = await prisma.student.findFirst({
      where: { id, organizationId: auth.session.organizationId },
      select: { id: true },
    });

    if (!existingStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
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

    const normalizedName = normalizeName(fullName);
    const duplicate = await prisma.student.findUnique({
      where: {
        organizationId_normalizedName_dateOfBirth: {
          organizationId: auth.session.organizationId,
          normalizedName,
          dateOfBirth,
        },
      },
      select: { id: true },
    });

    if (duplicate && duplicate.id !== id) {
      return NextResponse.json({ error: DUPLICATE_STUDENT_MESSAGE }, { status: 400 });
    }

    const student = await prisma.student.update({
      where: { id },
      data: {
        fullName,
        classId,
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
        prayers: { orderBy: { date: "desc" } },
      },
    });

    return NextResponse.json({ student });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: DUPLICATE_STUDENT_MESSAGE }, { status: 400 });
    }

    console.error("Error updating student:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession({ role: "admin" });
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;
    const student = await prisma.student.findFirst({
      where: {
        id,
        organizationId: auth.session.organizationId,
      },
      select: { id: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    await prisma.student.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting student:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
