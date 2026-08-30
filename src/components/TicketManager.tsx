import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { CheckCircle2, HandHelping, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAccess } from "@/lib/access";
import { useDirectory } from "@/lib/directory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const db = supabase as unknown as SupabaseClient;
const BUCKET = "ticket-photos";

export type TicketStatus = "open" | "in_progress" | "done";

type Ticket = {
  id: string;
  judul: string;
  deskripsi: string | null;
  foto_url: string | null;
  reporter_nama: string | null;
  reporter_uker: string | null;
  reported_by: string | null;
  handled_by: string | null;
  handled_at: string | null;
  catatan_tindak_lanjut: string | null;
  status: TicketStatus;
  created_at: string;
  resolved_at: string | null;
};

const statusMeta: Record<TicketStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  in_progress: { label: "In Progress", className: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  done: { label: "Done", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};

function fmt(v: string | null) {
  if (!v) return "-";
  return new Date(v).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function useTickets() {
  return useQuery({
    queryKey: ["it_tickets"],
    queryFn: async () => {
      const { data, error } = await db
        .from("it_tickets")
        .select(
          "id,judul,deskripsi,foto_url,reporter_nama,reporter_uker,reported_by,handled_by,handled_at,catatan_tindak_lanjut,status,created_at,resolved_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Ticket[];
    },
  });
}

/** Menu Tiket IT: manajemen membuat tiket, petugas IT menindaklanjuti. */
export function TicketManager() {
  const access = useAccess();
  const dir = useDirectory();
  const qc = useQueryClient();
  const tickets = useTickets();

  const isPetugasIt = access.level === "super_admin" || access.level === "admin";
  const canCreate = access.level === "super_admin" || access.level === "manajemen";

  const [open, setOpen] = useState(false);
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const rows = useMemo(() => tickets.data ?? [], [tickets.data]);
  const mine = useMemo(
    () => rows.filter((t) => t.reported_by === dir.myId),
    [rows, dir.myId],
  );
  const list = isPetugasIt ? rows : mine;

  const create = useMutation({
    mutationFn: async () => {
      if (!judul.trim()) throw new Error("Judul tiket wajib diisi.");
      let foto_url: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${dir.myId}/${Date.now()}.${ext}`;
        const { error: upErr } = await db.storage.from(BUCKET).upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        foto_url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      }
      const { error } = await db.from("it_tickets").insert({
        judul: judul.trim(),
        deskripsi: deskripsi.trim() || null,
        foto_url,
        reported_by: dir.myId,
        status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tiket IT berhasil dibuat.");
      setOpen(false);
      setJudul("");
      setDeskripsi("");
      setFile(null);
      void qc.invalidateQueries({ queryKey: ["it_tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (v: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await db.from("it_tickets").update(v.patch).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["it_tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("it_tickets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tiket dihapus.");
      void qc.invalidateQueries({ queryKey: ["it_tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handover(t: Ticket) {
    update.mutate(
      {
        id: t.id,
        patch: {
          status: "in_progress",
          handled_by: dir.myId,
          handled_at: new Date().toISOString(),
        },
      },
      { onSuccess: () => toast.success("Tiket diambil untuk ditindaklanjuti.") },
    );
  }

  function selesaikan(t: Ticket) {
    update.mutate(
      {
        id: t.id,
        patch: {
          status: "done",
          handled_by: t.handled_by ?? dir.myId,
          handled_at: t.handled_at ?? new Date().toISOString(),
          resolved_at: new Date().toISOString(),
        },
      },
      { onSuccess: () => toast.success("Tiket ditandai selesai.") },
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="gradient-text">Tiket IT</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isPetugasIt
              ? "Tindak lanjuti tiket yang dibuka manajemen dan perbarui statusnya."
              : "Buka tiket keluhan IT. Nama pembuat, unit kerja, dan tanggal terisi otomatis."}
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Buat Tiket
          </Button>
        ) : null}
      </div>

      {tickets.isLoading ? (
        <div className="glass-card mt-6 p-10 text-center text-sm text-muted-foreground">
          Memuat tiket…
        </div>
      ) : list.length === 0 ? (
        <div className="glass-card mt-6 p-10 text-center text-sm text-muted-foreground">
          {isPetugasIt ? "Belum ada tiket masuk." : "Anda belum membuat tiket."}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {list.map((t) => {
            const meta = statusMeta[t.status] ?? statusMeta.open;
            return (
              <div key={t.id} className="glass-card flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{t.judul}</h2>
                    <p className="text-xs text-muted-foreground">{fmt(t.created_at)}</p>
                  </div>
                  <Badge variant="outline" className={meta.className}>
                    {meta.label}
                  </Badge>
                </div>

                {t.deskripsi ? (
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{t.deskripsi}</p>
                ) : null}

                {t.foto_url ? (
                  <a href={t.foto_url} target="_blank" rel="noreferrer">
                    <img
                      src={t.foto_url}
                      alt={`Foto tiket ${t.judul}`}
                      loading="lazy"
                      className="max-h-56 w-full rounded-xl object-cover"
                    />
                  </a>
                ) : null}

                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Pembuat</dt>
                    <dd>{t.reporter_nama || dir.nameOf(t.reported_by ?? "")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Unit Kerja</dt>
                    <dd>{t.reporter_uker || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Petugas IT</dt>
                    <dd>{t.handled_by ? dir.nameOf(t.handled_by) : "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Selesai</dt>
                    <dd>{fmt(t.resolved_at)}</dd>
                  </div>
                </dl>

                {isPetugasIt ? (
                  <div className="flex flex-wrap gap-2">
                    {t.status === "open" ? (
                      <Button size="sm" onClick={() => handover(t)} disabled={update.isPending}>
                        {update.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <HandHelping className="size-4" />
                        )}
                        Tindak Lanjuti
                      </Button>
                    ) : null}
                    {t.status !== "done" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => selesaikan(t)}
                        disabled={update.isPending}
                      >
                        <CheckCircle2 className="size-4" /> Tandai Selesai
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          update.mutate({
                            id: t.id,
                            patch: { status: "in_progress", resolved_at: null },
                          })
                        }
                        disabled={update.isPending}
                      >
                        Buka Kembali
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove.mutate(t.id)}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ) : t.status === "open" ? (
                  <div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove.mutate(t.id)}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="size-4" /> Batalkan tiket
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Tiket IT</DialogTitle>
            <DialogDescription>
              Nama pembuat, unit kerja, tanggal, dan status Open terisi otomatis oleh sistem.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="judul">Judul</Label>
              <Input
                id="judul"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Printer teller tidak terdeteksi"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="deskripsi">Deskripsi Problem</Label>
              <Textarea
                id="deskripsi"
                rows={4}
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Jelaskan kendala yang dialami"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="foto" className="flex items-center gap-2">
                <ImagePlus className="size-4" /> Foto (opsional)
              </Label>
              <Input
                id="foto"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Submit Tiket
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </>
  );
}
