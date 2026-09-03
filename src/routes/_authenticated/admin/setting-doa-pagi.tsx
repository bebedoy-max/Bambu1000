import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Loader2, Plus, Save, Sunrise, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { AdminPage } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  defaultDoaLogos,
  doaLogoLabels,
  isQrisFilled,
  normalizeDoaLogos,
  recordKey,
  toIsoDate,
  workWeekDates,
  type DoaLogoKey,
  type DoaLogoSettings,
  type DoaPagiSection,
} from "@/lib/doa-pagi-ui";
import {
  deleteDoaPagiSection,
  getDoaPagiLogos,
  getDoaPagiReport,
  getDoaPagiSettings,
  saveDoaPagiLogos,
  saveDoaPagiSection,
} from "@/lib/doa-pagi.functions";
import logoBo from "@/assets/doa/b1000.png";
import logoBri from "@/assets/doa/bri.png";
import logoDanantara from "@/assets/doa/danantara.png";

const fallbackLogo: Record<DoaLogoKey, string> = {
  bo: logoBo,
  danantara: logoDanantara,
  bri: logoBri,
};

/** Editor logo header tampilan absensi: ganti gambar, ukuran, dan posisi. */
function LogoSettings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["doa-pagi", "logos"], queryFn: () => getDoaPagiLogos() });
  const [draft, setDraft] = useState<DoaLogoSettings | null>(null);
  const logos = draft ?? q.data?.logos ?? defaultDoaLogos;

  const save = useMutation({
    mutationFn: (value: DoaLogoSettings) => saveDoaPagiLogos({ data: { logos: value } }),
    onSuccess: async () => {
      toast.success("Pengaturan logo tersimpan.");
      setDraft(null);
      await qc.invalidateQueries({ queryKey: ["doa-pagi", "logos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function patch(key: DoaLogoKey, part: Partial<DoaLogoSettings[DoaLogoKey]>) {
    setDraft(normalizeDoaLogos({ ...logos, [key]: { ...logos[key], ...part } }));
  }

  function pickFile(key: DoaLogoKey, file: File | null) {
    if (!file) return;
    if (file.size > 400_000) {
      toast.error("Ukuran gambar maksimal 400 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patch(key, { url: String(reader.result) });
    reader.readAsDataURL(file);
  }

  return (
    <div className="glass-card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <ImageIcon className="size-4" /> Logo Tampilan Absensi
          </h2>
          <p className="text-sm text-muted-foreground">
            Ganti gambar, atur ukuran, dan geser posisi logo BRI, Danantara, serta BO Pringsewu.
          </p>
        </div>
        <Button onClick={() => save.mutate(logos)} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Simpan Logo
        </Button>
      </div>

      {q.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Memuat pengaturan logo…
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {(Object.keys(doaLogoLabels) as DoaLogoKey[]).map((key) => {
            const l = logos[key];
            return (
              <div key={key} className="space-y-3 rounded-xl border border-input p-3">
                <p className="text-sm font-medium">{doaLogoLabels[key]}</p>
                <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg bg-[#1b1558]">
                  <img
                    src={l.url ?? fallbackLogo[key]}
                    alt={doaLogoLabels[key]}
                    className="object-contain"
                    style={{
                      height: `${l.height}px`,
                      maxHeight: `${l.height}px`,
                      transform: `translate(${l.x}px, ${l.y}px)`,
                    }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    className="h-9 flex-1 text-xs"
                    onChange={(e) => pickFile(key, e.target.files?.[0] ?? null)}
                  />
                  {l.url ? (
                    <Button variant="ghost" size="sm" onClick={() => patch(key, { url: null })}>
                      Reset
                    </Button>
                  ) : null}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs" htmlFor={`h-${key}`}>
                      Tinggi (px)
                    </Label>
                    <Input
                      id={`h-${key}`}
                      type="number"
                      min={12}
                      max={220}
                      value={l.height}
                      onChange={(e) => patch(key, { height: Number(e.target.value) || 12 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs" htmlFor={`x-${key}`}>
                      Geser X
                    </Label>
                    <Input
                      id={`x-${key}`}
                      type="number"
                      min={-300}
                      max={300}
                      value={l.x}
                      onChange={(e) => patch(key, { x: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs" htmlFor={`y-${key}`}>
                      Geser Y
                    </Label>
                    <Input
                      id={`y-${key}`}
                      type="number"
                      min={-300}
                      max={300}
                      value={l.y}
                      onChange={(e) => patch(key, { y: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Nilai X negatif menggeser ke kiri, Y negatif ke atas.
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type Periode = "harian" | "mingguan" | "bulanan";

function rangeOf(periode: Periode, anchor: string): { from: string; to: string } {
  const d = new Date(`${anchor}T00:00:00`);
  if (periode === "harian") return { from: anchor, to: anchor };
  if (periode === "mingguan") {
    const week = workWeekDates(d);
    return { from: week[0]!, to: week[week.length - 1]! };
  }
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: toIsoDate(first), to: toIsoDate(last) };
}

/** Laporan riwayat absensi per pekerja pada unit kerja terpilih. */
function ReportPanel({ ukers }: { ukers: { id: string; nama: string }[] }) {
  const [ukerId, setUkerId] = useState("");
  const [periode, setPeriode] = useState<Periode>("mingguan");
  const [anchor, setAnchor] = useState(toIsoDate(new Date()));
  const activeUkerId = ukerId || ukers[0]?.id || "";
  const { from, to } = useMemo(() => rangeOf(periode, anchor), [periode, anchor]);

  const q = useQuery({
    queryKey: ["doa-pagi", "report", activeUkerId, from, to],
    enabled: !!activeUkerId,
    queryFn: () => getDoaPagiReport({ data: { ukerId: activeUkerId, from, to } }),
  });

  const days = useMemo(() => {
    const out: string[] = [];
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);
    for (const d = start; d <= end; d.setDate(d.getDate() + 1)) out.push(toIsoDate(d));
    return out;
  }, [from, to]);

  const sections = q.data?.sections ?? [];
  const byKey = useMemo(() => {
    const m = new Map<string, { qris: string; kehadiran: string }>();
    for (const r of q.data?.records ?? [])
      m.set(recordKey(r.sectionId, r.pekerja, r.tanggal), { qris: r.qris, kehadiran: r.kehadiran });
    return m;
  }, [q.data]);

  return (
    <div className="space-y-4">
      <div className="glass-card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-52 flex-1">
          <Label htmlFor="rep-uker">Unit Kerja</Label>
          <select
            id="rep-uker"
            value={activeUkerId}
            onChange={(e) => setUkerId(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {ukers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nama}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="rep-periode">Periode</Label>
          <select
            id="rep-periode"
            value={periode}
            onChange={(e) => setPeriode(e.target.value as Periode)}
            className="mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="harian">Harian</option>
            <option value="mingguan">Mingguan</option>
            <option value="bulanan">Bulanan</option>
          </select>
        </div>
        <div>
          <Label htmlFor="rep-tanggal">Tanggal Acuan</Label>
          <Input
            id="rep-tanggal"
            type="date"
            value={anchor}
            onChange={(e) => setAnchor(e.target.value || toIsoDate(new Date()))}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Rentang: {from} s/d {to}
        </p>
      </div>

      {q.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Memuat laporan…
        </p>
      ) : sections.length ? (
        sections.map((s) => (
          <div key={s.id} className="glass-card space-y-3 p-4">
            <h3 className="font-semibold">
              {s.urutan}. {s.nama}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3">Nama Pekerja</th>
                    {days.map((d) => (
                      <th key={d} className="px-1 py-2 text-center">
                        {d.slice(8)}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center">Hadir</th>
                    <th className="px-2 py-2 text-center">Tidak</th>
                  </tr>
                </thead>
                <tbody>
                  {s.pekerja.length ? (
                    s.pekerja.map((p) => {
                      let hadir = 0;
                      let tidak = 0;
                      const cells = days.map((d) => {
                        const rec = byKey.get(recordKey(s.id, p, d));
                        const ok = isQrisFilled(rec?.qris);
                        if (ok) hadir += 1;
                        else if (rec) tidak += 1;
                        return { d, ok, rec };
                      });
                      return (
                        <tr key={p} className="border-t border-border/50">
                          <td className="py-2 pr-3 font-medium">{p}</td>
                          {cells.map((c) => (
                            <td
                              key={c.d}
                              className="px-1 py-2 text-center"
                              title={c.rec ? `${c.rec.kehadiran} — QRIS: ${c.rec.qris || "-"}` : "Belum ada data"}
                            >
                              {c.ok ? (
                                <span className="text-emerald-500">✓</span>
                              ) : c.rec ? (
                                <span className="text-destructive">✕</span>
                              ) : (
                                <span className="text-muted-foreground">·</span>
                              )}
                            </td>
                          ))}
                          <td className="px-2 py-2 text-center font-semibold text-emerald-500">
                            {hadir}
                          </td>
                          <td className="px-2 py-2 text-center font-semibold text-destructive">
                            {tidak}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="py-2 text-muted-foreground" colSpan={days.length + 3}>
                        Belum ada pekerja pada bagian ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">Belum ada bagian untuk unit kerja ini.</p>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/admin/setting-doa-pagi")({
  head: () => ({
    meta: [
      { title: "Setting Absensi Doa Pagi — Panel BRI BO Pringsewu" },
      {
        name: "description",
        content:
          "Kelola bagian absensi doa & briefing pagi: nomor urut, nama bagian, deskripsi, keterangan, dan daftar pekerja.",
      },
      { property: "og:title", content: "Setting Absensi Doa Pagi — Panel BRI BO Pringsewu" },
      {
        property: "og:description",
        content: "Pengaturan bagian dan daftar pekerja untuk absensi doa & briefing pagi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

type Form = Omit<DoaPagiSection, "id"> & { id?: string };

const emptyForm = (ukerId: string, ukerNama: string, urutan: number): Form => ({
  ukerId,
  ukerNama,
  urutan,
  nama: "",
  deskripsi: "",
  keterangan: "",
  pekerja: [],
});

function Page() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["doa-pagi", "settings"], queryFn: () => getDoaPagiSettings() });
  const ukers = q.data?.ukers ?? [];
  const employees = q.data?.employees ?? [];
  const [ukerId, setUkerId] = useState<string>("");
  const activeUkerId = ukerId || ukers[0]?.id || "";
  const activeUker = ukers.find((u) => u.id === activeUkerId);

  const sections = useMemo(
    () =>
      (q.data?.sections ?? [])
        .filter((s) => s.ukerId === activeUkerId)
        .slice()
        .sort((a, b) => a.urutan - b.urutan),
    [q.data, activeUkerId],
  );

  const [tab, setTab] = useState<"setting" | "laporan">("setting");
  const [form, setForm] = useState<Form | null>(null);
  const [jabatanFilter, setJabatanFilter] = useState("");

  /** Pekerja hanya dari unit kerja yang sedang dipilih admin. */
  const ukerEmployees = useMemo(
    () => employees.filter((e) => e.ukerId === activeUkerId),
    [employees, activeUkerId],
  );

  const jabatanOptions = useMemo(
    () =>
      Array.from(new Set(ukerEmployees.map((e) => e.jabatan))).sort((a, b) => a.localeCompare(b)),
    [ukerEmployees],
  );

  const visibleEmployees = useMemo(
    () => ukerEmployees.filter((e) => !jabatanFilter || e.jabatan === jabatanFilter),
    [ukerEmployees, jabatanFilter],
  );



  const save = useMutation({
    mutationFn: (f: Form) => saveDoaPagiSection({ data: f }),
    onSuccess: async () => {
      toast.success("Bagian tersimpan.");
      setForm(null);
      await qc.invalidateQueries({ queryKey: ["doa-pagi"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteDoaPagiSection({ data: { id } }),
    onSuccess: async () => {
      toast.success("Bagian dihapus.");
      await qc.invalidateQueries({ queryKey: ["doa-pagi"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function startNew() {
    if (!activeUker) return;
    setForm(emptyForm(activeUker.id, activeUker.nama, sections.length + 1));
  }

  function submit() {
    if (!form) return;
    if (!form.nama.trim()) {
      toast.error("Nama bagian wajib diisi.");
      return;
    }
    save.mutate({ ...form, nama: form.nama.trim() });
  }

  return (
    <AdminPage menuKey="setting-doa-pagi">
      <div className="space-y-5">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Sunrise className="size-6" /> Absensi Doa Pagi
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola bagian per unit kerja: nomor urut, nama bagian, deskripsi, keterangan, dan daftar
            pekerja yang tampil pada layar absensi.
          </p>
        </div>

        <div className="inline-flex rounded-full border border-input bg-muted/40 p-1">
          {(["setting", "laporan"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                tab === t
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "setting" ? "Pengaturan" : "Laporan Absensi"}
            </button>
          ))}
        </div>

        {tab === "laporan" ? (
          <ReportPanel ukers={ukers} />
        ) : (
        <>
        <LogoSettings />

        {q.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Memuat pengaturan…
          </p>
        ) : (
          <>
            <div className="glass-card flex flex-wrap items-end gap-3 p-4">
              <div className="min-w-56 flex-1">
                <Label htmlFor="uker">Unit Kerja</Label>
                <select
                  id="uker"
                  value={activeUkerId}
                  onChange={(e) => {
                    setUkerId(e.target.value);
                    setForm(null);
                    setJabatanFilter("");
                  }}

                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {ukers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nama}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={startNew} disabled={!activeUker}>
                <Plus className="size-4" /> Bagian Baru
              </Button>
            </div>

            {form ? (
              <div className="glass-card space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{form.id ? "Ubah Bagian" : "Bagian Baru"}</h2>
                  <Button variant="ghost" size="icon" onClick={() => setForm(null)} aria-label="Tutup">
                    <X className="size-4" />
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <div>
                    <Label htmlFor="urutan">Nomor Urut</Label>
                    <Input
                      id="urutan"
                      type="number"
                      min={1}
                      value={form.urutan}
                      onChange={(e) => setForm({ ...form, urutan: Number(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="nama">Nama Bagian</Label>
                    <Input
                      id="nama"
                      value={form.nama}
                      maxLength={80}
                      placeholder="contoh: ADK"
                      onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="deskripsi">Deskripsi</Label>
                    <Textarea
                      id="deskripsi"
                      value={form.deskripsi}
                      maxLength={500}
                      onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="keterangan">Keterangan</Label>
                    <Textarea
                      id="keterangan"
                      value={form.keterangan}
                      maxLength={500}
                      onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="filter-jabatan">Pilih Pekerja (Filter Jabatan)</Label>
                      <select
                        id="filter-jabatan"
                        value={jabatanFilter}
                        onChange={(e) => setJabatanFilter(e.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Semua jabatan</option>
                        {jabatanOptions.map((j) => (
                          <option key={j} value={j}>
                            {j}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-input p-2">
                      {visibleEmployees.length ? (
                        visibleEmployees.map((emp) => {
                          const checked = form.pekerja.includes(emp.nama);
                          return (
                            <label
                              key={`${emp.nama}-${emp.jabatan}`}
                              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                            >
                              <input
                                type="checkbox"
                                className="size-4 accent-primary"
                                checked={checked}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    pekerja: e.target.checked
                                      ? [...form.pekerja, emp.nama]
                                      : form.pekerja.filter((x) => x !== emp.nama),
                                  })
                                }
                              />
                              <span className="flex-1">{emp.nama}</span>
                              <span className="text-xs text-muted-foreground">{emp.jabatan}</span>
                            </label>
                          );
                        })
                      ) : (
                        <p className="px-2 py-1.5 text-sm text-muted-foreground">
                          Belum ada data pekerja pada unit kerja ini.
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Hanya pegawai unit kerja <strong>{activeUker?.nama ?? "-"}</strong>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Pekerja Terdaftar di Bagian Ini ({form.pekerja.length})</Label>
                    <div className="max-h-[21.5rem] space-y-1 overflow-y-auto rounded-md border border-input p-2">
                      {form.pekerja.length ? (
                        form.pekerja.map((p, i) => (
                          <div
                            key={p}
                            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                          >
                            <Badge variant="secondary" className="min-w-7 justify-center">
                              {i + 1}
                            </Badge>
                            <span className="flex-1">{p}</span>
                            <button
                              type="button"
                              aria-label={`Hapus ${p}`}
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                setForm({ ...form, pekerja: form.pekerja.filter((x) => x !== p) })
                              }
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="px-2 py-1.5 text-sm text-muted-foreground">
                          Belum ada pekerja dipilih. Ceklis pekerja di sebelah kiri.
                        </p>
                      )}
                    </div>
                  </div>
                </div>



                <Button onClick={submit} disabled={save.isPending}>
                  {save.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Simpan
                </Button>
              </div>
            ) : null}

            <div className="space-y-3">
              {sections.length ? (
                sections.map((s) => (
                  <div key={s.id} className="glass-card flex flex-wrap items-start gap-4 p-4">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-muted font-bold">
                      {s.urutan}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="font-semibold">{s.nama}</h3>
                      {s.deskripsi ? (
                        <p className="text-sm text-muted-foreground">{s.deskripsi}</p>
                      ) : null}
                      {s.keterangan ? (
                        <p className="text-xs text-muted-foreground">{s.keterangan}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {s.pekerja.length} pekerja
                        {s.pekerja.length ? `: ${s.pekerja.join(", ")}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setForm({ ...s })}>
                        Ubah
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Hapus bagian ${s.nama}`}
                        onClick={() => remove.mutate(s.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Belum ada bagian untuk unit kerja ini.
                </p>
              )}
            </div>
          </>
        )}
        </>
        )}
      </div>
    </AdminPage>
  );
}
