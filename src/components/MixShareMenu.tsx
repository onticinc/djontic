"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MixShareMenuProps = {
  title: string;
  sharePath: string;
};

export function MixShareMenu({ title, sharePath }: MixShareMenuProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  const absoluteUrl = useMemo(() => {
    if (typeof window === "undefined") return sharePath;
    return new URL(sharePath, window.location.origin).toString();
  }, [sharePath]);

  const text = `Listen to ${title} by DJ Ontic`;
  const encodedUrl = encodeURIComponent(absoluteUrl);
  const encodedText = encodeURIComponent(text);

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | PointerEvent) {
      const root = rootRef.current;
      if (!root || root.contains(event.target as Node)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function shareNative() {
    if (!canNativeShare) return;
    try {
      await navigator.share({
        title: `${title} | DJ Ontic`,
        text,
        url: absoluteUrl,
      });
      setOpen(false);
    } catch {
      // User cancelled — leave the menu as-is.
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-11 items-center justify-center border border-white/25 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-200 transition hover:border-white hover:text-white"
      >
        Share
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 min-w-48 border border-white/15 bg-black/95 p-2 shadow-xl"
        >
          {canNativeShare ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => void shareNative()}
              className="block w-full px-3 py-2 text-left text-xs uppercase tracking-[0.14em] text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              Share via…
            </button>
          ) : null}
          <a
            role="menuitem"
            href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 text-xs uppercase tracking-[0.14em] text-zinc-300 hover:bg-white/5 hover:text-white"
            onClick={() => setOpen(false)}
          >
            X / Twitter
          </a>
          <a
            role="menuitem"
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 text-xs uppercase tracking-[0.14em] text-zinc-300 hover:bg-white/5 hover:text-white"
            onClick={() => setOpen(false)}
          >
            Facebook
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={() => void copyLink()}
            className="block w-full px-3 py-2 text-left text-xs uppercase tracking-[0.14em] text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
