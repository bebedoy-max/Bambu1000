import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { AdminPage } from "@/components/AdminLayout";
import { Checkbox } from "@/components/ui/checkbox";
import {
  accessLevels,
  menuItems,
  usePageAccess,
  type AccessLevel,
  type PageAccessRow,
} from "@/lib/access";

const db = supabase as unknown as SupabaseClient;

export const Route = createFileRoute("/_authenticated/admin/akses")({
  head: () => ({
    meta: [
      { title: "Akses Halaman — Panel BRI BO Pringsewu" },
      { name: "description", content: "Pengaturan menu yang boleh diakses tiap level akses." },
      { property: "og:title", content: "Akses Halaman — Panel BRI BO Pringsewu" },
      { property: "og:description", content: "Pengaturan hak akses menu per level akses." },
    ],
  }),
  component: () => (
    <AdminPage menuKey="akses">
      <Page />
    </AdminPage>
  ),
});

function Page() {
  const qc = useQueryClient();
  const rules = usePageAccess();

  const rows: PageAccessRow[] = rules.data ?? [];
  const value = (key: string, level: AccessLevel) => {
    const rule = rows.find((r) => r.page_key === key && r.akses_level === level);
    if (rule) return rule.allowed;
    return menuItems.find((m) => m.key === key)?.defaults.includes(level) ?? false;
  };

  const save = useMutation({
    mutationFn: async (v: { key: string; level: AccessLevel; allowed: boolean }) => {
      const { error } = await db
        .from("page_access")
        .upsert(
          { page_key: v.key, akses_level: v.level, allowed: v.allowed },
          { onConflict: "page_key,akses_level" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["page_access"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <h1 className="text-2xl font-bold">
        <span className="gradient-text">Akses Halaman</span>
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Atur menu apa saja yang boleh diakses tiap level akses. Super Admin selalu memiliki akses
        penuh.
      </p>

      <div className="glass-card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left">
              <th className="p-3 font-medium">Menu</th>
              {accessLevels.map((l) => (
                <th key={l.value} className="p-3 text-center font-medium">
                  {l.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {menuItems.map((m) => (
              <tr key={m.key} className="border-b border-border/40 last:border-0">
                <td className="p-3">{m.label}</td>
                {accessLevels.map((l) => (
                  <td key={l.value} className="p-3 text-center">
                    <Checkbox
                      checked={l.value === "super_admin" ? true : value(m.key, l.value)}
                      disabled={l.value === "super_admin" || save.isPending}
                      onCheckedChange={(c) =>
                        save.mutate({ key: m.key, level: l.value, allowed: c === true })
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
