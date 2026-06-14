import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { cleanDisplayName, normalizeName } from "@/lib/names";
import { parseUkDobToIso } from "@/lib/dates";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mosqueSlug = String(body.mosqueSlug ?? "");
    const fullName = cleanDisplayName(String(body.fullName ?? ""));
    const dob = String(body.dob ?? "");

    if (!mosqueSlug) {
      return NextResponse.json({ error: "Mosque slug is required" }, { status: 400 });
    }

    if (!fullName) {
      return NextResponse.json({ error: "Admin Name is required" }, { status: 400 });
    }

    const dateOfBirth = parseUkDobToIso(dob);
    if (!dateOfBirth) {
      return NextResponse.json({ error: "Enter the date of birth as DD/MM/YYYY" }, { status: 400 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: mosqueSlug },
      select: { id: true, slug: true },
    });

    if (!organization) {
      return NextResponse.json({ error: "Mosque not found" }, { status: 404 });
    }

    const admin = await prisma.admin.findUnique({
      where: {
        organizationId_normalizedName_dateOfBirth: {
          organizationId: organization.id,
          normalizedName: normalizeName(fullName),
          dateOfBirth,
        },
      },
      select: { id: true },
    });

    if (!admin) {
      return NextResponse.json({ error: "We could not find that admin for this mosque." }, { status: 404 });
    }

    await createSession({
      role: "admin",
      organizationId: organization.id,
      mosqueSlug: organization.slug,
      adminId: admin.id,
    });

    return NextResponse.json({ redirectTo: `/m/${organization.slug}/admin/dashboard` });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
