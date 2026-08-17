export type SearchModule = {
  /** Supabase table name. */
  table: string;
  /** Module label shown as result group. */
  label: string;
  /** Admin route the result links to. */
  route: string;
  /** Text columns searched with ilike. */
  columns: string[];
  /** Builds the result title. */
  title: (row: Record<string, unknown>) => string;
  /** Builds the result subtitle. */
  subtitle?: (row: Record<string, unknown>) => string;
  /** Role gate. */
  need?: "it" | "event" | "super";
};

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export const searchModules: SearchModule[] = [
  {
    table: "ukers",
    label: "Unit Kerja",
    route: "/admin/uker",
    columns: ["kode_uker", "nama_uker", "tipe", "alamat", "pic_it"],
    title: (r) => `${s(r["kode_uker"])} — ${s(r["nama_uker"])}`,
    subtitle: (r) => [s(r["tipe"]), s(r["alamat"])].filter(Boolean).join(" · "),
  },
  {
    table: "employees",
    label: "Data Pekerja",
    route: "/admin/pegawai",
    columns: ["personal_number", "nama", "status_karyawan", "no_telepon"],
    title: (r) => s(r["nama"]),
    subtitle: (r) => [s(r["personal_number"]), s(r["status_karyawan"])].filter(Boolean).join(" · "),
  },
  {
    table: "job_titles",
    label: "Kategori Jabatan",
    route: "/admin/jabatan",
    columns: ["nama_jabatan", "tipe_unit_kerja", "akses_level", "keterangan"],
    title: (r) => s(r["nama_jabatan"]),
    subtitle: (r) => [s(r["tipe_unit_kerja"]), s(r["akses_level"])].filter(Boolean).join(" · "),
    need: "it",
  },
  {
    table: "atm_machines",
    label: "Mesin ATM",
    route: "/admin/atm",
    columns: ["tid", "lokasi", "merk", "ip_address"],
    title: (r) => s(r["tid"]) || s(r["kode_atm"]),
    subtitle: (r) => [s(r["lokasi"]), s(r["merk"]), s(r["ip_address"])].filter(Boolean).join(" · "),
  },
  {
    table: "crm_machines",
    label: "Mesin CRM",
    route: "/admin/crm",
    columns: ["tid", "lokasi", "merk", "ip_address"],
    title: (r) => s(r["tid"]),
    subtitle: (r) => [s(r["lokasi"]), s(r["merk"]), s(r["ip_address"])].filter(Boolean).join(" · "),
  },
  {
    table: "edc_machines",
    label: "Mesin EDC",
    route: "/admin/edc",
    columns: ["tid", "nama_merchant", "kategori_edc", "alamat", "keterangan"],
    title: (r) => s(r["tid"]),
    subtitle: (r) => [s(r["nama_merchant"]), s(r["kategori_edc"])].filter(Boolean).join(" · "),
  },
  {
    table: "it_devices",
    label: "Data Perangkat IT",
    route: "/admin/perangkat",
    columns: ["nama_perangkat", "jenis_perangkat", "nama_pengguna", "ip_address", "kondisi_perangkat"],
    title: (r) => s(r["nama_perangkat"]),
    subtitle: (r) => [s(r["jenis_perangkat"]), s(r["nama_pengguna"])].filter(Boolean).join(" · "),
    need: "it",
  },
  {
    table: "projects",
    label: "Project IT",
    route: "/admin/project",
    columns: ["nama_project", "deskripsi"],
    title: (r) => s(r["nama_project"]),
    subtitle: (r) => s(r["deskripsi"]).slice(0, 80),
    need: "it",
  },


  {
    table: "it_tools",
    label: "Tools IT",
    route: "/admin/tools",
    columns: ["nama_tool", "kategori", "versi", "catatan"],
    title: (r) => s(r["nama_tool"]),
    subtitle: (r) => [s(r["kategori"]), s(r["versi"])].filter(Boolean).join(" · "),
    need: "it",
  },
  {
    table: "tutorials",
    label: "Tutorial",
    route: "/admin/tutorial",
    columns: ["judul", "kategori", "konten"],
    title: (r) => s(r["judul"]),
    subtitle: (r) => s(r["kategori"]),
    need: "it",
  },
  {
    table: "photos",
    label: "Galeri Foto",
    route: "/admin/foto",
    columns: ["judul", "kategori"],
    title: (r) => s(r["judul"]),
    subtitle: (r) => s(r["kategori"]),
    need: "it",
  },
  {
    table: "it_tickets",
    label: "Tiket IT",
    route: "/admin/tiket",
    columns: ["judul", "deskripsi", "status"],
    title: (r) => s(r["judul"]),
    subtitle: (r) => s(r["status"]),
  },
  {
    table: "assets",
    label: "Inventaris Aset",
    route: "/admin/aset",
    columns: ["nama_aset", "kategori", "serial_number", "status", "catatan_perbaikan"],
    title: (r) => s(r["nama_aset"]),
    subtitle: (r) => [s(r["serial_number"]), s(r["status"])].filter(Boolean).join(" · "),
    need: "it",
  },
  {
    table: "audit_logs",
    label: "Audit Log",
    route: "/admin/audit",
    columns: ["action", "table_name"],
    title: (r) => `${s(r["action"])} · ${s(r["table_name"])}`,
    subtitle: (r) => s(r["created_at"]),
    need: "super",
  },
];
