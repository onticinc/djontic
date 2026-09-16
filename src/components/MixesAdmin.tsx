"use client";

import { useEffect, useMemo, useState } from "react";
import {
  syncCategoryOrder,
  type MixRecord,
  type MixesStore,
} from "@/lib/mix-types";

export function MixesAdmin() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [store, setStore] = useState<MixesStore | null>(null);
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [driveStatus, setDriveStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggingCategory, setDraggingCategory] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  const mixes = useMemo(
    () => [...(store?.mixes ?? [])].sort((a, b) => a.order - b.order),
    [store],
  );

  const categories = useMemo(
    () => syncCategoryOrder(mixes, store?.categoryOrder ?? []),
    [mixes, store?.categoryOrder],
  );

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/admin/login");
      const data = (await response.json()) as {
        configured: boolean;
        authenticated: boolean;
      };
      setConfigured(data.configured);
      setAuthenticated(data.authenticated);
      if (data.authenticated) {
        await loadMixes();
        await loadDriveStatus();
      }
    })();
  }, []);

  async function loadMixes() {
    const response = await fetch("/api/admin/mixes");
    if (!response.ok) {
      setAuthenticated(false);
      return;
    }
    const data = (await response.json()) as MixesStore & {
      playCounts?: Record<string, number>;
    };
    setPlayCounts(data.playCounts ?? {});
    setStore({
      folderUrl: data.folderUrl,
      updatedAt: data.updatedAt,
      mixes: data.mixes,
      categoryOrder: data.categoryOrder ?? [],
      ignoredDriveIds: data.ignoredDriveIds ?? [],
      ignoredFilenames: data.ignoredFilenames ?? [],
    });
  }

  async function loadDriveStatus() {
    try {
      const response = await fetch("/api/admin/drive/status");
      if (!response.ok) return;
      const data = (await response.json()) as {
        ok: boolean;
        error?: string | null;
        hint?: string | null;
        fileCount?: number;
      };
      if (data.ok) {
        setDriveStatus(
          `Google Drive connected (${data.fileCount ?? 0} mp3 files).`,
        );
      } else {
        setDriveStatus([data.error, data.hint].filter(Boolean).join(" "));
      }
    } catch {
      setDriveStatus(null);
    }
  }

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus(data.error || "Login failed");
        return;
      }
      setAuthenticated(true);
      setPassword("");
      await loadMixes();
      await loadDriveStatus();
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthenticated(false);
    setStore(null);
    setPlayCounts({});
  }

  async function save(
    nextMixes: MixRecord[],
    nextCategoryOrder: string[] = categories,
    nextIgnored: {
      ignoredDriveIds?: string[];
      ignoredFilenames?: string[];
    } = {},
    successMessage = "Saved",
  ) {
    if (!store) return;
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/mixes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderUrl: store.folderUrl,
          mixes: nextMixes.map((mix, index) => ({ ...mix, order: index })),
          categoryOrder: nextCategoryOrder,
          ignoredDriveIds:
            nextIgnored.ignoredDriveIds ?? store.ignoredDriveIds,
          ignoredFilenames:
            nextIgnored.ignoredFilenames ?? store.ignoredFilenames,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error || "Save failed");
        return;
      }
      const next = data as MixesStore & { playCounts?: Record<string, number> };
      setPlayCounts(next.playCounts ?? playCounts);
      setStore({
        folderUrl: next.folderUrl,
        updatedAt: next.updatedAt,
        mixes: next.mixes,
        categoryOrder: next.categoryOrder ?? [],
        ignoredDriveIds: next.ignoredDriveIds ?? [],
        ignoredFilenames: next.ignoredFilenames ?? [],
      });
      setStatus(successMessage);
    } finally {
      setBusy(false);
    }
  }

  async function syncFromDrive() {
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/mixes/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error || "Sync failed");
        await loadDriveStatus();
        return;
      }
      setStore(data.store as MixesStore);
      setStatus(
        `Synced ${data.imported} files from Google Drive. New files default to hidden.`,
      );
      await loadDriveStatus();
    } finally {
      setBusy(false);
    }
  }

  function updateMix(id: string, patch: Partial<MixRecord>) {
    if (!store) return;
    const nextMixes = store.mixes.map((mix) =>
      mix.id === id ? { ...mix, ...patch } : mix,
    );
    setStore({
      ...store,
      mixes: nextMixes,
      categoryOrder: syncCategoryOrder(nextMixes, store.categoryOrder),
    });
  }

  function reorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    const ordered = [...mixes];
    const fromIndex = ordered.findIndex((mix) => mix.id === fromId);
    const toIndex = ordered.findIndex((mix) => mix.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const copy = [...ordered];
    const [item] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, item);
    void save(copy);
  }

  function move(id: string, direction: -1 | 1) {
    const ordered = [...mixes];
    const index = ordered.findIndex((mix) => mix.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const copy = [...ordered];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    void save(copy);
  }

  function reorderCategory(fromName: string, toName: string) {
    if (fromName === toName) return;
    const ordered = [...categories];
    const fromIndex = ordered.indexOf(fromName);
    const toIndex = ordered.indexOf(toName);
    if (fromIndex < 0 || toIndex < 0) return;
    const copy = [...ordered];
    const [item] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, item);
    void save(mixes, copy);
  }

  function moveCategory(name: string, direction: -1 | 1) {
    const ordered = [...categories];
    const index = ordered.indexOf(name);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const copy = [...ordered];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    void save(mixes, copy);
  }

  function deleteMix(mix: MixRecord) {
    if (!store) return;
    const confirmed = window.confirm(
      `Remove “${mix.title}” from the site? The Google Drive file is not deleted.`,
    );
    if (!confirmed) return;

    const nextMixes = mixes.filter((item) => item.id !== mix.id);
    const ignoredDriveIds = [...store.ignoredDriveIds];
    const ignoredFilenames = [...store.ignoredFilenames];

    if (
      mix.driveId &&
      !nextMixes.some((item) => item.driveId === mix.driveId) &&
      !ignoredDriveIds.includes(mix.driveId)
    ) {
      ignoredDriveIds.push(mix.driveId);
    }
    if (
      mix.filename &&
      !nextMixes.some((item) => item.filename === mix.filename) &&
      !ignoredFilenames.includes(mix.filename)
    ) {
      ignoredFilenames.push(mix.filename);
    }

    void save(
      nextMixes,
      syncCategoryOrder(nextMixes, store.categoryOrder),
      { ignoredDriveIds, ignoredFilenames },
      "Mix removed.",
    );
  }

  if (!configured) {
    return (
      <p className="text-zinc-400">
        Set <code className="text-zinc-200">ADMIN_PASSWORD</code> in{" "}
        <code className="text-zinc-200">.env</code> to unlock the mixes admin.
      </p>
    );
  }

  if (!authenticated) {
    return (
      <form onSubmit={login} className="max-w-sm space-y-4">
        <label className="block text-sm text-zinc-400">
          Admin password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full border border-white/15 bg-black px-3 py-2 text-white outline-none focus:border-white/40"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-11 items-center bg-white px-5 text-xs font-semibold uppercase tracking-[0.16em] text-black disabled:opacity-50"
        >
          Sign in
        </button>
        {status ? <p className="text-sm text-red-300">{status}</p> : null}
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save(mixes, categories)}
          className="inline-flex h-11 items-center bg-white px-5 text-xs font-semibold uppercase tracking-[0.16em] text-black disabled:opacity-50"
        >
          Save changes
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void syncFromDrive()}
          className="inline-flex h-11 items-center border border-white/25 px-5 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-200 disabled:opacity-50"
        >
          Sync Google Drive
        </button>
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex h-11 items-center px-3 text-xs uppercase tracking-[0.16em] text-zinc-500 hover:text-white"
        >
          Log out
        </button>
      </div>

      {driveStatus ? <p className="text-sm text-zinc-400">{driveStatus}</p> : null}
      {status ? <p className="text-sm text-zinc-400">{status}</p> : null}

      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
          Category order
        </p>
        {categories.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Assign categories on mixes below, then reorder them here.
          </p>
        ) : (
          <ul className="space-y-2">
            {categories.map((name, index) => {
              const isDragging = draggingCategory === name;
              const isOver =
                dragOverCategory === name && draggingCategory !== name;

              return (
                <li
                  key={name}
                  draggable={!busy}
                  onDragStart={(event) => {
                    setDraggingCategory(name);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", name);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    if (dragOverCategory !== name) setDragOverCategory(name);
                  }}
                  onDragLeave={() => {
                    if (dragOverCategory === name) setDragOverCategory(null);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const fromName =
                      event.dataTransfer.getData("text/plain") ||
                      draggingCategory;
                    if (fromName) reorderCategory(fromName, name);
                    setDraggingCategory(null);
                    setDragOverCategory(null);
                  }}
                  onDragEnd={() => {
                    setDraggingCategory(null);
                    setDragOverCategory(null);
                  }}
                  className={`flex items-center gap-3 border border-white/10 bg-zinc-900 px-3 py-3 transition ${
                    isDragging ? "opacity-40" : ""
                  } ${isOver ? "border-white/25 bg-zinc-800" : ""}`}
                >
                  <span
                    className="cursor-grab touch-none select-none px-2 text-zinc-500 active:cursor-grabbing"
                    aria-hidden="true"
                    title="Drag to reorder"
                  >
                    ⋮⋮
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy || index === 0}
                      onClick={() => moveCategory(name, -1)}
                      className="h-9 w-9 border border-white/15 bg-zinc-950 text-zinc-300 disabled:opacity-30"
                      aria-label={`Move ${name} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={busy || index === categories.length - 1}
                      onClick={() => moveCategory(name, 1)}
                      className="h-9 w-9 border border-white/15 bg-zinc-950 text-zinc-300 disabled:opacity-30"
                      aria-label={`Move ${name} down`}
                    >
                      ↓
                    </button>
                  </div>
                  <p className="min-w-0 flex-1 truncate text-sm text-white">
                    {name}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
        Drag mixes to reorder
      </p>

      <datalist id="mix-categories">
        {categories.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <ul className="space-y-3">
        {mixes.map((mix, index) => {
          const isDragging = draggingId === mix.id;
          const isOver = dragOverId === mix.id && draggingId !== mix.id;

          return (
            <li
              key={`${mix.id}:${mix.filename}`}
              draggable={!busy}
              onDragStart={(event) => {
                setDraggingId(mix.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", mix.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (dragOverId !== mix.id) setDragOverId(mix.id);
              }}
              onDragLeave={() => {
                if (dragOverId === mix.id) setDragOverId(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const fromId =
                  event.dataTransfer.getData("text/plain") || draggingId;
                if (fromId) reorder(fromId, mix.id);
                setDraggingId(null);
                setDragOverId(null);
              }}
              onDragEnd={() => {
                setDraggingId(null);
                setDragOverId(null);
              }}
              className={`grid gap-4 border border-white/10 bg-zinc-900 px-4 py-4 transition md:grid-cols-[auto_auto_1fr_auto] md:items-center ${
                isDragging ? "opacity-40" : ""
              } ${isOver ? "border-white/25 bg-zinc-800" : ""}`}
            >
              <span
                className="cursor-grab touch-none select-none px-2 py-2 text-zinc-500 active:cursor-grabbing"
                aria-hidden="true"
                title="Drag to reorder"
              >
                ⋮⋮
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy || index === 0}
                  onClick={() => move(mix.id, -1)}
                  className="h-9 w-9 border border-white/15 bg-zinc-950 text-zinc-300 disabled:opacity-30"
                  aria-label={`Move ${mix.title} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={busy || index === mixes.length - 1}
                  onClick={() => move(mix.id, 1)}
                  className="h-9 w-9 border border-white/15 bg-zinc-950 text-zinc-300 disabled:opacity-30"
                  aria-label={`Move ${mix.title} down`}
                >
                  ↓
                </button>
              </div>

              <div className="min-w-0 space-y-2">
                <input
                  value={mix.title}
                  onChange={(event) =>
                    updateMix(mix.id, { title: event.target.value })
                  }
                  onMouseDown={(event) => event.stopPropagation()}
                  className="w-full border border-white/15 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-white/40"
                />
                <input
                  type="url"
                  value={mix.coverUrl ?? ""}
                  placeholder="Cover image URL (https://…)"
                  onChange={(event) =>
                    updateMix(mix.id, {
                      coverUrl: event.target.value.trim() || null,
                    })
                  }
                  onMouseDown={(event) => event.stopPropagation()}
                  className="w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-white/40"
                />
                <input
                  list="mix-categories"
                  value={mix.category ?? ""}
                  placeholder="Category (optional)"
                  onChange={(event) =>
                    updateMix(mix.id, {
                      category: event.target.value.length
                        ? event.target.value
                        : null,
                    })
                  }
                  onMouseDown={(event) => event.stopPropagation()}
                  className="w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-white/40"
                />
                <p className="truncate text-xs text-zinc-500">
                  {mix.filename}
                  {mix.driveId ? "" : " · needs sync"}
                  {mix.coverUrl ? " · custom cover" : ""}
                  {mix.category ? ` · ${mix.category}` : ""}
                  {` · ${new Intl.NumberFormat("en-US").format(playCounts[mix.id] ?? 0)} ${(playCounts[mix.id] ?? 0) === 1 ? "play" : "plays"}`}
                </p>
              </div>

              <div
                className="flex flex-col items-start gap-3 md:items-end"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <label className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-zinc-400">
                  <input
                    type="checkbox"
                    checked={mix.visible}
                    onChange={(event) =>
                      updateMix(mix.id, { visible: event.target.checked })
                    }
                    className="size-4 accent-white"
                  />
                  Visible
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => deleteMix(mix)}
                  className="text-xs uppercase tracking-[0.16em] text-zinc-500 hover:text-white disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
