import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LegacyDashboardRedirect() {
  const session = await getSession();

  if (session?.role === "student") {
    redirect(`/m/${session.mosqueSlug}/dashboard`);
  }

  if (session?.role === "admin") {
    redirect(`/m/${session.mosqueSlug}/admin/dashboard`);
  }

  redirect("/");
}
