/**
 * Konfigurasi project Supabase yang dipakai aplikasi.
 *
 * Nilai default di bawah adalah project Supabase milik BO Pringsewu.
 * Di hosting (mis. Vercel) Anda bisa menimpanya lewat environment variable:
 *   VITE_SUPABASE_URL_OVERRIDE
 *   VITE_SUPABASE_PUBLISHABLE_KEY_OVERRIDE
 *
 * PENTING: service_role / secret key TIDAK BOLEH ada di frontend.
 */
export const CUSTOM_SUPABASE_URL =
  import.meta.env['VITE_SUPABASE_URL_OVERRIDE'] || "https://jbvkcmtloyjuizunrtfv.supabase.co";

export const CUSTOM_SUPABASE_PUBLISHABLE_KEY =
  import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY_OVERRIDE'] ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidmtjbXRsb3lqdWl6dW5ydGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4Nzk4NTUsImV4cCI6MjEwMjQ1NTg1NX0.lXPFB7NC-upwKqMXm91P6bAYmiKVADEjmcpxKtg_Yd4";

export type SupabaseConnection = { url: string; key: string };

export function getCustomConnection(): SupabaseConnection | null {
  if (CUSTOM_SUPABASE_URL && CUSTOM_SUPABASE_PUBLISHABLE_KEY)
    return { url: CUSTOM_SUPABASE_URL, key: CUSTOM_SUPABASE_PUBLISHABLE_KEY };
  return null;
}
