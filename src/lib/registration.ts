import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const db = supabase as unknown as SupabaseClient;

/** Kunci penyimpanan sementara Personal Number sebelum sesi terbentuk (alur Google). */
export const PENDING_PN_KEY = "pending_personal_number";

/**
 * Mencocokkan Personal Number dengan Data Pekerja melalui RPC
 * `check_personal_number` (SECURITY DEFINER, boleh dipanggil anon).
 */
export async function checkPersonalNumber(
  pn: string,
  opts?: { allowExisting?: boolean },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await db.rpc("check_personal_number", { p_pn: pn });
  if (error) return { ok: false, message: error.message };
  const row = (Array.isArray(data) ? data[0] : data) as
    | { pn_exists?: boolean; pn_claimed?: boolean }
    | boolean
    | null;

  if (typeof row === "boolean") {
    return row ? { ok: true } : { ok: false, message: "Personal Number tidak ada di Data Pekerja" };
  }
  if (!row?.pn_exists) return { ok: false, message: "Personal Number tidak ada di Data Pekerja" };
  if (row.pn_claimed && !opts?.allowExisting)
    return { ok: false, message: "Personal Number ini sudah terdaftar sebagai pengguna" };
  return { ok: true };
}

/** Menghubungkan akun yang baru login dengan Personal Number yang sudah diverifikasi. */
export async function claimPendingPersonalNumber(): Promise<void> {
  if (typeof window === "undefined") return;
  const pn = localStorage.getItem(PENDING_PN_KEY);
  if (!pn) return;
  const { error } = await db.rpc("claim_personal_number", { p_pn: pn });
  if (!error) localStorage.removeItem(PENDING_PN_KEY);
}
