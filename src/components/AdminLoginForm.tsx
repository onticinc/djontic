"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

type AdminLoginFormProps = {
  onSuccess?: () => void | Promise<void>;
  unlockLabel?: string;
};

export function AdminLoginForm({
  onSuccess,
  unlockLabel = "the admin area",
}: AdminLoginFormProps) {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const formData = new FormData(event.currentTarget);
      formData.set("flow", flow);
      await signIn("password", formData);
      await onSuccess?.();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Sign-in failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm space-y-4">
      <p className="text-sm text-zinc-400">
        Sign in with your admin email and password to unlock {unlockLabel}.
      </p>
      <label className="block text-sm text-zinc-400">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="mt-2 w-full border border-white/15 bg-black px-3 py-2 text-white outline-none focus:border-white/40"
        />
      </label>
      <label className="block text-sm text-zinc-400">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete={flow === "signIn" ? "current-password" : "new-password"}
          minLength={8}
          className="mt-2 w-full border border-white/15 bg-black px-3 py-2 text-white outline-none focus:border-white/40"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-11 items-center bg-white px-5 text-xs font-semibold uppercase tracking-[0.16em] text-black disabled:opacity-50"
      >
        {flow === "signIn" ? "Sign in" : "Create account"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setFlow((current) => (current === "signIn" ? "signUp" : "signIn"));
          setStatus(null);
        }}
        className="block text-xs uppercase tracking-[0.16em] text-zinc-500 hover:text-white"
      >
        {flow === "signIn" ? "Create first admin account" : "Back to sign in"}
      </button>
      {status ? <p className="text-sm text-red-300">{status}</p> : null}
    </form>
  );
}
