import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AppMemoryData } from "./types";

export type PetMemoryRow = {
  user_id: string;
  title: string;
  data: AppMemoryData;
  updated_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const allowedTesterEmails = (process.env.NEXT_PUBLIC_ALLOWED_TESTER_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function isEmailAllowedForTesting(email: string) {
  return allowedTesterEmails.length === 0 || allowedTesterEmails.includes(email.trim().toLowerCase());
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;
