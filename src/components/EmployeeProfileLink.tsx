import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { UserRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { PhotoGallery } from "@/components/PhotoGallery";
import { EventPhotoGrid } from "@/components/EventPhotoGrid";

const db = supabase as unknown as SupabaseClient;

type Detail = {
  personal_number: string;
  jabatan: string;
  uker: string;
  no_telepon: string;
  profil: string;
  updated: string;
};

/** Nama pekerja yang bisa diklik: membuka pop up detail pekerja. */
export function EmployeeProfileLink({
  employeeId,
  nama,
}: {
  employeeId: string;
  nama: string;
}) {
  const [open, setOpen] = useState(false);

  const detail = useQuery<Detail | null>({
    queryKey: ["employee-profile", employeeId],
    enabled: open && !!employeeId,
    queryFn: async () => {
      const { data, error } = await db
        .from("employees")
        .select("*")
        .eq("id", employeeId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as Record<string, unknown>;

      let jabatan = "";
      const jabatanId = String(row["jabatan_id"] ?? "");
      if (jabatanId) {
        const { data: jt } = await db
          .from("job_titles")
          .select("nama_jabatan")
          .eq("id", jabatanId)
          .maybeSingle();
        jabatan = String((jt as Record<string, unknown> | null)?.["nama_jabatan"] ?? "");
      }

      let uker = String(row["uker"] ?? "");
      const ukerId = String(row["uker_id"] ?? "");
      if (!uker && ukerId) {
        const { data: u } = await db
          .from("ukers")
          .select("nama_uker")
          .eq("id", ukerId)
          .maybeSingle();
        uker = String((u as Record<string, unknown> | null)?.["nama_uker"] ?? "");
      }

      const updatedRaw = String(row["updated_at"] ?? row["created_at"] ?? "");
      return {
        personal_number: String(row["personal_number"] ?? ""),
        jabatan,
        uker,
        no_telepon: String(row["no_telepon"] ?? ""),
        profil: String(row["profil"] ?? ""),
        updated: updatedRaw
          ? new Date(updatedRaw).toLocaleDateString("id-ID", { dateStyle: "medium" })
          : "—",
      };
    },
  });

  const d = detail.data;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-left text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={`Lihat detail pekerja ${nama}`}
      >
        <UserRound className="size-3.5 shrink-0" />
        <span>{nama}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold tracking-tight">{nama}</DialogTitle>
            <DialogDescription className="sr-only">Detail pekerja</DialogDescription>
          </DialogHeader>

          {detail.isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat detail pekerja…</p>
          ) : (
            <div className="space-y-4">
              <dl className="space-y-2">
                <Field label="Personal Number">{d?.personal_number || "—"}</Field>
                <Field label="Jabatan">{d?.jabatan || "—"}</Field>
                <Field label="Unit Kerja">{d?.uker || "—"}</Field>
                <Field label="No. Telp">{d?.no_telepon || "—"}</Field>
                <Field label="Profile" align="start">
                  <span className="block min-h-24 whitespace-pre-line">
                    {d?.profil || "Belum ada deskripsi profil untuk pekerja ini."}
                  </span>
                </Field>
              </dl>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Foto {nama}</h3>
                <div className="rounded-2xl border border-border/60 p-3">
                  <PhotoGallery entity="pegawai" entityId={employeeId} title="" />
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Foto Event {nama}</h3>
                <div className="rounded-2xl border border-border/60 p-3">
                  <EventPhotoGrid
                    workerId={employeeId}
                    emptyText="Belum ada foto untuk pekerja ini"
                  />
                </div>
              </section>

              <p className="text-right text-xs text-muted-foreground">
                Data Update {d?.updated ?? "—"}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label,
  children,
  align = "center",
}: {
  label: string;
  children: React.ReactNode;
  align?: "center" | "start";
}) {
  return (
    <div className={`flex gap-3 ${align === "start" ? "items-start" : "items-center"}`}>
      <dt className="w-32 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd
        className="flex-1 rounded-full border border-border/60 px-4 py-2 text-sm data-[block=true]:rounded-2xl"
        data-block={align === "start"}
      >
        {children}
      </dd>
    </div>
  );
}
