import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Filter, Loader2, Search, X } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useRoles } from "@/lib/roles";
import {
  guessTitle,
  searchModules,
  
  type SearchModule,
} from "@/lib/search-registry";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const db = supabase as unknown as SupabaseClient;

type Row = Record<string, unknown>;

type Hit = {
  id: string;
  title: string;
  subtitle: string;
};

type Group = {
  module: SearchModule;
  hits: Hit[];
  total: number;
};

function useDebounced(value: string, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Cache sederhana per tabel agar pencarian tetap cepat saat mengetik. */
const TTL = 60_000;
const tableCache = new Map<string, { at: number; rows: Row[] }>();

async function loadTable(table: string, limit = 1000): Promise<Row[]> {
  const cached = tableCache.get(table);
  if (cached && Date.now() - cached.at < TTL) return cached.rows;
  const { data, error } = await db.from(table).select("*").limit(limit);
  const rows = error ? [] : ((data ?? []) as Row[]);
  tableCache.set(table, { at: Date.now(), rows });
  return rows;
}

/** Semua nilai baris jadi satu teks (angka, boolean, tanggal, teks). */
function rowText(row: Row): string {
  const out: string[] = [];
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) continue;
    if (k === "id" || k.endsWith("_id") || k.endsWith("_url")) continue;
    if (typeof v === "object") {
      out.push(JSON.stringify(v));
    } else {
      out.push(String(v));
    }
  }
  return out.join(" ").toLowerCase();
}

/** Skor relevansi: judul persis > awalan judul > isi baris. */
function score(title: string, hay: string, terms: string[]): number {
  const t = title.toLowerCase();
  let n = 0;
  for (const term of terms) {
    if (t === term) n += 100;
    else if (t.startsWith(term)) n += 50;
    else if (t.includes(term)) n += 25;
    else if (hay.includes(term)) n += 5;
  }
  return n;
}

async function searchModule(m: SearchModule, terms: string[]): Promise<Group> {
  const rows = await loadTable(m.table);
  if (rows.length === 0) return { module: m, hits: [], total: 0 };

  // Teks label dari tabel relasi (mis. jabatan, unit kerja) per foreign key.
  const refMaps = new Map<string, Map<string, string>>();
  for (const ref of m.refs ?? []) {
    const refRows = await loadTable(ref.table);
    const byId = new Map<string, string>();
    for (const r of refRows) {
      const label = ref.labelColumns
        .map((c) => (r[c] === null || r[c] === undefined ? "" : String(r[c])))
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      byId.set(String(r["id"]), label);
    }
    refMaps.set(ref.column, byId);
  }

  const matched = rows
    .map((row) => {
      let hay = rowText(row);
      for (const ref of m.refs ?? []) {
        const label = refMaps.get(ref.column)?.get(String(row[ref.column] ?? ""));
        if (label) hay += ` ${label}`;
      }

      const title = (m.title ? m.title(row) : guessTitle(row)) || guessTitle(row);
      const ok = terms.every((t) => hay.includes(t));
      return ok ? { row, title, rank: score(title, hay, terms) } : null;
    })
    .filter((x): x is { row: Row; title: string; rank: number } => x !== null)
    .sort((a, b) => b.rank - a.rank);

  return {
    module: m,
    total: matched.length,
    hits: matched.slice(0, 5).map(({ row, title }) => ({
      id: String(row["id"]),
      title,
      subtitle: m.subtitle?.(row) ?? "",
    })),
  };
}


export function GlobalSearch({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const { isItAdmin, isEventAdmin, isSuperadmin } = useRoles();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const term = useDebounced(q.trim());

  const allowed = useMemo(
    () =>
      searchModules.filter((m) =>
        m.need === "it"
          ? isItAdmin
          : m.need === "event"
            ? isEventAdmin
            : m.need === "super"
              ? isSuperadmin
              : true,
      ),
    [isItAdmin, isEventAdmin, isSuperadmin],
  );

  const results = useQuery({
    queryKey: ["global-search", term, allowed.map((m) => m.route).join(",")],
    enabled: term.length >= 2,
    queryFn: async () => {
      const terms = term.toLowerCase().split(/\s+/).filter(Boolean);
      const groups = await Promise.all(allowed.map((m) => searchModule(m, terms)));
      return groups.filter((g) => g.hits.length > 0).sort((a, b) => b.total - a.total);
    },
  });

  const groups = results.data ?? [];
  const totalHits = groups.reduce((n, g) => n + g.total, 0);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function goToRow(g: Group, hit: Hit) {
    setOpen(false);
    setQ("");
    void navigate({ to: g.module.route, search: { q: term, focus: hit.id } });
  }

  function goToFilter(g: Group) {
    setOpen(false);
    setQ("");
    void navigate({ to: g.module.route, search: { q: term } });
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && groups[0]) goToFilter(groups[0]);
        }}
        placeholder="Cari data di seluruh aplikasi…"
        aria-label="Pencarian global"
        className="w-full pl-9"
      />
      {q ? (
        <Button
          size="icon"
          variant="ghost"
          aria-label="Bersihkan pencarian"
          className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
          onClick={() => {
            setQ("");
            setOpen(false);
          }}
        >
          <X className="size-4" />
        </Button>
      ) : null}

      {open && term.length >= 2 ? (
        <div className="glass-card absolute right-0 z-50 mt-2 max-h-[28rem] w-full min-w-[22rem] overflow-y-auto p-2">
          {results.isFetching ? (
            <p className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Mencari…
            </p>
          ) : groups.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              Tidak ada hasil untuk “{term}”.
            </p>
          ) : (
            <>
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {totalHits} hasil di {groups.length} menu
              </p>
              {groups.map((g) => (
                <div key={g.module.route} className="mb-1">
                  <div className="flex items-center justify-between gap-2 px-3 py-1">
                    <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
                      {g.module.label} · {g.total}
                    </span>
                    <button
                      type="button"
                      onClick={() => goToFilter(g)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-primary hover:bg-secondary"
                    >
                      <Filter className="size-3" />
                      Filter {g.total} data di menu ini
                    </button>
                  </div>
                  {g.hits.map((h) => (
                    <button
                      key={`${g.module.route}-${h.id}`}
                      type="button"
                      onClick={() => goToRow(g, h)}
                      className="flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-secondary/60"
                    >
                      <span className="truncate text-sm font-medium">{h.title}</span>
                      {h.subtitle ? (
                        <span className="truncate text-xs text-muted-foreground">{h.subtitle}</span>
                      ) : null}
                    </button>
                  ))}
                  {g.total > g.hits.length ? (
                    <button
                      type="button"
                      onClick={() => goToFilter(g)}
                      className="w-full rounded-xl px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-secondary/60"
                    >
                      +{g.total - g.hits.length} data lain di {g.module.label}
                    </button>
                  ) : null}
                </div>
              ))}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
