"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type PasteData = {
  id: string;
  content: string;
  createdAt: string;
  expiresAt: string | null;
  maxViews: number | null;
  viewCount: number;
};

type State =
  | { status: "loading" }
  | { status: "ok"; paste: PasteData }
  | { status: "not_found" }
  | { status: "expired" }
  | { status: "error"; message: string };

export default function PasteView({ id }: { id: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [copied, setCopied] = useState(false);
  // Guards against React StrictMode's dev-time double-invoke of effects,
  // which would otherwise register two views for one real page load.
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    fetch(`/api/pastes/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.status === 404) {
          setState({ status: "not_found" });
        } else if (res.status === 410) {
          setState({ status: "expired" });
        } else if (!res.ok) {
          setState({
            status: "error",
            message: data.error || "Something went wrong.",
          });
        } else {
          setState({ status: "ok", paste: data });
        }
      })
      .catch(() =>
        setState({ status: "error", message: "Network error. Try again." })
      );
  }, [id]);

  async function copyContent() {
    if (state.status !== "ok") return;
    try {
      await navigator.clipboard.writeText(state.paste.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore — content is still visible/selectable
    }
  }

  if (state.status === "loading") {
    return (
      <div className="w-full max-w-2xl text-[var(--paper)]/40 text-sm">
        Fetching stub…
      </div>
    );
  }

  if (state.status === "not_found") {
    return (
      <NoticeCard
        title="No such stub"
        body="This link doesn't correspond to any paste. Check that you copied the full URL."
      />
    );
  }

  if (state.status === "expired") {
    return (
      <NoticeCard
        title="This stub is gone"
        body="The content expired — either its time window passed or it hit its view limit. Whoever shared it will need to send a new link."
      />
    );
  }

  if (state.status === "error") {
    return <NoticeCard title="Something went wrong" body={state.message} />;
  }

  const { paste } = state;
  const remainingViews =
    paste.maxViews != null ? Math.max(paste.maxViews - paste.viewCount, 0) : null;

  return (
    <div className="w-full max-w-2xl">
      <div className="border border-[var(--paper)]/20 bg-[var(--paper)] text-[var(--ink)] rounded-sm p-8 shadow-[8px_8px_0_0_var(--accent-2)]">
        <div className="flex items-center justify-between mb-4 text-xs uppercase tracking-wide text-[var(--ink)]/50">
          <span>Created {new Date(paste.createdAt).toLocaleString()}</span>
          {remainingViews != null && (
            <span
              className={
                remainingViews <= 1 ? "text-[var(--danger)] font-semibold" : ""
              }
            >
              {remainingViews} view{remainingViews === 1 ? "" : "s"} left
            </span>
          )}
        </div>

        <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed font-mono bg-[var(--paper-dim)] rounded-sm p-4 max-h-[60vh] overflow-auto">
          {paste.content}
        </pre>

        <div className="mt-6 flex gap-3">
          <button
            onClick={copyContent}
            className="px-4 py-2 bg-[var(--ink)] text-[var(--paper)] text-sm font-medium rounded-sm hover:bg-[var(--ink)]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] transition-colors"
          >
            {copied ? "Copied" : "Copy content"}
          </button>
          <Link
            href="/"
            className="px-4 py-2 text-sm font-medium rounded-sm border border-[var(--ink)]/20 hover:border-[var(--ink)]/40 transition-colors"
          >
            New paste
          </Link>
        </div>

        {remainingViews === 0 && (
          <p className="mt-4 text-xs text-[var(--danger)]">
            That was the last available view — this link won&apos;t work again.
          </p>
        )}
      </div>
    </div>
  );
}

function NoticeCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="w-full max-w-2xl border border-[var(--paper)]/20 bg-[var(--paper)] text-[var(--ink)] rounded-sm p-8 shadow-[8px_8px_0_0_var(--danger)]">
      <h1 className="font-display text-2xl font-bold mb-3">{title}</h1>
      <p className="text-sm text-[var(--ink)]/70 leading-relaxed mb-6">{body}</p>
      <Link
        href="/"
        className="text-sm underline decoration-dotted underline-offset-4 text-[var(--ink)]/70 hover:text-[var(--ink)]"
      >
        ← create a new paste
      </Link>
    </div>
  );
}
