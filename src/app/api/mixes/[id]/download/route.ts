import { NextResponse } from "next/server";
import { getMixById } from "@/lib/mixes";
import { getPublicDownloadUrl } from "@/lib/gdrive";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const found = await getMixById(id);
  if (!found || !found.mix.visible || !found.mix.driveId) {
    return new Response("Not found", { status: 404 });
  }

  return NextResponse.redirect(getPublicDownloadUrl(found.mix.driveId), 302);
}
