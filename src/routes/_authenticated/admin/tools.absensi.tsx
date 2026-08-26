import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Copy, Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  defaultUnitKerjaList,
  formatDateID,
  slugify,
  type AbsensiSettings,
} from "@/lib/absensi-ui";
import { listAbsensiEvents, saveAbsensiEvent } from "@/lib/absensi.functions";

export const Route = createFileRoute("/_authenticated/admin/tools/absensi")({
  head: () => ({
    meta: [
      { title: "Absensi Event — SuperIT Apps" },
      {
        name: "description",
        content: "Kelola absensi digital tiap event: buat link absensi baru dan pantau pesertanya.",
      },
      { property: "og:title", content: "Absensi Event — SuperIT Apps" },
      {
        property: "og:description",
        content: "Kelola absensi digital tiap event BRI BO Pringsewu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    eventName: "",
    officeName: "BRI BO Pringsewu",
    eventDate: new Date().toISOString().slice(0, 10),
  });

  const q = useQuery({
    queryKey: ["absensi-events"],
    queryFn: () => listAbsensiEvents(),
  });

  async function create() {
    if (form.eventName.trim().length < 3) {
      toast.error("Nama event minimal 3 karakter");
      return;
    }
    setSaving(true);
    try {
      const slug = `${slugify(form.eventName)}-${Math.random().toString(36).slice(2, 7)}`;
      const res = await saveAbsensiEvent({
        data: {
          slug,
          eventName: form.eventName.trim(),
          officeName: form.officeName.trim(),
          eventDate: form.eventDate,
          logo: null,
          logoLeft: null,
          logoRight: null,
          logoLeftSize: 136,
          logoRightSize: 136,
          background: null,
          cardBackground: null,
          themeColor: "gold",
          fields: {
            nama: true,
            personalNumber: true,
            unitKerja: true,
            noTelp: true,
            fotoSelfie: true,
          },
          unitKerjaList: defaultUnitKerjaList,
          isOpen: true,
        },
      });
      setOpen(false);
      void navigate({ to: "/admin/tools/absensi/$id", params: { id: res.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat absensi event");
    }
    setSaving(false);
  }

  function copyLink(slug: string) {
    void navigator.clipboard.writeText(`${window.location.origin}/absensi/${slug}`);
    toast.success("Link absensi disalin");
  }

  const events = (q.data?.events ?? []) as AbsensiSettings[];
  const counts = q.data?.counts ?? {};

  return (
    <AdminPage menuKey="tools">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <CalendarCheck className="size-6" /> Absensi Event
            </h1>
            <p className="text-sm text-muted-foreground">
              Setiap event punya link absensi sendiri untuk dibagikan ke pekerja, lengkap dengan
              pengaturan dan admin masing-masing.
            </p>
          </div>
          {q.data?.panel ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Absensi Event Baru
            </Button>
          ) : null}
        </div>

        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : events.length === 0 ? (
          <div className="glass-card p-8 text-center text-sm text-muted-foreground">
            Belum ada absensi event.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {events.map((ev) => (
              <div key={ev.id} className="glass-card space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{ev.eventName}</h2>
                    <p className="text-xs text-muted-foreground">
                      {ev.officeName} · {formatDateID(ev.eventDate)}
                    </p>
                  </div>
                  <Badge variant={ev.isOpen ? "default" : "secondary"}>
                    {ev.isOpen ? "Dibuka" : "Ditutup"}
                  </Badge>
                </div>
                <p className="text-sm">
                  <span className="font-semibold">{counts[ev.id] ?? 0}</span>{" "}
                  <span className="text-muted-foreground">peserta absen</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link to="/admin/tools/absensi/$id" params={{ id: ev.id }}>
                      Kelola
                    </Link>
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => copyLink(ev.slug)}>
                    <Copy className="size-4" /> Salin link
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Absensi Event Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nama Event</Label>
              <Input
                value={form.eventName}
                onChange={(e) => setForm((f) => ({ ...f, eventName: e.target.value }))}
                placeholder="Contoh: Brilian Culture Fest"
              />
            </div>
            <div>
              <Label>Nama Kantor</Label>
              <Input
                value={form.officeName}
                onChange={(e) => setForm((f) => ({ ...f, officeName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Tanggal Event</Label>
              <Input
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={create} disabled={saving}>
              {saving ? "Menyimpan..." : "Buat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
