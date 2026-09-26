import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MixList } from "@/components/MixList";
import { getFeaturedMixes, getMixById } from "@/lib/mixes";

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const found = await getMixById(id);
  if (!found || !found.mix.visible) {
    return { title: "Mix not found" };
  }

  const title = found.mix.title;
  const description = `Listen to ${title} by DJ Ontic.`;
  const artworkUrl = `/api/mixes/${encodeURIComponent(id)}/artwork`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | DJ Ontic`,
      description,
      type: "music.song",
      images: [{ url: artworkUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | DJ Ontic`,
      description,
      images: [artworkUrl],
    },
  };
}

export default async function MixPage({ params }: Props) {
  const { id } = await params;
  const found = await getMixById(id);
  if (!found || !found.mix.visible) notFound();

  const mixes = await getFeaturedMixes();
  const mix = mixes.mixes.find((item) => item.id === id);
  if (!mix) notFound();

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-steel">
          DJ Ontic Mix
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
          {mix.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-zinc-400">
          Share this mix or press play below.
        </p>
      </div>

      <div className="mt-10">
        <MixList mixes={[mix]} />
      </div>

      <p className="mt-8 text-sm text-zinc-500">
        <a href="/" className="text-zinc-300 underline-offset-4 hover:underline">
          ← All featured mixes
        </a>
      </p>
    </section>
  );
}
