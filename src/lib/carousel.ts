import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { driveThumb } from "@/lib/face";

const db = supabase as unknown as SupabaseClient;

/** Bagian konten yang bisa dipakai sebagai sumber slide carousel. */
export const carouselSources = [
  { value: "event", label: "The Event's" },
  { value: "project", label: "Project IT" },
  { value: "diary", label: "Buku Harian IT" },
] as const;

export type CarouselSourceKey = (typeof carouselSources)[number]["value"];

export type CarouselSourceConfig = {
  sumber: CarouselSourceKey;
  aktif: boolean;
  jumlah: number;
  urutan: number;
};

/** Default: 5 konten terakhir dari masing-masing bagian. */
export const defaultCarouselConfig: CarouselSourceConfig[] = carouselSources.map((s, i) => ({
  sumber: s.value,
  aktif: true,
  jumlah: 5,
  urutan: i + 1,
}));

/** Ambil pengaturan carousel; jatuh ke default bila tabel belum ada / kosong. */
export async function loadCarouselConfig(): Promise<CarouselSourceConfig[]> {
  try {
    const { data, error } = await db
      .from("carousel_sources")
      .select("sumber,aktif,jumlah,urutan")
      .order("urutan", { ascending: true });
    if (error || !data?.length) return defaultCarouselConfig;
    const rows = data as CarouselSourceConfig[];
    return carouselSources.map((s, i) => {
      const row = rows.find((r) => r.sumber === s.value);
      return row
        ? { ...row, jumlah: Math.max(1, Math.min(20, Number(row.jumlah) || 5)) }
        : { sumber: s.value, aktif: false, jumlah: 5, urutan: i + 1 };
    });
  } catch {
    return defaultCarouselConfig;
  }
}

/** Sumber gambar slide: URL langsung atau ID file Google Drive. */
export function slideImageSrc(photo: string, size = 1200) {
  return /^https?:\/\//i.test(photo) ? photo : driveThumb(photo, size);
}

/** Acak urutan slide (Fisher–Yates). */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const ai = a[i] as T;
    a[i] = a[j] as T;
    a[j] = ai;
  }
  return a;
}
