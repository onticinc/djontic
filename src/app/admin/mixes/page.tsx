import type { Metadata } from "next";
import { MixesAdmin } from "@/components/MixesAdmin";

export const metadata: Metadata = {
  title: "Manage Mixes",
  robots: { index: false, follow: false },
};

export default function AdminMixesPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-steel">Backend</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
          Manage Mixes
        </h1>
        <p className="mt-4 text-base leading-relaxed text-zinc-400">
          Control featured mix order, visibility, categories (and category
          order), and cover image URLs. Sync pulls new files from Google Drive —
          new tracks stay hidden until you enable them. After saving, commit{" "}
          <code className="text-zinc-200">data/mixes.json</code> so production
          stays in sync.
        </p>
      </div>

      <div className="mt-10">
        <MixesAdmin />
      </div>
    </section>
  );
}
