import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "djontic_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD?.trim() || "";
}

function sign(value: string) {
  const secret = getAdminPassword();
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function isAdminConfigured() {
  return Boolean(getAdminPassword());
}

export function verifyAdminPassword(password: string) {
  const expected = getAdminPassword();
  if (!expected || !password) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function isAdminAuthenticated() {
  if (!isAdminConfigured()) return false;
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const expected = sign("authenticated");
  try {
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function setAdminSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, sign("authenticated"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return response;
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
