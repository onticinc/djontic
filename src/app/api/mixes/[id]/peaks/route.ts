import { after } from "next/server";
import { NextResponse } from "next/server";
import { getMixById } from "@/lib/mixes";
import { extractAndCachePeaks, readCachedPeaks } from "@/lib/mix-media";

type Params = { params: Promise<{ id: string }> };

function fallbackPeaks() {
  return Array.from({ length: 120 }, (_, index) => {
    const wave =
      0.35 +
      0.45 * Math.abs(Math.sin(index / 6)) +
      0.2 * Math.abs(Math.sin(index / 2.4));
    return Number(wave.toFixed(4));
  });
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const found = await getMixById(id);
  if (!found || !found.mix.visible) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const peaks = await readCachedPeaks(id);
    if (peaks?.length) {
      return NextResponse.json(
        { peaks },
        { headers: { "Cache-Control": "public, max-age=86400" } },
      );
    }

    // Don't block the player while sampling Drive — return a placeholder
    // waveform and generate real peaks in the background.
    after(() => {
      void extractAndCachePeaks(found.mix).catch((error) => {
        console.error("Background peaks error:", error);
      });
    });

    return NextResponse.json(
      { peaks: fallbackPeaks(), pending: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Peaks error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Peaks unavailable",
        peaks: fallbackPeaks(),
      },
      { status: 200 },
    );
  }
}
