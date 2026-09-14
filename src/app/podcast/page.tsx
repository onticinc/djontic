import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { PodcastGrid } from "@/components/PodcastGrid";
import { getEggsPodcastVideos } from "@/lib/youtube";

export const metadata: Metadata = {
  title: "Eggs Podcast",
  description:
    "Watch Eggs Podcast episodes with DJ Ontic — conversations, culture, and the soundtrack around it.",
};

export const revalidate = 3600;

export default async function PodcastPage() {
  const { videos, configured, error } = await getEggsPodcastVideos();

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <PageHero
        eyebrow="Podcast"
        title="Eggs Podcast"
        description="Episodes from the Eggs Podcast — conversations, culture, and the soundtrack around it."
      />

      <div className="mt-12">
        {!configured ? (
          <p className="border-t border-white/10 py-10 text-zinc-400">
            Connect YouTube by adding{" "}
            <code className="text-zinc-200">GOOGLE_API_KEY</code> (or{" "}
            <code className="text-zinc-200">YOUTUBE_API_KEY</code>) and{" "}
            <code className="text-zinc-200">YOUTUBE_EGGS_PLAYLIST_ID</code> to
            your <code className="text-zinc-200">.env</code> file.
          </p>
        ) : error ? (
          <p className="border-t border-white/10 py-10 text-zinc-400">
            Couldn’t load the playlist: {error}
          </p>
        ) : (
          <PodcastGrid videos={videos} />
        )}
      </div>
    </section>
  );
}
