import { createClient } from "@supabase/supabase-js";

// SECURITY: This client uses the service-role key which bypasses Supabase RLS.
// Only use it in server-side API routes AFTER verifying the caller's role with
// requireApiRole() from lib/auth.ts. Never import in client components.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase service role env vars");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

export default supabaseAdmin;

