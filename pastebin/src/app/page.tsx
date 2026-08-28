import Link from "next/link";
import PasteForm from "./PasteForm";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-16 sm:py-24">
      <div className="w-full max-w-2xl mb-10">
        <div className="flex items-baseline gap-3 mb-3">
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
            stub
          </h1>
          <span className="text-xs uppercase tracking-[0.2em] text-[var(--paper)]/40 font-display">
            paste · share · expire
          </span>
        </div>
        <p className="text-[var(--paper)]/60 text-sm leading-relaxed max-w-lg">
          Drop in some text. Get a link back. Set it to self-destruct after a
          time window, a number of views, or let it live forever.
        </p>
      </div>

      <PasteForm />

      <footer className="w-full max-w-2xl mt-16 pt-6 border-t border-[var(--paper)]/10 text-xs text-[var(--paper)]/35 flex justify-between">
        <span>No account needed. Links are unguessable but not private.</span>
        <Link
          href="/api/pastes"
          className="hover:text-[var(--paper)]/60 underline decoration-dotted underline-offset-4"
        >
          API
        </Link>
      </footer>
    </main>
  );
}
