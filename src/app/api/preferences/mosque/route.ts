import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rememberMosque } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    let body: { mosqueSlug?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const mosqueSlug = String(body.mosqueSlug ?? "").trim();

    if (!mosqueSlug) {
      return NextResponse.json({ error: "Mosque slug is required" }, { status: 400 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: mosqueSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: "Mosque not found" }, { status: 404 });
    }

    await rememberMosque(mosqueSlug);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error remembering mosque:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
