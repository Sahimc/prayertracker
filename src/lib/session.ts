import crypto from "crypto";
import { cookies } from "next/headers";
import type { Role } from "./types";

export const SESSION_COOKIE_NAME = "prayer_tracker_session";
export const LAST_MOSQUE_COOKIE_NAME = "prayer_tracker_last_mosque";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const LAST_MOSQUE_DURATION_SECONDS = 180 * 24 * 60 * 60;

export type SessionPayload = {
  role: Role;
  organizationId: string;
  mosqueSlug: string;
  studentId?: string;
  adminId?: string;
  expiresAt: string;
};

type SessionInput = Omit<SessionPayload, "expiresAt">;

function getSessionSecret(): string {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production.");
  }
  return "dev-only-prayer-tracker-session-secret";
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function encodeSession(payload: SessionPayload): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  if (!timingSafeEqual(signature, sign(encodedPayload))) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.role || !payload.organizationId || !payload.mosqueSlug || !payload.expiresAt) return null;
    if (new Date(payload.expiresAt).getTime() <= Date.now()) return null;
    if (payload.role === "student" && !payload.studentId) return null;
    if (payload.role === "admin" && !payload.adminId) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(input: SessionInput): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const payload: SessionPayload = {
    ...input,
    expiresAt: expiresAt.toISOString(),
  };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, encodeSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });

  cookieStore.set(LAST_MOSQUE_COOKIE_NAME, input.mosqueSlug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: LAST_MOSQUE_DURATION_SECONDS,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return token ? decodeSession(token) : null;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function rememberMosque(mosqueSlug: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(LAST_MOSQUE_COOKIE_NAME, mosqueSlug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: LAST_MOSQUE_DURATION_SECONDS,
    path: "/",
  });
}

export async function getRememberedMosqueSlug(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(LAST_MOSQUE_COOKIE_NAME)?.value ?? null;
}

export function sessionMatchesMosque(session: SessionPayload | null, mosqueSlug: string): boolean {
  return Boolean(session && session.mosqueSlug === mosqueSlug);
}
