import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Save, Sunrise, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { AdminPage } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { DoaPagiSection } from "@/lib/doa-pagi-ui";
import {
  deleteDoaPagiSection,
  getDoaPagiSettings,
  saveDoaPagiSection,
} from "@/lib/doa-pagi.functions";

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
      </div>
    </AdminPage>
  );
}
