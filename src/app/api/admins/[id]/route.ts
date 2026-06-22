import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession({ role: "admin" });
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;

    if (id === auth.session.adminId) {
      return NextResponse.json({ error: "You cannot delete your own admin account." }, { status: 400 });
    }

    const adminCount = await prisma.admin.count({
      where: { organizationId: auth.session.organizationId },
    });

    if (adminCount <= 1) {
      return NextResponse.json({ error: "You cannot delete the last admin for this mosque." }, { status: 400 });
    }

    const admin = await prisma.admin.findFirst({
      where: {
        id,
        organizationId: auth.session.organizationId,
      },
      select: { id: true },
    });

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    await prisma.admin.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting admin:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
