/** Tipe & helper klien untuk SuperIT Apps — Undian. */

export type UndianSettings = {
  id: string;
  namaAcara: string;
  namaKantor: string;
  tanggal: string;
  themeColor: string;
  logoUrl: string | null;
  bgUrl: string | null;
};

export type UndianKategori = { id: string; nama: string };
export type UndianHadiah = { id: string; nama: string; kategoriId: string | null; jumlah: number };
export type UndianPeserta = {
  id: string;
  nip: string;
  nama: string;
  unitKerja: string;
  kategoriAkses: string;
  aktif: boolean;
};
export type UndianPemenang = {
  id: string;
  pesertaId: string | null;
  namaPeserta: string;
  nip: string;
  unitKerja: string;
  kategoriNama: string;
  hadiahNama: string;
  createdAt: string;
};

export const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function formatTanggalIndo(dateStr?: string | null) {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${parseInt(d, 10)} ${BULAN[parseInt(m, 10) - 1] ?? m} ${y}`;
}

export function formatWaktu(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}

/** Sisa kuota hadiah = jumlah hadiah dikurangi pemenang yang sudah menerimanya. */
export function sisaKuotaHadiah(hadiah: UndianHadiah, pemenang: UndianPemenang[]) {
  const terpakai = pemenang.filter((p) => p.hadiahNama === hadiah.nama).length;
  return Math.max(0, (hadiah.jumlah ?? 0) - terpakai);
}
