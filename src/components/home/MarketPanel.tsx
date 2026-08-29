import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp } from "lucide-react";
import { getMarketQuotes } from "@/lib/home-feeds.functions";

/** Panel info pasar: saham BBRI, kurs dolar, dan harga emas. */
export function MarketPanel() {
  const q = useQuery({
    queryKey: ["market-quotes"],
    queryFn: () => getMarketQuotes(),
    staleTime: 300_000,
  });
  const rows = q.data ?? [];

  return (
    <div className="glass-card flex h-full flex-col gap-3 p-5">
      <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Info Pasar</p>
      {q.isLoading ? <p className="text-sm text-muted-foreground">Memuat data pasar…</p> : null}
      {!q.isLoading && !rows.length ? (
        <p className="text-sm text-muted-foreground">Data pasar belum tersedia.</p>
      ) : null}
      {rows.map((r) => {
        const up = (r.change ?? 0) >= 0;
        const Icon = up ? TrendingUp : TrendingDown;
        return (
          <div key={r.key} className="rounded-xl border border-border/60 bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">{r.label}</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums">{r.value}</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">{r.unit}</span>
              {r.change !== null ? (
                <span className={`flex items-center gap-1 ${up ? "text-accent" : "text-destructive"}`}>
                  <Icon className="size-3.5" />
                  {up ? "+" : ""}
                  {r.change.toFixed(2)}%
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
      <p className="mt-auto text-[10px] text-muted-foreground">
        Sumber data pasar diperbarui berkala; bukan acuan transaksi.
      </p>
    </div>
  );
}
