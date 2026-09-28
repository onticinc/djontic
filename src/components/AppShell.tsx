"use client";

import { MixPlaybackProvider } from "@/components/MixPlaybackProvider";
import { NowPlayingBar } from "@/components/NowPlayingBar";
import { SiteBanner } from "@/components/SiteBanner";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <MixPlaybackProvider>
      <div className={isAdmin ? "dark bg-background text-foreground" : undefined}>
        <SiteBanner />
        <SiteHeader />
        <main className="flex-1 bg-background pb-24">{children}</main>
        <SiteFooter />
        <NowPlayingBar />
      </div>
    </MixPlaybackProvider>
  );
}
