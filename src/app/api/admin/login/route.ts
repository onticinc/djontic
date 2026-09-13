import { NextResponse } from "next/server";
import {
  clearAdminSessionCookie,
  isAdminAuthenticated,
  isAdminConfigured,
  setAdminSessionCookie,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export async function GET() {
  return NextResponse.json({
    configured: isAdminConfigured(),
    authenticated: await isAdminAuthenticated(),
  });
}

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Set ADMIN_PASSWORD in .env to enable the admin area." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { password?: string };
  if (!verifyAdminPassword(body.password ?? "")) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  return setAdminSessionCookie(response);
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  return clearAdminSessionCookie(response);
}
