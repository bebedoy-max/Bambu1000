import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { menuItems } from "@/lib/access";

const db = supabase as unknown as SupabaseClient;

/** Ambang batas dianggap sedang online (ms). */
export const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export type AdminUser = {
  id: string;
  email: string | null;
  nama: string | null;
  username: string | null;
  is_active: boolean;
  is_blocked: boolean;
  roles: string[];
  last_online: string | null;
  last_activity: string | null;
  last_activity_at: string | null;
  created_at: string | null;
};

export function isOnline(u: Pick<AdminUser, "last_online" | "is_blocked">) {
  if (u.is_blocked || !u.last_online) return false;
  return Date.now() - new Date(u.last_online).getTime() < ONLINE_WINDOW_MS;
}

export function useAdminUsers(enabled = true) {
  return useQuery({
    queryKey: ["admin_users"],
    enabled,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await db.rpc("admin_list_users");
      if (error) throw error;
      return (data ?? []) as AdminUser[];
    },
  });
}

export async function setBlocked(userId: string, blocked: boolean) {
  const { error } = await db.rpc("admin_set_blocked", {
    p_user_id: userId,
    p_blocked: blocked,
  });
  if (error) throw error;
}

export async function deleteUser(userId: string) {
  const { error } = await db.rpc("admin_delete_user", { p_user_id: userId });
  if (error) throw error;
}

export async function setPassword(userId: string, password: string) {
  const { error } = await db.rpc("admin_set_password", {
    p_user_id: userId,
    p_password: password,
  });
  if (error) throw error;
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

/** Label aktivitas berdasarkan rute yang sedang dibuka. */
function activityLabel(path: string): string {
  const item = [...menuItems].sort((a, b) => b.to.length - a.to.length).find((m) => path === m.to);
  if (item) return item.label;
  const nested = [...menuItems]
    .sort((a, b) => b.to.length - a.to.length)
    .find((m) => m.to !== "/admin" && path.startsWith(m.to));
  return nested?.label ?? path;
}

/**
 * Mengirim denyut kehadiran (online) beserta aktivitas terakhir pengguna.
 * Dipanggil sekali dari layout admin.
 */
export function usePresenceHeartbeat() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let stop = false;
    const label = activityLabel(path);
    const ping = (withActivity: boolean) => {
      if (stop || typeof document === "undefined" || document.hidden) return;
      void db.rpc("touch_presence", { p_activity: withActivity ? label : null });
    };
    ping(true);
    const id = setInterval(() => ping(false), 60_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [path]);
}

/** Apakah akun yang sedang login sudah diblokir admin. */
export function useSelfBlocked() {
  return useQuery({
    queryKey: ["self_blocked"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id;
      if (!id) return false;
      const { data: row } = await db
        .from("profiles")
        .select("is_blocked")
        .eq("id", id)
        .maybeSingle();
      return Boolean((row as { is_blocked?: boolean } | null)?.is_blocked);
    },
  });
}
