"use client";

import { AudioPlayer } from "@/components/AudioPlayer";
import { MixPlaybackProvider } from "@/components/MixPlaybackProvider";
import type { Mix } from "@/lib/mixes";

export function MixList({ mixes }: { mixes: Mix[] }) {
  return (
    <MixPlaybackProvider>
      {mixes.map((mix) => (
        <AudioPlayer key={mix.id} mix={mix} />
      ))}
    </MixPlaybackProvider>
  );
}
