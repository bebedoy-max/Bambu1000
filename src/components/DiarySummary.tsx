import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { RotatingThumbGrid } from "@/components/RotatingThumbGrid";
import { useDirectory } from "@/lib/directory";

const db = supabase as unknown as SupabaseClient;

type DiaryRow = {
  id: string;
  user_id: string;
  tanggal: string;
  nama_kegiatan: string;
  status: string;
};

export function statusVariant(s: string): "default" | "secondary" | "destructive" {
  if (s === "Done") return "default";
  if (s === "Failed") return "destructive";
  return "secondary";
}

const fmt = (d: string) => {
  const dt = new Date(`${d}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("id-ID", { dateStyle: "medium" });
};

/** Ambil foto kegiatan harian IT untuk sekumpulan catatan. */
export async function loadDiaryPhotos(ids: string[]) {
  const map: Record<string, string[]> = {};
  if (!ids.length) return map;
  const { data } = await db
    .from("entity_photos")
    .select("entity_id,drive_file_id,created_at")
    .eq("entity_type", "buku-harian")
    .in("entity_id", ids)
    .order("created_at", { ascending: false })
    .limit(600);
  for (const p of (data ?? []) as { entity_id: string; drive_file_id: string }[]) {
    (map[p.entity_id] ??= []).push(p.drive_file_id);
  }
  return map;
}

/** Kluster kartu kegiatan harian IT dengan grid thumbnail acak. */
export function DiarySummary({ limit = 6 }: { limit?: number }) {
  const dir = useDirectory();
  const q = useQuery({
    queryKey: ["diary-thumb-summary", limit],
    queryFn: async () => {
      const { data, error } = await db
        .from("it_diary_logs")
        .select("id,user_id,tanggal,nama_kegiatan,status")
        .order("tanggal", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      const rows = (data ?? []) as DiaryRow[];
      const photos = await loadDiaryPhotos(rows.map((r) => r.id));
      return rows.map((r) => ({ ...r, photos: photos[r.id] ?? [] }));
    },
  });

  const rows = useMemo(() => q.data ?? [], [q.data]);

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Memuat kegiatan…</p>;
  if (!rows.length)
    return <p className="text-sm text-muted-foreground">Belum ada catatan kegiatan harian IT.</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => (
        <div
          key={r.id}
          className="glass-card p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:border-primary/50"
        >
          <RotatingThumbGrid
            photos={r.photos}
            alt={`Foto kegiatan ${r.nama_kegiatan}`}
          />
          <div className="mt-3">
            <p className="text-xs font-medium text-accent">{dir.nameOf(r.user_id)}</p>
            <h3 className="font-semibold">{r.nama_kegiatan}</h3>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={statusVariant(r.status)} className="text-[10px]">
                {r.status}
              </Badge>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5" /> {fmt(r.tanggal)} · {r.photos.length} foto
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
