"use client";

import Image from "next/image";
import { MixShareMenu } from "@/components/MixShareMenu";
import { useMixPlayback } from "@/components/MixPlaybackProvider";
import type { Mix } from "@/lib/mixes";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

type AudioPlayerProps = {
  mix: Mix;
};

export function AudioPlayer({ mix }: AudioPlayerProps) {
  const {
    activeMix,
    playing,
    current,
    duration,
    error,
    toggleMix,
    seek,
  } = useMixPlayback();

  const isActive = activeMix?.id === mix.id;
  const isPlaying = isActive && playing;
  const displayCurrent = isActive ? current : 0;
  const displayDuration = isActive ? duration : 0;
  const progress =
    displayDuration > 0 ? Math.min(1, displayCurrent / displayDuration) : 0;
  const hasSource = Boolean(mix.streamUrl);
  const showError = isActive ? error : null;

  return (
    <article
      id={`mix-${mix.id}`}
      className="border-t border-white/10 py-6 first:border-t-0 first:pt-0"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-stretch">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden bg-black sm:h-32 sm:w-32">
          <Image
            src={mix.artworkUrl || "/images/default-cover-art.png"}
            alt=""
            fill
            className="object-cover"
            sizes="128px"
            unoptimized
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-display text-2xl tracking-[0.08em] text-white sm:text-3xl">
                {mix.title}
              </h3>
              {mix.description ? (
                <p className="mt-1 text-sm text-zinc-500">{mix.description}</p>
              ) : null}
              {showError ? (
                <p className="mt-2 text-sm text-red-300">{showError}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void toggleMix(mix)}
                disabled={!hasSource}
                className="inline-flex h-11 min-w-11 items-center justify-center bg-white px-4 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-steel disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={
                  isPlaying ? `Pause ${mix.title}` : `Play ${mix.title}`
                }
              >
                {isPlaying ? "Pause" : "Play"}
              </button>

              <a
                href={mix.downloadUrl}
                className="inline-flex h-11 items-center justify-center border border-white/25 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-200 transition hover:border-white hover:text-white"
              >
                Download
              </a>

              <MixShareMenu title={mix.title} sharePath={mix.pageUrl} />
            </div>
          </div>

          <div className="mt-5">
            <label className="sr-only" htmlFor={`seek-${mix.id}`}>
              Seek {mix.title}
            </label>
            <input
              id={`seek-${mix.id}`}
              className="mix-seek h-1 w-full cursor-pointer appearance-none bg-transparent"
              type="range"
              min={0}
              max={Math.max(displayDuration, 0)}
              step={0.1}
              value={Math.min(displayCurrent, displayDuration || 0)}
              disabled={!isActive || !displayDuration}
              onChange={(event) => seek(Number(event.target.value))}
              style={{
                background: `linear-gradient(to right, #ffffff ${progress * 100}%, rgba(255,255,255,0.2) ${progress * 100}%)`,
              }}
            />
            <div className="mt-2 flex items-center justify-between text-xs tabular-nums text-zinc-500">
              <span>{formatTime(displayCurrent)}</span>
              <span>{formatTime(displayDuration)}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
