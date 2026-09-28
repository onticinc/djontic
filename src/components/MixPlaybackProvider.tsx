"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Mix } from "@/lib/mix-types";

export type PlayableMix = Pick<
  Mix,
  "id" | "title" | "streamUrl" | "artworkUrl" | "pageUrl" | "downloadUrl"
>;

type MixPlaybackContextValue = {
  activeMix: PlayableMix | null;
  playing: boolean;
  current: number;
  duration: number;
  error: string | null;
  playMix: (mix: PlayableMix) => Promise<void>;
  pause: () => void;
  toggleMix: (mix: PlayableMix) => Promise<void>;
  seek: (seconds: number) => void;
  clear: () => void;
};

const MixPlaybackContext = createContext<MixPlaybackContextValue | null>(null);

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
      reject(new Error("Unable to load this mix stream."));
    };
    const cleanup = () => {
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("error", onFail);
    };

    audio.addEventListener("canplay", onReady, { once: true });
    audio.addEventListener("error", onFail, { once: true });
  });
}

export function MixPlaybackProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTokenRef = useRef(0);
  const countedIdRef = useRef<string | null>(null);
  const [activeMix, setActiveMix] = useState<PlayableMix | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      countedIdRef.current = null;
    };
    const onError = () => {
      setPlaying(false);
      setError("Unable to stream this mix. Sync Google Drive in /admin/mixes.");
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, []);

  const recordPlay = useCallback(async (mixId: string) => {
    if (countedIdRef.current === mixId) return;
    countedIdRef.current = mixId;
    try {
      await fetch(`/api/mixes/${encodeURIComponent(mixId)}/play`, {
        method: "POST",
      });
    } catch {
      // ignore count errors
    }
  }, []);

  const pause = useCallback(() => {
    playTokenRef.current += 1;
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  const clear = useCallback(() => {
    playTokenRef.current += 1;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setActiveMix(null);
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setError(null);
    countedIdRef.current = null;
  }, []);

  const playMix = useCallback(
    async (mix: PlayableMix) => {
      const audio = audioRef.current;
      if (!audio || !mix.streamUrl) return;

      const token = ++playTokenRef.current;
      setError(null);
      setActiveMix(mix);

      try {
        const sameSource =
          audio.dataset.mixId === mix.id &&
          Boolean(audio.src) &&
          !audio.error;

        if (!sameSource) {
          audio.pause();
          audio.src = mix.streamUrl;
          audio.dataset.mixId = mix.id;
          audio.load();
          setCurrent(0);
          setDuration(0);
          countedIdRef.current = null;
          await waitForCanPlay(audio);
          if (token !== playTokenRef.current) return;
        }

        await audio.play();
        if (token !== playTokenRef.current) {
          audio.pause();
          return;
        }
        setPlaying(true);
        void recordPlay(mix.id);
      } catch (err) {
        if (token !== playTokenRef.current) return;

        const message = err instanceof Error ? err.message : String(err);
        const interrupted =
          (err instanceof DOMException && err.name === "AbortError") ||
          message.includes("interrupted by a call to pause");

        setPlaying(false);
        if (interrupted) return;

        console.error("Unable to play mix:", err);
        setError(
          "Playback failed. Confirm the Drive folder is shared as Anyone with the link, then sync again in /admin/mixes.",
        );
      }
    },
    [recordPlay],
  );

  const toggleMix = useCallback(
    async (mix: PlayableMix) => {
      if (activeMix?.id === mix.id && playing) {
        pause();
        return;
      }
      await playMix(mix);
    },
    [activeMix?.id, pause, playMix, playing],
  );

  const seek = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;
      const next = Math.min(Math.max(0, seconds), duration);
      audio.currentTime = next;
      setCurrent(next);
    },
    [duration],
  );

  const value = useMemo(
    () => ({
      activeMix,
      playing,
      current,
      duration,
      error,
      playMix,
      pause,
      toggleMix,
      seek,
      clear,
    }),
    [
      activeMix,
      playing,
      current,
      duration,
      error,
      playMix,
      pause,
      toggleMix,
      seek,
      clear,
    ],
  );

  return (
    <MixPlaybackContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="none" className="hidden" />
    </MixPlaybackContext.Provider>
  );
}

export function useMixPlayback() {
  const context = useContext(MixPlaybackContext);
  if (!context) {
    throw new Error("useMixPlayback must be used within MixPlaybackProvider");
  }
  return context;
}
