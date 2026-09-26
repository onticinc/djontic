"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { AdminGate } from "@/components/AdminGate";
import { RichTextEditor } from "@/components/RichTextEditor";
import { sanitizeWeddingHtml } from "@/lib/sanitize-html";
import {
  allocateSlug,
  detectVideoProvider,
  slugifyTitle,
  type WeddingPhoto,
  type WeddingPost,
  type WeddingVideo,
} from "@/lib/wedding-types";

function emptyPost(): WeddingPost {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    slug: "",
    title: "",
    date: "",
    location: "",
    city: "",
    state: "",
    excerpt: "",
    bodyHtml: "",
    coverUrl: null,
    photos: [],
    videos: [],
    published: false,
    updatedAt: now,
  };
}

function WeddingsAdminPanel() {
  const { signOut } = useAuthActions();
  const remotePosts = useQuery(api.weddings.listAll);
  const saveWedding = useMutation(api.weddings.save);
  const removeWedding = useMutation(api.weddings.remove);

  const [posts, setPosts] = useState<WeddingPost[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<WeddingPost | null>(null);
  const [videoDraft, setVideoDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isNewDraft, setIsNewDraft] = useState(false);

  useEffect(() => {
    if (!remotePosts) return;
    setPosts(remotePosts);
  }, [remotePosts]);

  function startCreate() {
    const post = emptyPost();
    setEditingId(post.id);
    setDraft(post);
    setIsNewDraft(true);
    setStatus(null);
  }

  function startEdit(post: WeddingPost) {
    setEditingId(post.id);
    setDraft({ ...post });
    setIsNewDraft(false);
    setStatus(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setIsNewDraft(false);
  }

  function updateDraft(patch: Partial<WeddingPost>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  async function saveDraft() {
    if (!draft) return;
    if (!draft.title.trim() || !draft.date.trim()) {
      setStatus("Title and date are required.");
      return;
    }

    const used = new Set(
      posts.filter((post) => post.id !== draft.id).map((post) => post.slug),
    );
    const nextDraft: WeddingPost = {
      ...draft,
      title: draft.title.trim(),
      slug: allocateSlug(draft.slug || draft.title, used),
      location: draft.location.trim(),
      city: draft.city.trim(),
      state: draft.state.trim(),
      excerpt: draft.excerpt.trim(),
      bodyHtml: sanitizeWeddingHtml(draft.bodyHtml),
      updatedAt: new Date().toISOString(),
    };

    setBusy(true);
    setStatus(null);
    try {
      const id = await saveWedding({
        id: isNewDraft ? undefined : (nextDraft.id as Id<"weddings">),
        post: {
          slug: nextDraft.slug,
          title: nextDraft.title,
          date: nextDraft.date,
          location: nextDraft.location,
          city: nextDraft.city,
          state: nextDraft.state,
          excerpt: nextDraft.excerpt,
          bodyHtml: nextDraft.bodyHtml,
          coverUrl: nextDraft.coverUrl,
          photos: nextDraft.photos,
          videos: nextDraft.videos,
          published: nextDraft.published,
        },
      });
      const saved = { ...nextDraft, id };
      setDraft(saved);
      setEditingId(saved.id);
      setIsNewDraft(false);
      setStatus("Wedding recap saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function deletePost(post: WeddingPost) {
    const confirmed = window.confirm(
      `Delete “${post.title || "Untitled"}”? This cannot be undone.`,
    );
    if (!confirmed) return;
    setBusy(true);
    setStatus(null);
    try {
      await removeWedding({ id: post.id as Id<"weddings"> });
      if (editingId === post.id) {
        setEditingId(null);
        setDraft(null);
      }
      setStatus("Wedding recap deleted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(file: File): Promise<{ id: string; url: string } | null> {
    setUploading(true);
    setStatus(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/admin/weddings/upload", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as {
        error?: string;
        id?: string;
        url?: string;
      };
      if (!response.ok || !data.id || !data.url) {
        setStatus(data.error || "Upload failed");
        return null;
      }
      return { id: data.id, url: data.url };
    } finally {
      setUploading(false);
    }
  }

  async function onCoverSelected(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file || !draft) return;
    const uploaded = await uploadImage(file);
    if (uploaded) updateDraft({ coverUrl: uploaded.url });
  }

  async function onPhotosSelected(fileList: FileList | null) {
    if (!fileList?.length || !draft) return;
    const nextPhotos = [...draft.photos];
    for (const file of Array.from(fileList)) {
      const uploaded = await uploadImage(file);
      if (!uploaded) continue;
      nextPhotos.push({
        id: uploaded.id,
        url: uploaded.url,
        alt: "",
      });
    }
    updateDraft({ photos: nextPhotos });
  }

  function removePhoto(photoId: string) {
    if (!draft) return;
    updateDraft({
      photos: draft.photos.filter((photo) => photo.id !== photoId),
    });
  }

  function updatePhotoAlt(photoId: string, alt: string) {
    if (!draft) return;
    updateDraft({
      photos: draft.photos.map((photo) =>
        photo.id === photoId ? { ...photo, alt } : photo,
      ),
    });
  }

  function movePhoto(photoId: string, direction: -1 | 1) {
    if (!draft) return;
    const index = draft.photos.findIndex((photo) => photo.id === photoId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= draft.photos.length) return;
    const copy = [...draft.photos];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    updateDraft({ photos: copy });
  }

  function addVideo() {
    if (!draft) return;
    const url = videoDraft.trim();
    if (!url) return;
    try {
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      setStatus("Enter a valid video URL.");
      return;
    }
    const video: WeddingVideo = {
      id: crypto.randomUUID(),
      url,
      provider: detectVideoProvider(url),
    };
    updateDraft({ videos: [...draft.videos, video] });
    setVideoDraft("");
  }

  function removeVideo(videoId: string) {
    if (!draft) return;
    updateDraft({
      videos: draft.videos.filter((video) => video.id !== videoId),
    });
  }

  if (remotePosts === undefined) {
    return <p className="text-sm text-zinc-500">Loading wedding recaps…</p>;
  }

  if (draft) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy || uploading}
            onClick={() => void saveDraft()}
            className="inline-flex h-11 items-center bg-white px-5 text-xs font-semibold uppercase tracking-[0.16em] text-black disabled:opacity-50"
          >
            Save recap
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={cancelEdit}
            className="inline-flex h-11 items-center border border-white/25 px-5 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-200 disabled:opacity-50"
          >
            Back to list
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex h-11 items-center px-3 text-xs uppercase tracking-[0.16em] text-zinc-500 hover:text-white"
          >
            Log out
          </button>
        </div>

        {status ? <p className="text-sm text-zinc-400">{status}</p> : null}
        {uploading ? (
          <p className="text-sm text-zinc-500">Uploading image…</p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block text-xs uppercase tracking-[0.16em] text-zinc-500">
            Title
            <input
              type="text"
              value={draft.title}
              onChange={(event) => {
                const title = event.target.value;
                updateDraft({
                  title,
                  slug: draft.slug ? draft.slug : slugifyTitle(title),
                });
              }}
              className="mt-2 w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
            />
          </label>
          <label className="block text-xs uppercase tracking-[0.16em] text-zinc-500">
            Slug
            <input
              type="text"
              value={draft.slug}
              onChange={(event) =>
                updateDraft({ slug: slugifyTitle(event.target.value) })
              }
              className="mt-2 w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
            />
          </label>
          <label className="block text-xs uppercase tracking-[0.16em] text-zinc-500">
            Date
            <input
              type="date"
              value={draft.date}
              onChange={(event) => updateDraft({ date: event.target.value })}
              className="mt-2 w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-white/40"
            />
          </label>
          <label className="flex items-center gap-2 self-end text-xs uppercase tracking-[0.16em] text-zinc-400">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(event) =>
                updateDraft({ published: event.target.checked })
              }
              className="size-4 accent-white"
            />
            Published
          </label>
          <label className="block text-xs uppercase tracking-[0.16em] text-zinc-500">
            Location
            <input
              type="text"
              value={draft.location}
              onChange={(event) =>
                updateDraft({ location: event.target.value })
              }
              className="mt-2 w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
            />
          </label>
          <label className="block text-xs uppercase tracking-[0.16em] text-zinc-500">
            City
            <input
              type="text"
              value={draft.city}
              onChange={(event) => updateDraft({ city: event.target.value })}
              className="mt-2 w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
            />
          </label>
          <label className="block text-xs uppercase tracking-[0.16em] text-zinc-500">
            State
            <input
              type="text"
              value={draft.state}
              onChange={(event) => updateDraft({ state: event.target.value })}
              className="mt-2 w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
            />
          </label>
        </div>

        <label className="block text-xs uppercase tracking-[0.16em] text-zinc-500">
          Excerpt
          <textarea
            value={draft.excerpt}
            onChange={(event) => updateDraft({ excerpt: event.target.value })}
            rows={3}
            className="mt-2 w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
          />
        </label>

        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
            Body
          </p>
          <div className="mt-2">
            <RichTextEditor
              value={draft.bodyHtml}
              onChange={(bodyHtml) => updateDraft({ bodyHtml })}
              disabled={busy}
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
            Cover image
          </p>
          {draft.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.coverUrl}
              alt=""
              className="max-h-48 border border-white/10 object-cover"
            />
          ) : null}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={busy || uploading}
            onChange={(event) => {
              void onCoverSelected(event.target.files);
              event.target.value = "";
            }}
            className="block w-full text-sm text-zinc-400 file:mr-3 file:border file:border-white/20 file:bg-zinc-900 file:px-3 file:py-2 file:text-xs file:uppercase file:tracking-[0.14em] file:text-zinc-200"
          />
          {draft.coverUrl ? (
            <button
              type="button"
              onClick={() => updateDraft({ coverUrl: null })}
              className="text-xs uppercase tracking-[0.16em] text-zinc-500 hover:text-white"
            >
              Remove cover
            </button>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
            Photo gallery
          </p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            disabled={busy || uploading}
            onChange={(event) => {
              void onPhotosSelected(event.target.files);
              event.target.value = "";
            }}
            className="block w-full text-sm text-zinc-400 file:mr-3 file:border file:border-white/20 file:bg-zinc-900 file:px-3 file:py-2 file:text-xs file:uppercase file:tracking-[0.14em] file:text-zinc-200"
          />
          <ul className="space-y-3">
            {draft.photos.map((photo: WeddingPhoto, index) => (
              <li
                key={photo.id}
                className="grid gap-3 border border-white/10 bg-zinc-900 px-3 py-3 sm:grid-cols-[120px_1fr_auto] sm:items-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.alt || ""}
                  className="h-24 w-full object-cover"
                />
                <input
                  type="text"
                  value={photo.alt}
                  placeholder="Alt text"
                  onChange={(event) =>
                    updatePhotoAlt(photo.id, event.target.value)
                  }
                  className="w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => movePhoto(photo.id, -1)}
                    className="h-9 w-9 border border-white/15 text-zinc-300 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === draft.photos.length - 1}
                    onClick={() => movePhoto(photo.id, 1)}
                    className="h-9 w-9 border border-white/15 text-zinc-300 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="px-2 text-xs uppercase tracking-[0.14em] text-zinc-500 hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
            Videos
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              value={videoDraft}
              placeholder="YouTube or Vimeo URL"
              onChange={(event) => setVideoDraft(event.target.value)}
              className="w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
            />
            <button
              type="button"
              onClick={addVideo}
              className="inline-flex h-10 shrink-0 items-center justify-center border border-white/25 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-200"
            >
              Add video
            </button>
          </div>
          <ul className="space-y-2">
            {draft.videos.map((video) => (
              <li
                key={video.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-zinc-900 px-3 py-3 text-sm text-zinc-300"
              >
                <span className="min-w-0 truncate">
                  <span className="mr-2 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                    {video.provider}
                  </span>
                  {video.url}
                </span>
                <button
                  type="button"
                  onClick={() => removeVideo(video.id)}
                  className="text-xs uppercase tracking-[0.14em] text-zinc-500 hover:text-white"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={startCreate}
          className="inline-flex h-11 items-center bg-white px-5 text-xs font-semibold uppercase tracking-[0.16em] text-black disabled:opacity-50"
        >
          New recap
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex h-11 items-center px-3 text-xs uppercase tracking-[0.16em] text-zinc-500 hover:text-white"
        >
          Log out
        </button>
      </div>

      {status ? <p className="text-sm text-zinc-400">{status}</p> : null}

      {posts.length === 0 ? (
        <p className="border-t border-white/10 py-8 text-sm text-zinc-500">
          No wedding recaps yet. Create one to get started.
        </p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li
              key={post.id}
              className="flex flex-col gap-3 border border-white/10 bg-zinc-900 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-white">
                  {post.title || "Untitled"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {post.date || "No date"}
                  {post.slug ? ` · /weddings/${post.slug}` : ""}
                  {post.published ? " · published" : " · draft"}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => startEdit(post)}
                  className="text-xs uppercase tracking-[0.16em] text-zinc-300 hover:text-white"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deletePost(post)}
                  className="text-xs uppercase tracking-[0.16em] text-zinc-500 hover:text-white disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function WeddingsAdmin() {
  return (
    <AdminGate unlockLabel="wedding recaps">
      <WeddingsAdminPanel />
    </AdminGate>
  );
}
