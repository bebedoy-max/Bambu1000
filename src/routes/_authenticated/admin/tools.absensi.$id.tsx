import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  absensiFieldLabels,
  compressImage,
  exportAbsensiExcel,
  exportAbsensiJSON,
  exportAbsensiPDF,
  formatDateID,
  pickImage,
  themePresets,
  type AbsensiEntry,
  type AbsensiFields,
  type AbsensiSettings,
} from "@/lib/absensi-ui";
import {
  addAbsensiAdmin,
  clearAbsensiEntries,
  deleteAbsensiEntry,
  deleteAbsensiEvent,
  getAbsensiAdminEvent,
  removeAbsensiAdmin,
  saveAbsensiEvent,
} from "@/lib/absensi.functions";

export const Route = createFileRoute("/_authenticated/admin/tools/absensi/$id")({
  head: () => ({
    meta: [
      { title: "Pengaturan Absensi Event — SuperIT Apps" },
      {
        name: "description",
        content: "Atur tampilan, field, admin, dan data peserta untuk satu absensi event.",
      },
      { property: "og:title", content: "Pengaturan Absensi Event — SuperIT Apps" },
      {
        property: "og:description",
        content: "Atur tampilan, field, admin, dan data peserta absensi event.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

type ImageKey = "logo" | "logoLeft" | "logoRight" | "background" | "cardBackground";

const imageFields: { key: ImageKey; label: string; max: number; quality: number }[] = [
  { key: "logo", label: "Logo", max: 400, quality: 0.85 },
  { key: "logoLeft", label: "Logo pojok kiri atas", max: 400, quality: 0.85 },
  { key: "logoRight", label: "Logo pojok kanan atas", max: 400, quality: 0.85 },
  { key: "background", label: "Background", max: 1400, quality: 0.75 },
  { key: "cardBackground", label: "Background kolom absen", max: 900, quality: 0.8 },
];

function Page() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [settings, setSettings] = useState<AbsensiSettings | null>(null);
  const [unitText, setUnitText] = useState("");
  const [saving, setSaving] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  const q = useQuery({
    queryKey: ["absensi-event", id],
    queryFn: () => getAbsensiAdminEvent({ data: { id } }),
  });

  useEffect(() => {
    if (!q.data) return;
    setSettings(q.data.event as AbsensiSettings);
    setUnitText((q.data.event.unitKerjaList ?? []).join("\n"));
  }, [q.data]);

  function update<K extends keyof AbsensiSettings>(key: K, value: AbsensiSettings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  function toggleField(key: keyof AbsensiFields) {
    setSettings((s) => (s ? { ...s, fields: { ...s.fields, [key]: !s.fields[key] } } : s));
  }

  async function uploadImage(f: (typeof imageFields)[number]) {
    const img = await pickImage();
    if (img) update(f.key, await compressImage(img, f.max, f.quality));
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const unitKerjaList = unitText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const { id: _omit, ...rest } = settings;
      await saveAbsensiEvent({ data: { ...rest, id: settings.id, unitKerjaList } });
      setSettings({ ...settings, unitKerjaList });
      toast.success("Pengaturan tersimpan");
      void q.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    }
    setSaving(false);
  }

  const entries = (q.data?.entries ?? []) as AbsensiEntry[];
  const admins = q.data?.admins ?? [];
  const panel = q.data?.panel ?? false;
  const shareUrl = settings
    ? `${typeof window === "undefined" ? "" : window.location.origin}/absensi/${settings.slug}`
    : "";

  return (
    <AdminPage menuKey="tools">
      {q.isLoading || !settings ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Button asChild variant="ghost" size="sm" className="mb-1 -ml-2">
                <Link to="/admin/tools/absensi">
                  <ArrowLeft className="size-4" /> Kembali
                </Link>
              </Button>
              <h1 className="text-2xl font-bold">{settings.eventName}</h1>
              <p className="text-sm text-muted-foreground">
                {settings.officeName} · {formatDateID(settings.eventDate)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(shareUrl);
                  toast.success("Link absensi disalin");
                }}
              >
                <Copy className="size-4" /> Salin link
              </Button>
              <Button asChild variant="secondary">
                <a href={shareUrl} target="_blank" rel="noreferrer">
                  Buka form
                </a>
              </Button>
              {panel ? (
                <Button
                  variant="destructive"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Hapus absensi event?",
                      description:
                        "Semua data peserta dan foto selfie di Google Drive ikut terhapus.",
                      destructive: true,
                    });
                    if (!ok) return;
                    await deleteAbsensiEvent({ data: { id } });
                    toast.success("Absensi event dihapus");
                    void navigate({ to: "/admin/tools/absensi" });
                  }}
                >
                  <Trash2 className="size-4" /> Hapus event
                </Button>
              ) : null}
            </div>
          </div>

          <div className="glass-card space-y-2 p-4">
            <Label>Link absensi untuk dibagikan</Label>
            <Input readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} />
          </div>

          <section className="glass-card space-y-4 p-5">
            <h2 className="font-semibold">Identitas Acara</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Nama Acara</Label>
                <Input
                  value={settings.eventName}
                  onChange={(e) => update("eventName", e.target.value)}
                />
              </div>
              <div>
                <Label>Nama Kantor</Label>
                <Input
                  value={settings.officeName}
                  onChange={(e) => update("officeName", e.target.value)}
                />
              </div>
              <div>
                <Label>Tanggal Acara</Label>
                <Input
                  type="date"
                  value={settings.eventDate}
                  onChange={(e) => update("eventDate", e.target.value)}
                />
              </div>
              <div>
                <Label>Slug link</Label>
                <Input value={settings.slug} onChange={(e) => update("slug", e.target.value)} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.isOpen}
                onChange={(e) => update("isOpen", e.target.checked)}
              />
              Absensi dibuka (peserta bisa mengisi form)
            </label>
          </section>

          <section className="glass-card space-y-4 p-5">
            <h2 className="font-semibold">Tampilan</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {imageFields.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label>{f.label}</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 text-[10px] text-muted-foreground">
                      {settings[f.key] ? (
                        <img
                          src={settings[f.key] as string}
                          alt={f.label}
                          className="size-full object-cover"
                        />
                      ) : (
                        "Kosong"
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="secondary" onClick={() => void uploadImage(f)}>
                        Ganti
                      </Button>
                      {settings[f.key] ? (
                        <Button size="sm" variant="ghost" onClick={() => update(f.key, null)}>
                          Hapus
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Ukuran logo pojok kiri: {settings.logoLeftSize}px</Label>
                <input
                  type="range"
                  min={8}
                  max={320}
                  step={4}
                  className="w-full"
                  value={settings.logoLeftSize}
                  onChange={(e) => update("logoLeftSize", Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Ukuran logo pojok kanan: {settings.logoRightSize}px</Label>
                <input
                  type="range"
                  min={8}
                  max={320}
                  step={4}
                  className="w-full"
                  value={settings.logoRightSize}
                  onChange={(e) => update("logoRightSize", Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tema warna aplikasi</Label>
              <div className="flex flex-wrap gap-2">
                {themePresets.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => update("themeColor", t.key)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                      settings.themeColor === t.key ? "border-primary" : "border-border/60"
                    }`}
                  >
                    <span
                      className="inline-block size-4 rounded-full"
                      style={{ background: t.accent }}
                    />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="glass-card space-y-3 p-5">
            <h2 className="font-semibold">Field yang diambil di form absensi</h2>
            {(Object.keys(absensiFieldLabels) as (keyof AbsensiFields)[]).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!settings.fields[key]}
                  onChange={() => toggleField(key)}
                />
                {absensiFieldLabels[key]}
              </label>
            ))}
          </section>

          <section className="glass-card space-y-3 p-5">
            <h2 className="font-semibold">Daftar Unit Kerja (satu baris satu unit)</h2>
            <Textarea rows={8} value={unitText} onChange={(e) => setUnitText(e.target.value)} />
          </section>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </div>

          <section className="glass-card space-y-3 p-5">
            <h2 className="font-semibold">Admin Absensi Event Ini</h2>
            <p className="text-xs text-muted-foreground">
              Admin panel (Super Admin / Admin IT) selalu bisa mengelola. Tambahkan user lain di
              sini agar bisa mengelola absensi event ini saja.
            </p>
            <div className="flex flex-wrap gap-2">
              <Input
                className="max-w-xs"
                placeholder="email user panel"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    await addAbsensiAdmin({ data: { eventId: id, email: adminEmail } });
                    setAdminEmail("");
                    toast.success("Admin ditambahkan");
                    void q.refetch();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Gagal menambah admin");
                  }
                }}
              >
                Tambah
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {admins.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada admin khusus.</p>
              ) : (
                admins.map((a) => (
                  <Badge key={a.id} variant="secondary" className="gap-2">
                    {a.email ?? a.userId}
                    <button
                      type="button"
                      onClick={async () => {
                        await removeAbsensiAdmin({ data: { eventId: id, id: a.id } });
                        void q.refetch();
                      }}
                    >
                      ×
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </section>

          <section className="glass-card space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">
                Data Absensi · {entries.length} peserta
              </h2>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => exportAbsensiJSON(entries)}>
                  JSON
                </Button>
                <Button size="sm" variant="secondary" onClick={() => exportAbsensiExcel(entries)}>
                  Excel
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => exportAbsensiPDF(entries, `${settings.eventName} — Data Absensi`)}
                >
                  PDF
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Hapus semua data absensi?",
                      description:
                        "Data peserta dan foto selfie di Google Drive akan dihapus permanen.",
                      destructive: true,
                    });
                    if (!ok) return;
                    await clearAbsensiEntries({ data: { eventId: id } });
                    toast.success("Data absensi dihapus");
                    void q.refetch();
                  }}
                >
                  Hapus semua
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2">Waktu</th>
                    <th className="p-2">Nama</th>
                    <th className="p-2">Personal Number</th>
                    <th className="p-2">Unit Kerja</th>
                    <th className="p-2">No. Telp</th>
                    <th className="p-2">Foto</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td className="p-3 text-muted-foreground" colSpan={7}>
                        Belum ada data absensi.
                      </td>
                    </tr>
                  ) : (
                    entries
                      .slice()
                      .reverse()
                      .map((row) => (
                        <tr key={row.id} className="border-t border-border/60">
                          <td className="p-2">
                            {new Date(row.submittedAt).toLocaleString("id-ID")}
                          </td>
                          <td className="p-2">{row.nama || "-"}</td>
                          <td className="p-2">{row.personalNumber || "-"}</td>
                          <td className="p-2">{row.unitKerja || "-"}</td>
                          <td className="p-2">{row.noTelp || "-"}</td>
                          <td className="p-2">
                            {row.photoThumbnailUrl ? (
                              <a href={row.photoUrl ?? "#"} target="_blank" rel="noreferrer">
                                <img
                                  src={row.photoThumbnailUrl}
                                  alt={`Foto selfie ${row.nama || "peserta"}`}
                                  className="size-9 rounded-md object-cover"
                                />
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="p-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={async () => {
                                const ok = await confirm({
                                  title: "Hapus data peserta ini?",
                                  destructive: true,
                                });
                                if (!ok) return;
                                await deleteAbsensiEntry({
                                  data: { eventId: id, entryId: row.id },
                                });
                                void q.refetch();
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </AdminPage>
  );
}
