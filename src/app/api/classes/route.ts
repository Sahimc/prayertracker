import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { cleanDisplayName, normalizeName } from "@/lib/names";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const DUPLICATE_CLASS_MESSAGE = "A class with this name already exists for this mosque.";

export async function GET() {
  const auth = await requireApiSession({ role: "admin" });
  if (auth.response) return auth.response;

  try {
    const classes = await prisma.class.findMany({
      where: { organizationId: auth.session.organizationId },
      select: {
        id: true,
        organizationId: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ classes });
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiSession({ role: "admin" });
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const name = cleanDisplayName(String(body.name ?? ""));

    if (!name) {
      return NextResponse.json({ error: "Class name is required" }, { status: 400 });
    }

    const normalizedName = normalizeName(name);
    const existing = await prisma.class.findUnique({
      where: {
        organizationId_normalizedName: {
          organizationId: auth.session.organizationId,
          normalizedName,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: DUPLICATE_CLASS_MESSAGE }, { status: 400 });
    }

    const studentClass = await prisma.class.create({
      data: {
        organizationId: auth.session.organizationId,
        name,
        normalizedName,
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
      },
    });

    return NextResponse.json({ class: studentClass }, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: DUPLICATE_CLASS_MESSAGE }, { status: 400 });
    }

    console.error("Error creating class:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
