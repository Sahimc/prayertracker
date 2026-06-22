import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { parseBirthMonthYear } from "@/lib/birthdays";
import { cleanDisplayName, normalizeName } from "@/lib/names";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const DUPLICATE_ADMIN_MESSAGE =
  "An admin with this name and birthday already exists for this mosque. Add the admin's full name, or delete the old admin if they no longer need access.";

export async function GET() {
  const auth = await requireApiSession({ role: "admin" });
  if (auth.response) return auth.response;

  try {
    const admins = await prisma.admin.findMany({
      where: { organizationId: auth.session.organizationId },
      select: {
        id: true,
        organizationId: true,
        fullName: true,
        birthMonth: true,
        birthYear: true,
      },
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json({ admins });
  } catch (error) {
    console.error("Error fetching admins:", error);
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

    if (!fullName) {
      return NextResponse.json({ error: "Admin Name is required" }, { status: 400 });
    }

    if (!birthday) {
      return NextResponse.json({ error: "Choose a birthday month and year." }, { status: 400 });
    }

    const normalizedName = normalizeName(fullName);
    const existing = await prisma.admin.findUnique({
      where: {
        organizationId_normalizedName_birthMonth_birthYear: {
          organizationId: auth.session.organizationId,
          normalizedName,
          birthMonth: birthday.birthMonth,
          birthYear: birthday.birthYear,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: DUPLICATE_ADMIN_MESSAGE }, { status: 400 });
    }

    const admin = await prisma.admin.create({
      data: {
        organizationId: auth.session.organizationId,
        fullName,
        normalizedName,
        birthMonth: birthday.birthMonth,
        birthYear: birthday.birthYear,
      },
      select: {
        id: true,
        organizationId: true,
        fullName: true,
        birthMonth: true,
        birthYear: true,
      },
    });

    return NextResponse.json({ admin }, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: DUPLICATE_ADMIN_MESSAGE }, { status: 400 });
    }

    console.error("Error creating admin:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
