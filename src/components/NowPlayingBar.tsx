"use client";

import Image from "next/image";
import Link from "next/link";
import { useMixPlayback } from "@/components/MixPlaybackProvider";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function NowPlayingBar() {
  const {
    activeMix,
    playing,
    current,
    duration,
    pause,
    playMix,
    seek,
    clear,
  } = useMixPlayback();

  if (!activeMix) return null;

  const progress = duration > 0 ? Math.min(1, current / duration) : 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
      <div className="pointer-events-auto border-t border-border bg-overlay backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden bg-surface sm:h-12 sm:w-12">
            <Image
              src={activeMix.artworkUrl || "/images/default-cover-art.png"}
              alt=""
              fill
              className="object-cover"
              sizes="48px"
              unoptimized
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  void (playing ? pause() : playMix(activeMix))
                }
                className="inline-flex h-9 min-w-9 items-center justify-center bg-foreground px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-background transition hover:opacity-80"
                aria-label={playing ? `Pause ${activeMix.title}` : `Play ${activeMix.title}`}
              >
                {playing ? "Pause" : "Play"}
              </button>
              <Link
                href={activeMix.pageUrl}
                className="min-w-0 truncate font-display text-base tracking-[0.04em] text-foreground hover:text-steel"
              >
                {activeMix.title}
              </Link>
              <button
                type="button"
                onClick={clear}
                className="ml-auto shrink-0 px-2 text-xs uppercase tracking-[0.14em] text-muted-2 hover:text-foreground"
                aria-label="Stop playback"
              >
                Close
              </button>
            </div>

            <div className="mt-2 flex items-center gap-3">
              <span className="w-10 shrink-0 text-[10px] tabular-nums text-muted-2">
                {formatTime(current)}
              </span>
              <input
                className="mix-seek h-1 w-full cursor-pointer appearance-none bg-transparent"
                type="range"
                min={0}
                max={Math.max(duration, 0)}
                step={0.1}
                value={Math.min(current, duration || 0)}
                disabled={!duration}
                onChange={(event) => seek(Number(event.target.value))}
                aria-label={`Seek ${activeMix.title}`}
                style={{
                  background: `linear-gradient(to right, var(--foreground) ${progress * 100}%, var(--track) ${progress * 100}%)`,
                }}
              />
              <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-muted-2">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
