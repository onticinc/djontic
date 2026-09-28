import Image from "next/image";
import Link from "next/link";
import type { PodcastVideo } from "@/lib/youtube";

export function PodcastGrid({ videos }: { videos: PodcastVideo[] }) {
  if (videos.length === 0) {
    return (
      <p className="border-t border-border py-10 text-muted">
        No episodes available yet.
      </p>
    );
  }

  return (
    <ul className="grid gap-8 border-t border-border pt-8 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((video) => (
        <li key={video.id}>
          <Link href={`/podcast/${encodeURIComponent(video.id)}`} className="group block">
            <div className="relative aspect-video overflow-hidden bg-surface">
              <Image
                src={video.thumbnail}
                alt=""
                fill
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-2">
              {video.publishedLabel}
            </p>
            <h2 className="mt-1 font-display text-xl tracking-[0.04em] text-foreground transition group-hover:text-steel">
              {video.title}
            </h2>
          </Link>
        </li>
      ))}
    </ul>
  );
}
