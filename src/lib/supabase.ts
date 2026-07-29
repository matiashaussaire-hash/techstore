import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const missingEnvVars = [
  !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
  !supabaseAnonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
].filter((value): value is string => Boolean(value));

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          // Persist the session in localStorage so it survives page reloads
          persistSession: true,
          // Automatically refresh the access token when it expires
          autoRefreshToken: true,
          // Detect session from URL (needed for email confirmation redirects)
          detectSessionInUrl: true,
        },
      })
    : null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseConfigError = missingEnvVars.length > 0
  ? `Supabase no está configurado. Completa las variables: ${missingEnvVars.join(", ")}.`
  : null;
