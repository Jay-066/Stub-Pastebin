import { neon } from "@neondatabase/serverless";

// DATABASE_URL must be set in the environment (Vercel project settings, or .env.local locally).
// Using a lazy getter avoids crashing the whole app at import time if the env var
// is briefly missing during build steps that don't need the DB.
function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it in your environment (Neon connection string)."
    );
  }
  return neon(url);
}

export const sql = getSql;
