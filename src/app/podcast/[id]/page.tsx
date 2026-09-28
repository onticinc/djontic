import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEggsPodcastVideo } from "@/lib/youtube";

type Props = {
  params: Promise<{ id: string }>;
};

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { video } = await getEggsPodcastVideo(id);
  if (!video) {
    return { title: "Episode not found" };
  }

  const description =
    video.description.trim().slice(0, 160) ||
    `Watch ${video.title} from the Eggs Podcast.`;

  return {
    title: video.title,
    description,
    openGraph: {
      title: `${video.title} | Eggs Podcast`,
      description,
      type: "video.other",
      images: [{ url: video.thumbnail }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${video.title} | Eggs Podcast`,
      description,
      images: [video.thumbnail],
    },
  };
}

export default async function PodcastEpisodePage({ params }: Props) {
  const { id } = await params;
  const { video, configured, error } = await getEggsPodcastVideo(id);

  if (!configured) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-muted">
          Connect YouTube by adding API keys to your{" "}
          <code className="text-foreground">.env</code> file.
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-muted">Couldn’t load this episode: {error}</p>
      </section>
    );
  }

  if (!video) notFound();

  const embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}?rel=0`;

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.22em] text-steel">
          Eggs Podcast
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.02em] text-foreground sm:text-5xl">
          {video.title}
        </h1>
        {video.publishedLabel ? (
          <p className="mt-4 text-sm uppercase tracking-[0.16em] text-muted-2">
            {video.publishedLabel}
          </p>
        ) : null}
      </div>

      <div className="mt-10 overflow-hidden border border-border bg-surface">
        <div className="relative aspect-video w-full">
          <iframe
            src={embedUrl}
            title={video.title}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>

      {video.description.trim() ? (
        <div className="mt-10 max-w-3xl">
          <h2 className="text-xs uppercase tracking-[0.22em] text-muted-2">
            About this episode
          </h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {video.description.trim()}
          </p>
        </div>
      ) : null}

      <p className="mt-10 text-sm text-muted-2">
        <Link
          href="/podcast"
          className="text-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          ← All Eggs Podcast episodes
        </Link>
      </p>
    </section>
  );
}
