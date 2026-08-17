import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";


// Dynamic table names need an untyped client.
const db = supabase as unknown as SupabaseClient;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export type FieldType =
  | "text"
  | "number"
  | "date"
  | "datetime"
  | "textarea"
  | "boolean"
  | "select"
  | "uker"
  | "ref"
  | "digits"
  | "ip"
  | "latlng";


/** Hanya angka. */
export function formatDigits(v: string) {
  return v.replace(/\D/g, "");
}

/** Auto format IP: user ketik angka → 013.156.017.001 */
export function formatIp(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 12);
  return (d.match(/.{1,3}/g) ?? []).join(".");
}

export function isValidIp(v: string) {
  const parts = v.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}

/** "latitude, longitude" */
export function isValidLatLng(v: string) {
  const m = v.split(",").map((s) => s.trim());
  if (m.length !== 2) return false;
  const lat = Number(m[0]);
  const lng = Number(m[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (!/^-?\d+(\.\d+)?$/.test(m[0]!) || !/^-?\d+(\.\d+)?$/.test(m[1]!)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export type Field = {
  key: string;
  label: string;
  type?: FieldType;
  options?: string[];
  required?: boolean;
  hideInTable?: boolean;
  hideInForm?: boolean;
  /** Untuk type "digits": jumlah digit wajib. */
  digitsLength?: number;
  /** Untuk type "ref": tabel sumber pilihan. */
  refTable?: string;
  /** Kolom teks yang dipakai sebagai label pilihan. */
  refLabelColumn?: string;
  /** Placeholder khusus. */
  placeholder?: string;
};


type Row = Record<string, unknown>;

export type ResourceManagerProps = {
  table: string;
  title: string;
  description?: string;
  fields: Field[];
  orderBy?: string;
  canWrite?: boolean;
  /** Column set to the current user id on insert (e.g. uploaded_by, created_by). */
  ownerColumn?: string;
  extraActions?: (row: Row) => React.ReactNode;
};

function emptyForm(fields: Field[]): Row {
  const out: Row = {};
  for (const f of fields) {
    if (f.hideInForm) continue;
    out[f.key] = f.type === "boolean" ? true : "";
  }
  return out;
}

export function ResourceManager({
  table,
  title,
  description,
  fields,
  orderBy = "created_at",
  canWrite = true,
  ownerColumn,
  extraActions,
}: ResourceManagerProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>(() => emptyForm(fields));
  const urlSearch = useSearch({ strict: false }) as { q?: string; focus?: string };
  const [q, setQ] = useState(urlSearch.q ?? "");
  const focusId = urlSearch.focus;
  const focusRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    if (urlSearch.q !== undefined) setQ(urlSearch.q);
  }, [urlSearch.q]);


  const needsUkers = fields.some((f) => f.type === "uker");

  const list = useQuery({
    queryKey: [table, orderBy],
    queryFn: async () => {
      const { data, error } = await db
        .from(table)
        .select("*")
        .order(orderBy, { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const ukers = useQuery({
    queryKey: ["ukers-options"],
    enabled: needsUkers,
    queryFn: async () => {
      const { data, error } = await db
        .from("ukers")
        .select("id, kode_uker, nama_uker")
        .order("kode_uker");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const refFields = useMemo(
    () => fields.filter((f) => f.type === "ref" && f.refTable),
    [fields],
  );

  const refs = useQuery({
    queryKey: ["ref-options", refFields.map((f) => `${f.refTable}:${f.refLabelColumn}`).join(",")],
    enabled: refFields.length > 0,
    queryFn: async () => {
      const out: Record<string, Row[]> = {};
      for (const f of refFields) {
        const col = f.refLabelColumn ?? "nama";
        const { data, error } = await db.from(f.refTable!).select(`id, ${col}`).order(col);
        if (error) throw error;
        out[f.key] = (data ?? []) as unknown as Row[];
      }
      return out;
    },
  });

  const ukerLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of ukers.data ?? [])
      m.set(String(u["id"]), `${String(u["kode_uker"])} — ${String(u["nama_uker"])}`);
    return m;
  }, [ukers.data]);

  const save = useMutation({
    mutationFn: async (payload: Row) => {
      const body: Row = {};
      for (const f of fields) {
        if (f.hideInForm) continue;
        const v = payload[f.key];
        const str = typeof v === "string" ? v.trim() : v;
        if (f.type === "boolean") body[f.key] = Boolean(v);
        else if (str === "" || str === undefined || str === null) {
          if (f.required) throw new Error(`${f.label} wajib diisi`);
          body[f.key] = null;
        } else if (f.type === "digits") {
          if (!/^\d+$/.test(String(str))) throw new Error(`${f.label} harus berupa angka saja`);
          if (f.digitsLength && String(str).length !== f.digitsLength)
            throw new Error(`${f.label} harus ${f.digitsLength} digit angka`);
          body[f.key] = String(str);

        } else if (f.type === "ip") {
          if (!isValidIp(String(str)))
            throw new Error(`${f.label} harus format IP valid, contoh 013.156.017.001`);
          body[f.key] = String(str);
        } else if (f.type === "latlng") {
          if (!isValidLatLng(String(str)))
            throw new Error(`${f.label} harus format "latitude, longitude" yang valid`);
          body[f.key] = String(str);
        } else if (f.type === "number") body[f.key] = Number(str);
        else body[f.key] = str;
      }
      if (editing) {
        const { error } = await db.from(table).update(body).eq("id", editing["id"] as string);
        if (error) throw error;
      } else {
        if (ownerColumn) {
          const { data: auth } = await db.auth.getUser();
          body[ownerColumn] = auth.user?.id ?? null;
        }
        const { error } = await db.from(table).insert(body);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Data diperbarui" : "Data ditambahkan");
      setOpen(false);
      setEditing(null);
      void qc.invalidateQueries({ queryKey: [table] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Data dihapus");
      void qc.invalidateQueries({ queryKey: [table] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tableFields = fields.filter((f) => !f.hideInTable);
  const formFields = fields.filter((f) => !f.hideInForm);

  const rows = (list.data ?? []).filter((r) =>
    q.trim() ? JSON.stringify(r).toLowerCase().includes(q.toLowerCase()) : true,
  );

  useEffect(() => {
    if (focusId && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusId, list.data]);


  function renderCell(f: Field, row: Row) {
    const v = row[f.key];
    if (f.type === "boolean")
      return (
        <Badge variant={v ? "default" : "secondary"}>{v ? "Aktif" : "Nonaktif"}</Badge>
      );
    if (f.type === "uker") return ukerLabel.get(v as string) ?? "—";
    if (f.type === "ref") {
      const opt = (refs.data?.[f.key] ?? []).find((o) => String(o["id"]) === String(v));
      return opt ? String(opt[f.refLabelColumn ?? "nama"] ?? "—") : "—";
    }

    if (v === null || v === undefined || v === "") return "—";
    if (f.type === "datetime") return new Date(String(v)).toLocaleString("id-ID");
    return String(v);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari…"
              className="w-56 pl-9"
            />
          </div>
          {canWrite ? (
            <Button
              onClick={() => {
                setEditing(null);
                setForm(emptyForm(fields));
                setOpen(true);
              }}
            >
              <Plus className="size-4" /> Tambah
            </Button>
          ) : null}
        </div>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
              {tableFields.map((f) => (
                <th key={f.key} className="px-4 py-3 font-medium whitespace-nowrap">
                  {f.label}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {list.isLoading ? (
              <tr>
                <td colSpan={tableFields.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                  Memuat data…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={tableFields.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                  Belum ada data.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={String(row["id"])}
                  ref={String(row["id"]) === focusId ? focusRef : undefined}
                  className={`border-b border-border/40 last:border-0 hover:bg-secondary/40 ${
                    String(row["id"]) === focusId ? "bg-primary/15 ring-1 ring-primary/40" : ""
                  }`}
                >

                  {tableFields.map((f) => (
                    <td key={f.key} className="px-4 py-3 whitespace-nowrap">
                      {renderCell(f, row)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {extraActions?.(row)}
                      {canWrite ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditing(row);
                              const next: Row = {};
                              for (const f of formFields) next[f.key] = row[f.key] ?? "";
                              setForm(next);
                              setOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Hapus data ini?")) remove.mutate(String(row["id"]));
                            }}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Ubah ${title}` : `Tambah ${title}`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {formFields.map((f) => (
              <div key={f.key} className="grid gap-2">
                <Label htmlFor={f.key}>{f.label}</Label>
                {f.type === "textarea" ? (
                  <Textarea
                    id={f.key}
                    value={String(form[f.key] ?? "")}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                ) : f.type === "boolean" ? (
                  <Switch
                    id={f.key}
                    checked={Boolean(form[f.key])}
                    onCheckedChange={(v) => setForm({ ...form, [f.key]: v })}
                  />
                ) : f.type === "select" ? (
                  <select
                    id={f.key}
                    className="h-10 rounded-xl border border-input bg-popover px-3 text-sm"
                    value={String(form[f.key] ?? "")}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  >
                    <option value="">— pilih —</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : f.type === "uker" ? (
                  <select
                    id={f.key}
                    className="h-10 rounded-xl border border-input bg-popover px-3 text-sm"
                    value={String(form[f.key] ?? "")}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  >
                    <option value="">— pilih unit kerja —</option>
                    {(ukers.data ?? []).map((u) => (
                      <option key={String(u["id"])} value={String(u["id"])}>
                        {String(u["kode_uker"])} — {String(u["nama_uker"])}
                      </option>
                    ))}
                  </select>
                ) : f.type === "ref" ? (
                  <select
                    id={f.key}
                    className="h-10 rounded-xl border border-input bg-popover px-3 text-sm"
                    value={String(form[f.key] ?? "")}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  >
                    <option value="">— pilih —</option>
                    {(refs.data?.[f.key] ?? []).map((o) => (
                      <option key={String(o["id"])} value={String(o["id"])}>
                        {String(o[f.refLabelColumn ?? "nama"] ?? "")}
                      </option>
                    ))}
                  </select>
                ) : (

                  <Input
                    id={f.key}
                    type={
                      f.type === "number"
                        ? "number"
                        : f.type === "date"
                          ? "date"
                          : f.type === "datetime"
                            ? "datetime-local"
                            : "text"
                    }
                    value={
                      f.type === "datetime" && form[f.key]
                        ? new Date(String(form[f.key])).toISOString().slice(0, 16)
                        : String(form[f.key] ?? "")
                    }
                    inputMode={f.type === "ip" || f.type === "digits" ? "numeric" : undefined}
                    maxLength={
                      f.type === "digits" && f.digitsLength ? f.digitsLength : undefined
                    }
                    placeholder={
                      f.placeholder ??
                      (f.type === "ip"
                        ? "013.156.017.001"
                        : f.type === "latlng"
                          ? "-5.358000, 104.975000"
                          : undefined)
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      const next =
                        f.type === "ip"
                          ? formatIp(raw)
                          : f.type === "digits"
                            ? formatDigits(raw).slice(0, f.digitsLength ?? 32)
                            : raw;

                      setForm({ ...form, [f.key]: next });
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button disabled={save.isPending} onClick={() => save.mutate(form)}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}