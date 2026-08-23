import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { MapsLink } from "@/components/MapsLink";
import type { SearchRef } from "@/lib/search-registry";

const db = supabase as unknown as SupabaseClient;

const HIDDEN = /^(id|qr_token|password.*|.*_url|created_by|updated_by)$/;

function prettify(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\bid\b/gi, "")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "object") return JSON.stringify(value);
  const str = String(value);
  if (/^(created_at|updated_at|.*_at|tanggal.*|deadline)$/.test(key) && !Number.isNaN(Date.parse(str))) {
    return new Date(str).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  }
  return str;
}

/**
 * Pop up detail generik untuk baris tabel apa pun. Kolom dibaca langsung dari
 * data sehingga otomatis menyesuaikan bila ada kolom/menu baru.
 */
export function RecordDetailDialog({
  open,
  onOpenChange,
  table,
  id,
  title,
  label,
  refs,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  table: string;
  id: string;
  title: string;
  label?: string;
  refs?: SearchRef[] | undefined;
}) {
  const detail = useQuery({
    queryKey: ["record-detail", table, id],
    enabled: open && !!id,
    queryFn: async () => {
      const { data, error } = await db.from(table).select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      const row = (data ?? null) as Record<string, unknown> | null;
      if (!row) return null;

      const refLabels: Record<string, string> = {};
      for (const ref of refs ?? []) {
        const fk = row[ref.column];
        if (!fk) continue;
        const { data: r } = await db
          .from(ref.table)
          .select("*")
          .eq("id", String(fk))
          .maybeSingle();
        const rr = (r ?? null) as Record<string, unknown> | null;
        if (!rr) continue;
        refLabels[ref.column] = ref.labelColumns
          .map((c) => (rr[c] === null || rr[c] === undefined ? "" : String(rr[c])))
          .filter(Boolean)
          .slice(0, 2)
          .join(" — ");
      }
      return { row, refLabels };
    },
  });

  const row = detail.data?.row ?? null;
  const refLabels = detail.data?.refLabels ?? {};

  const entries = row
    ? Object.entries(row).filter(([k, v]) => {
        if (HIDDEN.test(k)) return false;
        if (k.endsWith("_id")) return !!refLabels[k];
        return v !== null && v !== undefined && v !== "";
      })
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold tracking-tight">{title}</DialogTitle>
          <DialogDescription>{label ?? "Detail data"}</DialogDescription>
        </DialogHeader>

        {detail.isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat detail…</p>
        ) : !row ? (
          <p className="text-sm text-muted-foreground">Data tidak ditemukan.</p>
        ) : (
          <dl className="space-y-2">
            {entries.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[10rem_1fr] items-start gap-2 text-sm">
                <dt className="text-muted-foreground">{prettify(k)}</dt>
                <dd className="font-medium break-words">
                  {k === "titik_maps" && typeof v === "string" && v ? (
                    <MapsLink value={v} />
                  ) : k.endsWith("_id") ? (
                    refLabels[k]
                  ) : (
                    formatValue(k, v)
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}
