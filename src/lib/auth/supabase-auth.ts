import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Auth client for passwordless email OTP.
 *
 * Uses the anon key (public auth endpoints: signInWithOtp / verifyOtp).
 * We do NOT persist Supabase's own session — after verifyOtp succeeds we mint
 * the app's own signed cookie (see lib/auth/session.ts), keyed by the profile
 * id, which equals auth.users.id thanks to the handle_new_user trigger.
 *
 * For the email to contain a 6-digit CODE (not a magic link), the Supabase
 * "Magic Link" email template must include the {{ .Token }} variable.
 */
export function supabaseAuthClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
