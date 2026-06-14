export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function generateUniqueMosqueSlug(
  name: string,
  town: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const baseFromName = slugify(name);
  if (!baseFromName) {
    throw new Error("Mosque name must produce a valid URL slug.");
  }

  if (!(await isTaken(baseFromName))) {
    return baseFromName;
  }

  const townSlug = slugify(town);
  const baseWithTown = townSlug ? `${baseFromName}-${townSlug}` : baseFromName;

  if (!(await isTaken(baseWithTown))) {
    return baseWithTown;
  }

  let suffix = 2;
  while (await isTaken(`${baseWithTown}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseWithTown}-${suffix}`;
}
