import type { PublicWeddingPost } from "@/lib/wedding-types";

export function PhotographerCredit({
  post,
  className = "",
}: {
  post: Pick<PublicWeddingPost, "photographerName" | "photographerUrl">;
  className?: string;
}) {
  const name = post.photographerName?.trim();
  if (!name) return null;
  const href = post.photographerUrl?.trim() || null;

  return (
    <p className={`text-xs text-muted ${className}`.trim()}>
      Photos by{" "}
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline-offset-4 transition hover:underline"
        >
          {name}
        </a>
      ) : (
        <span className="text-foreground">{name}</span>
      )}
    </p>
  );
}
