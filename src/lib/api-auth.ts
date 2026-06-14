import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "./session";
import type { Role } from "./types";

type RequireSessionOptions = {
  role?: Role;
  mosqueSlug?: string;
};

type RequireSessionResult =
  | { session: SessionPayload; response?: never }
  | { session?: never; response: NextResponse };

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function requireApiSession(options: RequireSessionOptions = {}): Promise<RequireSessionResult> {
  const session = await getSession();
  if (!session) {
    return { response: jsonError("Authentication required", 401) };
  }

  if (options.role && session.role !== options.role) {
    return { response: jsonError("You do not have permission to access this resource", 403) };
  }

  if (options.mosqueSlug && session.mosqueSlug !== options.mosqueSlug) {
    return { response: jsonError("This session does not belong to this mosque", 403) };
  }

  return { session };
}
