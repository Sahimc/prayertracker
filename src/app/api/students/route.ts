import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { cleanDisplayName, normalizeName } from "@/lib/names";
import { isValidIsoDate, parseUkDobToIso } from "@/lib/dates";

export const runtime = "nodejs";

const DUPLICATE_STUDENT_MESSAGE =
  "A student with this name and date of birth already exists. Please add a surname or extra name.";

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
      include: { prayers },
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

    if (!fullName) {
      return NextResponse.json({ error: "First Name is required" }, { status: 400 });
    }

    const dateOfBirth = parseUkDobToIso(dob);
    if (!dateOfBirth) {
      return NextResponse.json({ error: "Enter the date of birth as DD/MM/YYYY" }, { status: 400 });
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

    const student = await prisma.student.create({
      data: {
        organizationId: auth.session.organizationId,
        fullName,
        normalizedName,
        dateOfBirth,
      },
      include: { prayers: true },
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
