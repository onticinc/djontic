import Image from "next/image";
import type { PodcastVideo } from "@/lib/youtube";

export function PodcastGrid({ videos }: { videos: PodcastVideo[] }) {
  if (videos.length === 0) {
    return (
      <p className="border-t border-white/10 py-10 text-zinc-400">
        No episodes available yet.
      </p>
    );
  }

  return (
    <ul className="grid gap-8 border-t border-white/10 pt-8 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((video) => (
        <li key={video.id}>
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <div className="relative aspect-video overflow-hidden bg-zinc-900">
              <Image
                src={video.thumbnail}
                alt=""
                fill
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-zinc-500">
              {video.publishedLabel}
            </p>
            <h2 className="mt-1 font-display text-xl tracking-[0.04em] text-white transition group-hover:text-steel">
              {video.title}
            </h2>
          </a>
        </li>
      ))}
    </ul>
  );
}
