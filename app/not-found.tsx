import Link from "next/link";
import { EmptyCanalBoat } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <EmptyCanalBoat className="h-32 w-44" />
      <h1 className="font-display text-3xl font-semibold">Oeps! This page fell into the canal.</h1>
      <p className="text-muted">We fished around, but couldn&apos;t find it. It may have been moved, or never existed.</p>
      <Link href="/" className="mt-2 rounded-xl bg-canal px-4 py-2 text-white">Back to dry land</Link>
    </main>
  );
}
