"use client";

import { useState } from "react";

type CreateResponse = {
  id: string;
  url: string;
  expiresAt: string | null;
  maxViews: number | null;
};

const EXPIRY_OPTIONS = [
  { label: "Never", value: "" },
  { label: "10 minutes", value: String(10 * 60) },
  { label: "1 hour", value: String(60 * 60) },
  { label: "1 day", value: String(24 * 60 * 60) },
  { label: "7 days", value: String(7 * 24 * 60 * 60) },
];

const VIEW_OPTIONS = [
  { label: "Unlimited", value: "" },
  { label: "1 view (burn after reading)", value: "1" },
  { label: "5 views", value: "5" },
  { label: "10 views", value: "10" },
  { label: "100 views", value: "100" },
];

export default function PasteForm() {
  const [content, setContent] = useState("");
  const [expiry, setExpiry] = useState("");
  const [maxViews, setMaxViews] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResponse | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError("Type or paste some content first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/pastes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          expiresInSeconds: expiry ? Number(expiry) : null,
          maxViews: maxViews ? Number(maxViews) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setContent("");
    setExpiry("");
    setMaxViews("");
    setCopied(false);
    setError(null);
  }

  async function copyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API may be unavailable; the link is still selectable/visible
    }
  }

  if (result) {
    return (
      <div className="w-full max-w-2xl">
        <div className="relative border border-[var(--paper)]/20 bg-[var(--paper)] text-[var(--ink)] rounded-sm p-8 shadow-[8px_8px_0_0_var(--accent)]">
          <div className="absolute -top-3 left-8 bg-[var(--accent-2)] text-[var(--ink)] text-xs font-semibold px-3 py-1 tracking-wide uppercase">
            Stub issued
          </div>
          <p className="font-display text-sm uppercase tracking-[0.2em] text-[var(--ink)]/50 mb-2">
            Your link
          </p>
          <div className="flex items-stretch gap-2 mb-6">
            <a
              href={result.url}
              className="flex-1 min-w-0 truncate underline decoration-[var(--accent-2)] decoration-2 underline-offset-4 text-lg font-medium hover:text-[var(--accent-2)]"
              target="_blank"
              rel="noopener noreferrer"
            >
              {result.url}
            </a>
            <button
              onClick={copyLink}
              className="shrink-0 px-4 py-2 bg-[var(--ink)] text-[var(--paper)] text-sm font-medium rounded-sm hover:bg-[var(--ink)]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] transition-colors"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="perforation h-4 -mx-8 mb-6" aria-hidden="true" />

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-[var(--ink)]/50 uppercase text-xs tracking-wide mb-1">
                Expires
              </dt>
              <dd className="font-medium">
                {result.expiresAt
                  ? new Date(result.expiresAt).toLocaleString()
                  : "Never (by time)"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--ink)]/50 uppercase text-xs tracking-wide mb-1">
                View limit
              </dt>
              <dd className="font-medium">
                {result.maxViews ? `${result.maxViews} view(s)` : "Unlimited"}
              </dd>
            </div>
          </dl>

          <button
            onClick={reset}
            className="mt-8 text-sm underline decoration-dotted underline-offset-4 text-[var(--ink)]/70 hover:text-[var(--ink)]"
          >
            ← paste something else
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste or type your text here…"
        rows={14}
        className="w-full bg-[var(--paper)] text-[var(--ink)] rounded-sm p-4 text-sm leading-relaxed resize-y border border-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] placeholder:text-[var(--ink)]/40"
      />

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-xs uppercase tracking-wide text-[var(--paper)]/60 mb-1.5">
            Expires after
          </span>
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="w-full bg-transparent border border-[var(--paper)]/25 rounded-sm px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          >
            {EXPIRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[var(--ink)]">
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs uppercase tracking-wide text-[var(--paper)]/60 mb-1.5">
            View limit
          </span>
          <select
            value={maxViews}
            onChange={(e) => setMaxViews(e.target.value)}
            className="w-full bg-transparent border border-[var(--paper)]/25 rounded-sm px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          >
            {VIEW_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[var(--ink)]">
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full sm:w-auto px-6 py-3 bg-[var(--accent)] text-[var(--ink)] font-display font-semibold rounded-sm hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] transition"
      >
        {loading ? "Issuing stub…" : "Generate link"}
      </button>
    </form>
  );
}
