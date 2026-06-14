import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { cleanDisplayName, normalizeName } from "@/lib/names";
import { parseUkDobToIso } from "@/lib/dates";
import { generateUniqueMosqueSlug } from "@/lib/slugs";

export const runtime = "nodejs";

export async function GET() {
  try {
    const organizations = await prisma.organization.findMany({
      orderBy: [{ name: "asc" }, { town: "asc" }],
      select: {
        id: true,
        name: true,
        town: true,
        slug: true,
      },
    });

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mosqueName = cleanDisplayName(String(body.mosqueName ?? ""));
    const town = cleanDisplayName(String(body.town ?? ""));
    const adminName = cleanDisplayName(String(body.adminName ?? ""));
    const adminDob = String(body.adminDob ?? "");

    if (!mosqueName) {
      return NextResponse.json({ error: "Mosque name is required" }, { status: 400 });
    }

    if (!town) {
      return NextResponse.json({ error: "Town is required" }, { status: 400 });
    }

    if (!adminName) {
      return NextResponse.json({ error: "First admin name is required" }, { status: 400 });
    }

    const dateOfBirth = parseUkDobToIso(adminDob);
    if (!dateOfBirth) {
      return NextResponse.json({ error: "Enter the date of birth as DD/MM/YYYY" }, { status: 400 });
    }

    const slug = await generateUniqueMosqueSlug(mosqueName, town, async (candidate) => {
      const existing = await prisma.organization.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      return Boolean(existing);
    });

    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: mosqueName,
          town,
          slug,
        },
      });

      const admin = await tx.admin.create({
        data: {
          organizationId: organization.id,
          fullName: adminName,
          normalizedName: normalizeName(adminName),
          dateOfBirth,
        },
      });

      return { organization, admin };
    });

    await createSession({
      role: "admin",
      organizationId: result.organization.id,
      mosqueSlug: result.organization.slug,
      adminId: result.admin.id,
    });

    return NextResponse.json({
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        town: result.organization.town,
        slug: result.organization.slug,
      },
      redirectTo: `/m/${result.organization.slug}/admin/dashboard`,
    });
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
