import { NextResponse } from "next/server";
import { getPlayCount, incrementPlayCount } from "@/lib/play-counts";
import { getMixById } from "@/lib/mixes";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const found = await getMixById(id);
  if (!found || !found.mix.visible) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ id, plays: await getPlayCount(id) });
}

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const found = await getMixById(id);
  if (!found || !found.mix.visible) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const plays = await incrementPlayCount(id);
  return NextResponse.json({ id, plays });
}
