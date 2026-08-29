import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { RotatingThumb } from "@/components/RotatingThumbGrid";
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
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {rows.map((r) => (
        <DiaryCard
          key={r.id}
          title={r.nama_kegiatan}
          status={r.status}
          date={fmt(r.tanggal)}
          officer={dir.nameOf(r.user_id)}
          photos={r.photos}
        />
      ))}
    </div>
  );
}

/** Kartu kegiatan harian IT dengan frame dan tab yang menyatu seperti mockup. */
export function DiaryCard({
  title,
  status,
  date: _date,
  officer,
  photos,
}: {
  title: string;
  status: string;
  date: string;
  officer: string;
  photos: string[];
}) {
  const statusTone = status === "Failed" ? "text-destructive" : "text-diary-frame-foreground";

  return (
    <article className="relative aspect-square w-full max-w-[360px] overflow-hidden rounded-[1.5rem] border border-primary/25 bg-diary-frame shadow-[inset_0_1px_0_color-mix(in_oklab,var(--color-primary-foreground)_18%,transparent),0_12px_28px_-18px_var(--color-primary)] [container-type:inline-size]">
      {/* Bidang gelap membuat frame, blok status, dan blok petugas menjadi satu plate. */}
      <div className="absolute inset-[2.8%] rounded-[1.15rem] bg-background" />

      {/* Judul kegiatan */}
      <div className="absolute top-[8%] left-[6%] z-10 flex h-[15.5%] w-[63%] items-center rounded-[1rem] bg-diary-frame px-[4.5%]">
        <h3 className="line-clamp-2 text-[clamp(12px,4cqw,15px)] leading-[1.25] font-bold text-diary-frame-foreground">
          {title}
        </h3>
      </div>

      {/* Tab status menyatu langsung dengan sisi atas dan kanan frame. */}
      <div className="absolute top-0 right-0 z-10 flex h-[17%] w-[29%] items-center justify-center rounded-bl-[1rem] bg-diary-frame px-[2%] pt-[1%]">
        <span className={`whitespace-nowrap text-[clamp(9px,3.15cqw,12px)] leading-none font-bold ${statusTone}`}>{status}</span>
      </div>

      {/* Panel foto: warna dasar plate sekaligus menjadi border dan pemisah salib. */}
      <div className="absolute top-[27%] right-[5.5%] bottom-[12.5%] left-[5.5%] z-10 grid grid-cols-2 grid-rows-2 gap-[1.4%] overflow-hidden rounded-[1.05rem] bg-diary-frame p-[1.4%]">
          {Array.from({ length: 4 }, (_, slot) => (
            <div key={slot} className="overflow-hidden bg-background first:rounded-tl-[0.65rem] [&:nth-child(2)]:rounded-tr-[0.65rem] [&:nth-child(3)]:rounded-bl-[0.65rem] [&:nth-child(4)]:rounded-br-[0.65rem]">
              <RotatingThumb
                ids={photos.filter((_, i) => i % 4 === slot)}
                alt={`Foto kegiatan ${title}`}
                delay={slot * 700}
                className="h-full w-full"
              />
            </div>
          ))}
      </div>

      {/* Tab nama petugas menyatu langsung dengan sisi kiri dan bawah frame. */}
      <div className="absolute bottom-0 left-0 z-20 flex h-[10%] w-[52%] items-center rounded-tr-[0.8rem] bg-diary-frame px-[6%] pb-[0.5%]">
        <span className="truncate text-[clamp(10px,3.25cqw,12px)] leading-none font-bold text-diary-frame-foreground">{officer}</span>
      </div>
    </article>
  );
}





