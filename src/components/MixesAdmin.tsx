"use client";

import { useEffect, useMemo, useState } from "react";
import type { MixRecord, MixesStore } from "@/lib/mix-types";

export function MixesAdmin() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [store, setStore] = useState<MixesStore | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [driveStatus, setDriveStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const mixes = useMemo(
    () => [...(store?.mixes ?? [])].sort((a, b) => a.order - b.order),
    [store],
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
    setStore((await response.json()) as MixesStore);
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
  }

  async function save(nextMixes: MixRecord[]) {
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
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error || "Save failed");
        return;
      }
      setStore(data as MixesStore);
      setStatus("Saved");
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
    const next = store.mixes.map((mix) =>
      mix.id === id ? { ...mix, ...patch } : mix,
    );
    setStore({ ...store, mixes: next });
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
          onClick={() => void save(mixes)}
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
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
        Drag rows to reorder
      </p>

      <ul className="divide-y divide-white/10 border border-white/10">
        {mixes.map((mix, index) => {
          const isDragging = draggingId === mix.id;
          const isOver = dragOverId === mix.id && draggingId !== mix.id;

          return (
            <li
              key={mix.id}
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
              className={`grid gap-4 px-4 py-4 transition md:grid-cols-[auto_auto_1fr_auto] md:items-center ${
                isDragging ? "opacity-40" : ""
              } ${isOver ? "bg-white/5" : ""}`}
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
                  className="h-9 w-9 border border-white/15 text-zinc-300 disabled:opacity-30"
                  aria-label={`Move ${mix.title} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={busy || index === mixes.length - 1}
                  onClick={() => move(mix.id, 1)}
                  className="h-9 w-9 border border-white/15 text-zinc-300 disabled:opacity-30"
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
                  className="w-full border border-white/10 bg-transparent px-3 py-2 text-white outline-none focus:border-white/30"
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
                  className="w-full border border-white/10 bg-transparent px-3 py-2 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-white/30"
                />
                <p className="truncate text-xs text-zinc-500">
                  {mix.filename}
                  {mix.driveId ? "" : " · needs sync"}
                  {mix.coverUrl ? " · custom cover" : ""}
                </p>
              </div>

              <label
                className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-zinc-400"
                onMouseDown={(event) => event.stopPropagation()}
              >
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}
