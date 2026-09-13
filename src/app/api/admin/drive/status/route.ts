import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { diagnoseDrive } from "@/lib/gdrive";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  return NextResponse.json(await diagnoseDrive());
}
