/** Konfigurasi detail data yang bisa dibuka dari dashboard umum. */
export type PublicDetailConfig = {
  /** Segment URL /detail/$key */
  slug: string;
  /** Kunci menu pada pengaturan Akses Halaman */
  menuKey: string;
  title: string;
  description: string;
  table: string;
  /** Bila diisi, data digabung dari beberapa tabel dengan penanda jenis. */
  sources?: { table: string; jenis: string }[];
  orderBy?: string;
  /** Kolom yang ditampilkan (bila ada pada data). */
  columns: { key: string; label: string; type?: "latlng" }[];
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
    title: "Mesin ATM/CRM",
    description: "Daftar mesin ATM dan CRM yang termonitor.",
    table: "atm_machines",
    sources: [
      { table: "atm_machines", jenis: "ATM" },
      { table: "crm_machines", jenis: "CRM" },
    ],
    orderBy: "tid",
    columns: [
      { key: "tid", label: "TID" },
      { key: "jenis_mesin", label: "Jenis Mesin" },
      { key: "lokasi", label: "Lokasi" },
      { key: "titik_maps", label: "Titik Maps", type: "latlng" },
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
