"use client";

import { AudioPlayer } from "@/components/AudioPlayer";
import type { Mix } from "@/lib/mix-types";

type MixGroup = {
  key: string;
  label: string | null;
  mixes: Mix[];
};

function groupMixes(mixes: Mix[], categoryOrder: string[] = []): MixGroup[] {
  const featured = mixes.filter((mix) => mix.featured);
  const rest = mixes.filter((mix) => !mix.featured);
  const groups: MixGroup[] = [];
  const indexByKey = new Map<string, number>();

  if (featured.length > 0) {
    groups.push({ key: "featured", label: "Featured", mixes: featured });
  }

  for (const mix of rest) {
    const label = mix.category?.trim() || null;
    const key = label ? `cat:${label.toLowerCase()}` : "uncategorized";
    const existing = indexByKey.get(key);
    if (existing === undefined) {
      indexByKey.set(key, groups.length);
      groups.push({ key, label, mixes: [mix] });
    } else {
      groups[existing].mixes.push(mix);
    }
  }

  const orderIndex = new Map(
    categoryOrder.map((name, index) => [name.toLowerCase(), index]),
  );
  const named = groups
    .filter(
      (group) => group.key !== "uncategorized" && group.key !== "featured",
    )
    .sort((a, b) => {
      const aIndex = orderIndex.get((a.label ?? "").toLowerCase()) ?? 9999;
      const bIndex = orderIndex.get((b.label ?? "").toLowerCase()) ?? 9999;
      return aIndex - bIndex;
    });
  const featuredGroup = groups.filter((group) => group.key === "featured");
  const uncategorized = groups.filter((group) => group.key === "uncategorized");
  return [...featuredGroup, ...named, ...uncategorized];
}

export function MixList({
  mixes,
  categoryOrder = [],
}: {
  mixes: Mix[];
  categoryOrder?: string[];
}) {
  const groups = groupMixes(mixes, categoryOrder);
  const showHeadings = groups.length > 1 || Boolean(groups[0]?.label);

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section
          key={group.key}
          className="mesh-panel border border-border bg-panel px-4 py-2 sm:px-8 sm:py-4"
        >
          {showHeadings ? (
            <h2 className="mb-5 font-display text-xl tracking-[0.06em] text-foreground sm:text-2xl">
              {group.label ?? "Uncategorized"}
            </h2>
          ) : null}
          {group.mixes.map((mix) => (
            <AudioPlayer key={mix.id} mix={mix} />
          ))}
        </section>
      ))}
    </div>
  );
}
