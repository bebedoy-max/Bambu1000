/** Tipe & helper bersama untuk Absensi, Doa & Briefing Pagi. */

export type DoaPagiSection = {
  id: string;
  ukerId: string | null;
  ukerNama: string;
  urutan: number;
  nama: string;
  deskripsi: string;
  keterangan: string;
  pekerja: string[];
};

export type DoaPagiRecord = {
  sectionId: string;
  pekerja: string;
  tanggal: string;
  qris: string;
  kehadiran: string;
};

/** Pilihan status kehadiran (mengikuti mockup tampilan). */
export const kehadiranOptions = [
  "Hadir",
  "Belum Hadir",
  "Sakit",
  "Cuti",
  "Zoom",
  "Di BRI Unit",
  "Ke Kanwil",
  "Ke KPKNL",
  "Backup",
  "Izin",
  "Tanpa Keterangan",
] as const;

export type Kehadiran = (typeof kehadiranOptions)[number];

/** Nilai QRIS untuk pekerja yang tidak melakukan absen QRIS. */
export const QRIS_KOSONG = "Kosong";

/**
 * Kode singkat yang diketik pada kolom QRIS lalu Enter:
 * mengubah QRIS menjadi "Kosong" dan mengatur status kehadiran.
 */
export const kehadiranShortcuts: Record<string, Kehadiran> = {
  bh: "Belum Hadir",
  "belum hadir": "Belum Hadir",
  sakit: "Sakit",
  cuti: "Cuti",
  zoom: "Zoom",
  unit: "Di BRI Unit",
  "di bri unit": "Di BRI Unit",
  kanwil: "Ke Kanwil",
  "ke kanwil": "Ke Kanwil",
  kpknl: "Ke KPKNL",
  "ke kpknl": "Ke KPKNL",
  backup: "Backup",
  izin: "Izin",
  tk: "Tanpa Keterangan",
  "tanpa keterangan": "Tanpa Keterangan",
};

export function shortcutFor(value: string): Kehadiran | null {
  return kehadiranShortcuts[value.trim().toLowerCase()] ?? null;
}

/** Kolom hari kerja pada tampilan: S (Senin), S (Selasa), R, K, J. */
export const weekdayLabels = ["S", "S", "R", "K", "J"] as const;
export const weekdayNames = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"] as const;

export function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Tanggal Senin–Jumat pada minggu dari tanggal acuan. */
export function workWeekDates(ref: Date = new Date()): string[] {
  const base = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const dow = base.getDay(); // 0 Minggu .. 6 Sabtu
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(base);
  monday.setDate(base.getDate() + offsetToMonday);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toIsoDate(d);
  });
}

/** Hadir bila QRIS terisi dan bukan "Kosong". */
export function isQrisFilled(qris: string | null | undefined) {
  const v = (qris ?? "").trim();
  return !!v && v.toLowerCase() !== QRIS_KOSONG.toLowerCase();
}

export function recordKey(sectionId: string, pekerja: string, tanggal: string) {
  return `${sectionId}|${pekerja}|${tanggal}`;
}
