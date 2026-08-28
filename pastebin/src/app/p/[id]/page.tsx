import Link from "next/link";
import PasteView from "./PasteView";

export default async function PastePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-16 sm:py-24">
      <div className="w-full max-w-2xl mb-8">
        <Link
          href="/"
          className="font-display text-2xl font-bold tracking-tight hover:text-[var(--accent)] transition-colors"
        >
          stub
        </Link>
      </div>
      <PasteView id={id} />
    </main>
  );
}
