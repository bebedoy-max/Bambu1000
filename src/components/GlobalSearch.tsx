import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useRoles } from "@/lib/roles";
import { searchModules, type SearchModule } from "@/lib/search-registry";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const db = supabase as unknown as SupabaseClient;

type Hit = {
  id: string;
  module: SearchModule;
  title: string;
  subtitle: string;
};

function useDebounced(value: string, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function GlobalSearch({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const { isItAdmin, isEventAdmin, isSuperadmin } = useRoles();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
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
      const settled = await Promise.all(
        allowed.map(async (m) => {
          const filter = m.columns.map((c) => `${c}.ilike.%${term}%`).join(",");
          const { data, error } = await db.from(m.table).select("*").or(filter).limit(5);
          if (error) return [] as Hit[];
          return (data ?? []).map((row: Record<string, unknown>) => ({
            id: String(row["id"]),
            module: m,
            title: m.title(row) || "(tanpa judul)",
            subtitle: m.subtitle?.(row) ?? "",
          }));
        }),
      );
      return settled.flat();
    },
  });

  const hits = results.data ?? [];

  useEffect(() => setActive(0), [term]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(hit: Hit) {
    setOpen(false);
    setQ("");
    void navigate({ to: hit.module.route, search: { q: term, focus: hit.id } });
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
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, hits.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && hits[active]) {
            e.preventDefault();
            go(hits[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
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
        <div className="glass-card absolute right-0 z-50 mt-2 max-h-96 w-full min-w-[20rem] overflow-y-auto p-2">
          {results.isFetching ? (
            <p className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Mencari…
            </p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              Tidak ada hasil untuk “{term}”.
            </p>
          ) : (
            hits.map((h, i) => (
              <button
                key={`${h.module.route}-${h.id}`}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(h)}
                className={`flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left transition-colors ${
                  i === active ? "bg-secondary" : "hover:bg-secondary/60"
                }`}
              >
                <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
                  {h.module.label}
                </span>
                <span className="truncate text-sm font-medium">{h.title}</span>
                {h.subtitle ? (
                  <span className="truncate text-xs text-muted-foreground">{h.subtitle}</span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
