/** Konfigurasi detail data yang bisa dibuka dari dashboard umum. */
export type PublicDetailConfig = {
  /** Segment URL /detail/$key */
  slug: string;
  /** Kunci menu pada pengaturan Akses Halaman */
  menuKey: string;
  title: string;
  description: string;
  table: string;
  orderBy?: string;
  /** Kolom yang ditampilkan (bila ada pada data). */
  columns: { key: string; label: string }[];
};

export const publicDetails: PublicDetailConfig[] = [
  {
    slug: "uker",
    menuKey: "uker",
    title: "Unit Kerja",
    description: "Daftar unit kerja pada BRI Branch Office Pringsewu.",
    table: "ukers",
    orderBy: "kode_uker",
    columns: [
      { key: "kode_uker", label: "Kode Uker" },
      { key: "nama_uker", label: "Nama Uker" },
      { key: "jenis", label: "Jenis" },
      { key: "alamat", label: "Alamat" },
    ],
  },
  {
    slug: "atm",
    menuKey: "atm",
    title: "Mesin ATM",
    description: "Daftar mesin ATM yang termonitor.",
    table: "atm_machines",
    columns: [
      { key: "tid", label: "TID" },
      { key: "lokasi", label: "Lokasi" },
      { key: "tipe", label: "Tipe" },
      { key: "status", label: "Status" },
    ],
  },
  {
    slug: "edc",
    menuKey: "edc",
    title: "Mesin EDC",
    description: "Daftar mesin EDC merchant.",
    table: "edc_machines",
    columns: [
      { key: "tid", label: "TID" },
      { key: "mid", label: "MID" },
      { key: "nama_merchant", label: "Merchant" },
      { key: "status", label: "Status" },
    ],
  },
  {
    slug: "pegawai",
    menuKey: "pegawai",
    title: "Data Pegawai",
    description: "Daftar pegawai seluruh unit kerja.",
    table: "employees",
    orderBy: "nama",
    columns: [
      { key: "personal_number", label: "PN" },
      { key: "nama", label: "Nama" },
      { key: "jabatan", label: "Jabatan" },
      { key: "uker", label: "Unit Kerja" },
    ],
  },
  {
    slug: "project",
    menuKey: "project",
    title: "Project IT",
    description: "Daftar project IT yang sedang berjalan.",
    table: "projects",
    orderBy: "deadline",
    columns: [
      { key: "nama_project", label: "Nama Project" },
      { key: "deskripsi", label: "Deskripsi" },
      { key: "tanggal_mulai", label: "Mulai" },
      { key: "deadline", label: "Deadline" },
    ],
  },
];

export function findPublicDetail(slug: string) {
  return publicDetails.find((d) => d.slug === slug);
}
