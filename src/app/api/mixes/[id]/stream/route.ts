import { getMixById } from "@/lib/mixes";
import { openMixContent } from "@/lib/gdrive";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const found = await getMixById(id);
  if (!found || !found.mix.visible) {
    return new Response("Not found", { status: 404 });
  }

  const range = request.headers.get("range") ?? undefined;

  try {
    const upstream = await openMixContent(found.mix, range);
    const headers = new Headers();
    // Force audio/mpeg — Drive sometimes sends octet-stream.
    headers.set("Content-Type", "audio/mpeg");
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Disposition", "inline");
    // Avoid caching redirects / error bodies; audio bytes can still be ranged.
    headers.set("Cache-Control", "private, no-store");

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) headers.set("Content-Range", contentRange);

    return new Response(upstream.body, {
      status: upstream.status === 206 ? 206 : 200,
      headers,
    });
  } catch (error) {
    console.error("Stream error:", error);
    return new Response(
      error instanceof Error ? error.message : "Stream unavailable",
      { status: 502 },
    );
  }
}
