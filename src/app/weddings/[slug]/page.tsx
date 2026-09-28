import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WeddingRecapDetail } from "@/components/WeddingRecapDetail";
import { getWeddingPostBySlug } from "@/lib/weddings";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getWeddingPostBySlug(slug);
  if (!post) {
    return { title: "Wedding Recap" };
  }
  return {
    title: post.title,
    description: post.excerpt || `Wedding recap: ${post.title}`,
  };
}

export default async function WeddingRecapPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getWeddingPostBySlug(slug);
  if (!post) notFound();

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <Link
        href="/weddings"
        className="text-xs uppercase tracking-[0.16em] text-muted-2 underline-offset-4 hover:text-foreground hover:underline"
      >
        Back to weddings
      </Link>
      <div className="mt-8">
        <WeddingRecapDetail post={post} />
      </div>
    </section>
  );
}
