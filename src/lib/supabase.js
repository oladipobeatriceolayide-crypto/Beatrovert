import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } },
);

export const ORG_COLS = "id,name,slug,timezone";

/** Throw a readable error from a Supabase response. */
export function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}
