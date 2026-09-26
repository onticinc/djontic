import type { Metadata } from "next";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AdminNav } from "@/components/AdminNav";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-steel">Backend</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
          Site Admin
        </h1>
        <p className="mt-4 text-base leading-relaxed text-zinc-400">
          Sign in once, then manage mixes, events, and wedding recaps from here.
        </p>
        <AdminNav current="dashboard" />
      </div>

      <div className="mt-10">
        <AdminDashboard />
      </div>
    </section>
  );
}
