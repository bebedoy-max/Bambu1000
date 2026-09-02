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
type RuntimeConfig = { url?: string | undefined; key?: string | undefined };

function runtimeConfig(): RuntimeConfig {
  if (typeof window !== "undefined") {
    return (window as unknown as { __SUPABASE_CONFIG__?: RuntimeConfig }).__SUPABASE_CONFIG__ ?? {};
  }
  if (typeof process !== "undefined" && process.env) {
    return {
      url: process.env['CUSTOM_SUPABASE_URL'],
      key: process.env['CUSTOM_SUPABASE_PUBLISHABLE_KEY'],
    };
  }
  return {};
}

export const CUSTOM_SUPABASE_URL =
  import.meta.env['VITE_SUPABASE_URL_OVERRIDE'] ||
  runtimeConfig().url ||
  "https://jbvkcmtloyjuizunrtfv.supabase.co";

export const CUSTOM_SUPABASE_PUBLISHABLE_KEY =
  import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY_OVERRIDE'] ||
  runtimeConfig().key ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidmtjbXRsb3lqdWl6dW5ydGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4Nzk4NTUsImV4cCI6MjEwMjQ1NTg1NX0.lXPFB7NC-upwKqMXm91P6bAYmiKVADEjmcpxKtg_Yd4";


export type SupabaseConnection = { url: string; key: string };

export function getCustomConnection(): SupabaseConnection | null {
  if (CUSTOM_SUPABASE_URL && CUSTOM_SUPABASE_PUBLISHABLE_KEY)
    return { url: CUSTOM_SUPABASE_URL, key: CUSTOM_SUPABASE_PUBLISHABLE_KEY };
  return null;
}
