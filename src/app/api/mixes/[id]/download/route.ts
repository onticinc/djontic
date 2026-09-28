import { getMixById } from "@/lib/mixes";
import { openMixContent } from "@/lib/gdrive";

type Params = { params: Promise<{ id: string }> };

function downloadFilename(filename: string, title: string) {
  const fromStore = filename.trim();
  if (fromStore.toLowerCase().endsWith(".mp3")) return fromStore;
  const safeTitle = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 120);
  return `${safeTitle || "mix"}.mp3`;
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const found = await getMixById(id);
  if (!found || !found.mix.visible) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const upstream = await openMixContent(found.mix);
    const filename = downloadFilename(found.mix.filename, found.mix.title);
    const headers = new Headers();
    headers.set("Content-Type", "audio/mpeg");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${filename.replace(/"/g, "")}"`,
    );
    headers.set("Cache-Control", "private, no-store");

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Download error:", error);
    return new Response(
      error instanceof Error ? error.message : "Download unavailable",
      { status: 502 },
    );
  }
}
