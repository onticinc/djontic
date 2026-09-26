import { NextResponse } from "next/server";
import { requireConvexAdmin } from "@/lib/convex-admin";
import { diagnoseDrive } from "@/lib/gdrive";

export async function GET() {
  const unauthorized = await requireConvexAdmin();
  if (unauthorized) return unauthorized;
  return NextResponse.json(await diagnoseDrive());
}
