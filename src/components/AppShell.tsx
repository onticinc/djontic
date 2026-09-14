"use client";

import { MixPlaybackProvider } from "@/components/MixPlaybackProvider";
import { NowPlayingBar } from "@/components/NowPlayingBar";
import { SiteBanner } from "@/components/SiteBanner";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <MixPlaybackProvider>
      <SiteBanner />
      <SiteHeader />
      <main className="flex-1 pb-24">{children}</main>
      <SiteFooter />
      <NowPlayingBar />
    </MixPlaybackProvider>
  );
}
