"use client";

import { useConvexAuth } from "convex/react";
import type { ReactNode } from "react";
import { AdminLoginForm } from "@/components/AdminLoginForm";

export function AdminGate({
  children,
  unlockLabel,
}: {
  children: ReactNode;
  unlockLabel?: string;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (!isAuthenticated) {
    return <AdminLoginForm unlockLabel={unlockLabel} />;
  }

  return <>{children}</>;
}
