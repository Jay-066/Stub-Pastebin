-- Run this once against your Neon (Postgres) database.

CREATE TABLE IF NOT EXISTS pastes (
  id            TEXT PRIMARY KEY,          -- short shareable slug, e.g. "aZ3kLp9Q"
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ,               -- NULL = never expires by time
  max_views     INTEGER,                   -- NULL = unlimited views
  view_count    INTEGER NOT NULL DEFAULT 0,
  burned        BOOLEAN NOT NULL DEFAULT false -- explicitly invalidated (e.g. after last view consumed)
);

-- Helps the (rare) cleanup job / expiry queries.
CREATE INDEX IF NOT EXISTS idx_pastes_expires_at ON pastes (expires_at);
