import { customAlphabet } from "nanoid";
import { sql } from "./db";

// Unambiguous alphabet (no 0/O/1/l/I confusion) for URLs people might read aloud or retype.
const nanoid = customAlphabet(
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
  10
);

export type Paste = {
  id: string;
  content: string;
  created_at: string;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
  burned: boolean;
};

export type CreatePasteInput = {
  content: string;
  expiresInSeconds?: number | null; // relative TTL from now
  maxViews?: number | null; // e.g. "burn after 1 view"
};

export class ValidationError extends Error {}

const MAX_CONTENT_BYTES = 500_000; // 500KB — generous for text, protects the DB from abuse

export async function createPaste(input: CreatePasteInput): Promise<Paste> {
  const { content } = input;

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new ValidationError("content is required");
  }
  if (Buffer.byteLength(content, "utf8") > MAX_CONTENT_BYTES) {
    throw new ValidationError("content exceeds maximum size of 500KB");
  }

  let expiresAt: Date | null = null;
  if (input.expiresInSeconds != null) {
    if (
      typeof input.expiresInSeconds !== "number" ||
      !Number.isFinite(input.expiresInSeconds) ||
      input.expiresInSeconds <= 0
    ) {
      throw new ValidationError("expiresInSeconds must be a positive number");
    }
    expiresAt = new Date(Date.now() + input.expiresInSeconds * 1000);
  }

  let maxViews: number | null = null;
  if (input.maxViews != null) {
    if (
      typeof input.maxViews !== "number" ||
      !Number.isInteger(input.maxViews) ||
      input.maxViews <= 0
    ) {
      throw new ValidationError("maxViews must be a positive integer");
    }
    maxViews = input.maxViews;
  }

  const db = sql();
  const id = nanoid();

  const rows = (await db`
    INSERT INTO pastes (id, content, expires_at, max_views)
    VALUES (${id}, ${content}, ${expiresAt}, ${maxViews})
    RETURNING id, content, created_at, expires_at, max_views, view_count, burned
  `) as Paste[];

  return rows[0];
}

export type GetPasteResult =
  | { status: "ok"; paste: Paste }
  | { status: "not_found" }
  | { status: "expired" };

/**
 * Fetches a paste for viewing and atomically registers the view.
 *
 * Concurrency note: view counting and the "burn" decision happen in a single
 * SQL UPDATE guarded by WHERE, so two simultaneous requests for a
 * max_views=1 paste can't both succeed — only one increments the row and
 * gets content back; the other sees it already burned. This avoids a
 * read-then-write race that plain application-level counting would have.
 */
export async function getAndRegisterView(id: string): Promise<GetPasteResult> {
  const db = sql();

  // Single round trip: increment view_count and flip `burned` when the new
  // count reaches max_views, but only if the paste is not already expired
  // (by time or by a prior burn). Returns the row iff this call "won" the
  // right to view it.
  const rows = (await db`
    UPDATE pastes
    SET
      view_count = view_count + 1,
      burned = burned OR (max_views IS NOT NULL AND view_count + 1 >= max_views)
    WHERE id = ${id}
      AND burned = false
      AND (expires_at IS NULL OR expires_at > now())
    RETURNING id, content, created_at, expires_at, max_views, view_count, burned
  `) as Paste[];

  if (rows.length > 0) {
    return { status: "ok", paste: rows[0] };
  }

  // Nothing updated: figure out whether the id doesn't exist at all, or exists
  // but is expired/burned, so we can return the right status/message.
  const existing = (await db`
    SELECT id, content, created_at, expires_at, max_views, view_count, burned
    FROM pastes WHERE id = ${id}
  `) as Paste[];

  if (existing.length === 0) {
    return { status: "not_found" };
  }
  return { status: "expired" };
}

/** Read-only lookup that does NOT count as a view (used for metadata checks). */
export async function peekPaste(id: string): Promise<Paste | null> {
  const db = sql();
  const rows = (await db`
    SELECT id, content, created_at, expires_at, max_views, view_count, burned
    FROM pastes WHERE id = ${id}
  `) as Paste[];
  return rows[0] ?? null;
}

export function isExpired(paste: Paste): boolean {
  if (paste.burned) return true;
  if (paste.expires_at && new Date(paste.expires_at).getTime() <= Date.now())
    return true;
  if (paste.max_views != null && paste.view_count >= paste.max_views)
    return true;
  return false;
}
