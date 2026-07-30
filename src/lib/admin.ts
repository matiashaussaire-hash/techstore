/**
 * Centralized admin configuration.
 *
 * Change ADMIN_EMAIL here to switch the development admin account.
 * In production, rely on `profiles.role = 'admin'` instead of this email.
 */
export const ADMIN_EMAIL = "admin@gmail.com";

/**
 * Client-side admin check.
 *
 * PRIMARY: user.role === "admin" (from profiles table via Supabase Auth)
 * DEV FALLBACK: user.email === ADMIN_EMAIL (for the initial dev account only)
 *
 * Use this in client components to decide whether to show admin UI.
 * Server-side authorization is enforced separately in API routes via
 * `isAdmin()` in `src/lib/products.ts` and RLS policies in Supabase.
 */
export function isAdminUser(user: { role?: string; email?: string } | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.email === ADMIN_EMAIL) return true;
  return false;
}