import type { Metadata } from "next";
import { AdminNav } from "@/components/AdminNav";
import { WeddingsAdmin } from "@/components/WeddingsAdmin";

export const metadata: Metadata = {
  title: "Manage Weddings",
  robots: { index: false, follow: false },
};

export default function AdminWeddingsPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-steel">Backend</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
          Manage Weddings
        </h1>
        <p className="mt-4 text-base leading-relaxed text-zinc-400">
          Edit the public /weddings page copy, then manage recaps with photos
          and videos. The newest 8 published recaps fill 4 tiles above and 4
          below Regular Destinations.
        </p>
        <AdminNav current="weddings" />
      </div>

      <div className="mt-10">
        <WeddingsAdmin />
      </div>
    </section>
  );
}
