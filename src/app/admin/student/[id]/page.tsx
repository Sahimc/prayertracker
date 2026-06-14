import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type LegacyAdminStudentRedirectProps = {
  params: Promise<{ id: string }>;
};

export default async function LegacyAdminStudentRedirect({ params }: LegacyAdminStudentRedirectProps) {
  const { id } = await params;
  const session = await getSession();

  if (session?.role === "admin") {
    redirect(`/m/${session.mosqueSlug}/admin/student/${id}`);
  }

  if (session?.role === "student") {
    redirect(`/m/${session.mosqueSlug}/dashboard`);
  }

  redirect("/");
}
