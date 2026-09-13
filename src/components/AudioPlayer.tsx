"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { MixShareMenu } from "@/components/MixShareMenu";
import { useMixPlayback } from "@/components/MixPlaybackProvider";
import type { Mix } from "@/lib/mixes";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatPlays(count: number) {
  return new Intl.NumberFormat("en-US").format(count);
}

function fallbackPeaks(count = 180) {
  return Array.from({ length: count }, (_, index) => {
    const wave =
      0.28 +
      0.5 * Math.abs(Math.sin(index / 5.5)) +
      0.22 * Math.abs(Math.sin(index / 2.1));
    return wave;
  });
}

type AudioPlayerProps = {
  mix: Mix;
};

export function AudioPlayer({ mix }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveRef = useRef<HTMLCanvasElement | null>(null);
  const countedRef = useRef(false);
  const playTokenRef = useRef(0);
  const { activeMixId, requestPlay, clearIfActive } = useMixPlayback();
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [peaks, setPeaks] = useState<number[]>(fallbackPeaks());
  const [hasArt, setHasArt] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plays, setPlays] = useState(mix.playCount);
  const hasSource = Boolean(mix.streamUrl);

  useEffect(() => {
    let cancelled = false;
    // Defer peaks so they don't compete with audio startup.
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(mix.peaksUrl);
          if (!response.ok) return;
          const data = (await response.json()) as { peaks?: number[] };
          if (!cancelled && data.peaks?.length) setPeaks(data.peaks);
        } catch {
          // keep fallback peaks
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mix.peaksUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      setPlaying(false);
      clearIfActive(mix.id);
      countedRef.current = false;
    };
    const onError = () => {
      // Allow a clean retry after a bad/cached response.
      audio.dataset.loaded = "";
      setPlaying(false);
      clearIfActive(mix.id);
      setError("Unable to stream this mix. Sync Google Drive in /admin/mixes.");
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [mix.streamUrl, mix.id, clearIfActive]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (activeMixId !== mix.id) {
      // Invalidate any in-flight play() so its rejection is ignored.
      playTokenRef.current += 1;
      if (!audio.paused) audio.pause();
      setPlaying(false);
    }
  }, [activeMixId, mix.id]);

  useEffect(() => {
    const canvas = waveRef.current;
    if (!canvas || !peaks.length) return;

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 64;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const progress = duration > 0 ? current / duration : 0;
    const barWidth = width / peaks.length;
    const mid = height / 2;

    peaks.forEach((peak, index) => {
      const amp = Math.max(0.08, peak) * (height * 0.42);
      const x = index * barWidth;
      const played = index / peaks.length <= progress;
      ctx.fillStyle = played ? "#ffffff" : "rgba(255,255,255,0.28)";
      ctx.fillRect(x + barWidth * 0.2, mid - amp, barWidth * 0.6, amp * 2);
    });
  }, [peaks, current, duration]);

  async function recordPlay() {
    if (countedRef.current) return;
    countedRef.current = true;
    try {
      const response = await fetch(
        `/api/mixes/${encodeURIComponent(mix.id)}/play`,
        { method: "POST" },
      );
      if (!response.ok) return;
      const data = (await response.json()) as { plays?: number };
      if (typeof data.plays === "number") setPlays(data.plays);
    } catch {
      // ignore count errors
    }
  }

  function waitForCanPlay(audio: HTMLAudioElement) {
    return new Promise<void>((resolve, reject) => {
      if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        resolve();
        return;
      }

      const onReady = () => {
        cleanup();
        resolve();
      };
      const onFail = () => {
        cleanup();
        reject(
          new Error(
            audio.error?.message ||
              "Failed to load because no supported source was found.",
          ),
        );
      };
      const cleanup = () => {
        audio.removeEventListener("canplay", onReady);
        audio.removeEventListener("error", onFail);
      };

      audio.addEventListener("canplay", onReady, { once: true });
      audio.addEventListener("error", onFail, { once: true });
    });
  }

  async function ensureSource(audio: HTMLAudioElement) {
    const needsReload =
      audio.dataset.loaded !== "1" ||
      Boolean(audio.error) ||
      audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE;

    if (!needsReload && audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      return;
    }

    audio.pause();
    // Prefer the typed <source> child; fall back to src attribute.
    if (!audio.querySelector("source") && !audio.src) {
      audio.src = mix.streamUrl;
    }
    audio.load();
    audio.dataset.loaded = "1";
    await waitForCanPlay(audio);
  }

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !hasSource) return;

    if (playing) {
      playTokenRef.current += 1;
      audio.pause();
      setPlaying(false);
      clearIfActive(mix.id);
      return;
    }

    const token = ++playTokenRef.current;
    setError(null);
    requestPlay(mix.id);

    try {
      // Attach src only when playing so the page doesn't prefetch every mix.
      await ensureSource(audio);
      if (token !== playTokenRef.current) return;

      await audio.play();
      // Another mix (or pause) won the race — bail quietly.
      if (token !== playTokenRef.current) {
        audio.pause();
        return;
      }
      setPlaying(true);
      void recordPlay();
    } catch (err) {
      if (token !== playTokenRef.current) return;

      const message = err instanceof Error ? err.message : String(err);
      const interrupted =
        (err instanceof DOMException && err.name === "AbortError") ||
        message.includes("interrupted by a call to pause");

      audio.dataset.loaded = "";
      setPlaying(false);
      if (interrupted) {
        clearIfActive(mix.id);
        return;
      }

      console.error("Unable to play mix:", err);
      clearIfActive(mix.id);
      setError("Playback failed. Sync Google Drive in /admin/mixes.");
    }
  }

  function seekFromWave(clientX: number) {
    const audio = audioRef.current;
    const canvas = waveRef.current;
    if (!audio || !canvas || !duration) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrent(audio.currentTime);
  }

  return (
    <article
      id={`mix-${mix.id}`}
      className="border-t border-white/10 py-6 first:border-t-0 first:pt-0"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-stretch">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden bg-black sm:h-32 sm:w-32">
          <Image
            src={hasArt ? mix.artworkUrl : "/images/default-cover-art.png"}
            alt=""
            fill
            className="object-cover"
            sizes="128px"
            unoptimized={hasArt}
            onError={() => setHasArt(false)}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-display text-2xl tracking-[0.08em] text-white sm:text-3xl">
                {mix.title}
              </h3>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500">
                {formatPlays(plays)} {plays === 1 ? "play" : "plays"}
              </p>
              {mix.description ? (
                <p className="mt-1 text-sm text-zinc-500">{mix.description}</p>
              ) : null}
              {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                disabled={!hasSource}
                className="inline-flex h-11 min-w-11 items-center justify-center bg-white px-4 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-steel disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={playing ? `Pause ${mix.title}` : `Play ${mix.title}`}
              >
                {playing ? "Pause" : "Play"}
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

          <div className="mt-4">
            <canvas
              ref={waveRef}
              className="h-16 w-full cursor-pointer"
              onClick={(event) => seekFromWave(event.clientX)}
              role="slider"
              aria-label={`Seek ${mix.title}`}
              aria-valuemin={0}
              aria-valuemax={Math.floor(duration || 0)}
              aria-valuenow={Math.floor(current || 0)}
            />
            <div className="mt-2 flex items-center justify-between text-xs tabular-nums text-zinc-500">
              <span>{formatTime(current)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>

      {hasSource ? (
        <audio ref={audioRef} preload="none">
          <source src={mix.streamUrl} type="audio/mpeg" />
        </audio>
      ) : null}
    </article>
  );
}
