import { MosqueChooser } from "@/components/MosqueChooser";
import { HomeProductShowcase, HomeScrollCue, HomeStartMosqueCta } from "@/components/HomeProductShowcase";
import { prisma } from "@/lib/prisma";
import { getRememberedMosqueSlug, getSession } from "@/lib/session";
import type { OrganizationSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

type SuggestionReason = "session" | "single" | "recent";

function getSuggestedOrganization(
  organizations: OrganizationSummary[],
  sessionSlug: string | null,
  rememberedSlug: string | null,
): { organization: OrganizationSummary | null; reason: SuggestionReason | null } {
  const sessionOrganization = sessionSlug
    ? organizations.find((organization) => organization.slug === sessionSlug) ?? null
    : null;

  if (sessionOrganization) {
    return { organization: sessionOrganization, reason: "session" };
  }

  if (organizations.length === 1) {
    return { organization: organizations[0], reason: "single" };
  }

  const rememberedOrganization = rememberedSlug
    ? organizations.find((organization) => organization.slug === rememberedSlug) ?? null
    : null;

  if (rememberedOrganization) {
    return { organization: rememberedOrganization, reason: "recent" };
  }

  return { organization: null, reason: null };
}

export default async function Home() {
  const currentYear = new Date().getFullYear();
  const [organizations, session, rememberedSlug] = await Promise.all([
    prisma.organization.findMany({
      orderBy: [{ name: "asc" }, { town: "asc" }],
      select: {
        id: true,
        name: true,
        town: true,
        slug: true,
      },
    }),
    getSession(),
    getRememberedMosqueSlug(),
  ]);
  const suggestion = getSuggestedOrganization(organizations, session?.mosqueSlug ?? null, rememberedSlug);

  return (
    <>
      <MosqueChooser
        initialOrganizations={organizations}
        suggestedOrganization={suggestion.organization}
        suggestionReason={suggestion.reason}
      />
      <HomeStartMosqueCta />
      <HomeScrollCue />
      <HomeProductShowcase currentYear={currentYear} />
    </>
  );
}
