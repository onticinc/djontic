export type PodcastVideo = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  publishedLabel: string;
  url: string;
};

type PlaylistItem = {
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    resourceId?: { videoId?: string };
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
};

export async function getEggsPodcastVideos(): Promise<{
  videos: PodcastVideo[];
  configured: boolean;
  error?: string;
}> {
  const apiKey =
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.YOUTUBE_API_KEY?.trim();
  const playlistId = process.env.YOUTUBE_EGGS_PLAYLIST_ID?.trim();

  if (!apiKey || !playlistId) {
    return { videos: [], configured: false };
  }

  try {
    const params = new URLSearchParams({
      part: "snippet",
      playlistId,
      maxResults: "24",
      key: apiKey,
    });

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`,
      { next: { revalidate: 3600 } },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`YouTube API ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = (await response.json()) as { items?: PlaylistItem[] };

    const videos = (data.items ?? [])
      .map((item) => {
        const snippet = item.snippet;
        const videoId = snippet?.resourceId?.videoId;
        if (!videoId || !snippet?.title || snippet.title === "Private video") {
          return null;
        }

        const publishedAt = snippet.publishedAt ?? "";
        const publishedLabel = publishedAt
          ? new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(new Date(publishedAt))
          : "";

        return {
          id: videoId,
          title: snippet.title,
          description: snippet.description ?? "",
          thumbnail:
            snippet.thumbnails?.high?.url ||
            snippet.thumbnails?.medium?.url ||
            snippet.thumbnails?.default?.url ||
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          publishedAt,
          publishedLabel,
          url: `https://www.youtube.com/watch?v=${videoId}`,
        } satisfies PodcastVideo;
      })
      .filter((video): video is PodcastVideo => video !== null);

    return { videos, configured: true };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load Eggs Podcast videos.";
    console.error("YouTube playlist error:", error);
    return { videos: [], configured: true, error: message };
  }
}

export async function getEggsPodcastVideo(id: string): Promise<{
  video: PodcastVideo | null;
  configured: boolean;
  error?: string;
}> {
  const result = await getEggsPodcastVideos();
  if (!result.configured || result.error) {
    return {
      video: null,
      configured: result.configured,
      error: result.error,
    };
  }

  return {
    video: result.videos.find((video) => video.id === id) ?? null,
    configured: true,
  };
}
