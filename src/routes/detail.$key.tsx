import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowLeft, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { useDetailAccess } from "@/lib/access";
import { findPublicDetail } from "@/lib/public-detail";
import { MapsLink } from "@/components/MapsLink";

const db = supabase as unknown as SupabaseClient;

export const Route = createFileRoute("/detail/$key")({
  head: () => ({
    meta: [
      { title: "Detail Data — BRI BO Pringsewu" },
      {
        name: "description",
        content:
          "Rincian data unit kerja, mesin ATM, mesin EDC, pegawai, dan project IT BRI Branch Office Pringsewu.",
      },
      { property: "og:title", content: "Detail Data — BRI BO Pringsewu" },
      {
        property: "og:description",
        content: "Rincian data operasional BRI Branch Office Pringsewu sesuai hak akses.",
      },
    ],
  }),
  component: DetailPage,
});

const fmt = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Ya" : "Tidak";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s).toLocaleDateString("id-ID", { dateStyle: "medium" });
  return s;
};

function DetailPage() {
  const { key } = useParams({ from: "/detail/$key" });
  const cfg = findPublicDetail(key);
  const access = useDetailAccess(cfg?.menuKey ?? key);

  const rows = useQuery({
    queryKey: ["public-detail", key],
    enabled: !!cfg && access.allowed,
    queryFn: async () => {
      const sources = cfg!.sources ?? [{ table: cfg!.table, jenis: "" }];
      const all: Record<string, unknown>[] = [];
      for (const src of sources) {
        const { data, error } = await db.from(src.table).select("*").limit(500);
        if (error) throw error;
        for (const row of (data ?? []) as Record<string, unknown>[]) {
          all.push(src.jenis ? { ...row, jenis_mesin: src.jenis } : row);
        }
      }
      const ob = cfg!.orderBy;
      if (ob) all.sort((a, b) => String(a[ob] ?? "").localeCompare(String(b[ob] ?? "")));
      return all;
    },
  });

  if (!cfg) {
    return (
      <PublicLayout>
        <BackLink />
        <h1 className="mt-4 text-2xl font-bold">Data tidak dikenal</h1>
        <p className="mt-1 text-sm text-muted-foreground">Halaman detail ini tidak tersedia.</p>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <BackLink />
      <h1 className="mt-4 text-2xl font-bold">
        <span className="gradient-text">{cfg.title}</span>
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{cfg.description}</p>

      {access.loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Memeriksa hak akses…</p>
      ) : !access.allowed ? (
        <section className="glass-card mt-6 flex flex-col items-start gap-3 p-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-secondary">
            <Lock className="size-5 text-muted-foreground" />
          </span>
          <h2 className="text-lg font-semibold">Detail terkunci</h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            {access.loggedIn
              ? "Level akses Anda belum diizinkan melihat rincian data ini. Hubungi Super Admin untuk meminta akses."
              : "Rincian data ini hanya dapat dilihat setelah masuk. Pengaturan data yang boleh dilihat pengunjung umum dikelola pada menu Akses Halaman."}
          </p>
          {!access.loggedIn ? (
            <Button asChild className="mt-1">
              <Link to="/auth">Masuk untuk melihat</Link>
            </Button>
          ) : null}
        </section>
      ) : rows.isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Memuat data…</p>
      ) : rows.isError ? (
        <p className="mt-8 text-sm text-muted-foreground">Data tidak dapat dimuat.</p>
      ) : (rows.data ?? []).length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">Belum ada data.</p>
      ) : (
        <DetailTable cfg={cfg} rows={rows.data ?? []} />
      )}
    </PublicLayout>
  );
}

function DetailTable({
  cfg,
  rows,
}: {
  cfg: NonNullable<ReturnType<typeof findPublicDetail>>;
  rows: Record<string, unknown>[];
}) {
  const sample = rows[0] ?? {};
  const cols = cfg.columns.filter((c) => c.key in sample);
  const columns = cols.length
    ? cols
    : Object.keys(sample)
        .filter((k) => !["id", "created_at", "updated_at"].includes(k))
        .slice(0, 5)
        .map((k) => ({ key: k, label: k.replace(/_/g, " "), type: undefined }));

  return (
    <div className="glass-card mt-6 overflow-x-auto p-1">
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={c.key}
                className={`bg-secondary/40 p-3 text-left font-semibold capitalize backdrop-blur-xl ${
                  i === 0 ? "rounded-tl-xl" : ""
                } ${i === columns.length - 1 ? "rounded-tr-xl" : ""}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={String(r["id"] ?? idx)} className="transition-colors hover:bg-secondary/20">
              {columns.map((c) => (
                <td key={c.key} className="border-t border-border/40 p-3 align-top">
                  {c.type === "latlng" ? <MapsLink value={r[c.key]} /> : fmt(r[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="p-3 text-xs text-muted-foreground">{rows.length} data ditampilkan.</p>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> Kembali ke dashboard
    </Link>
  );
}
