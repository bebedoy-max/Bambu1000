import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

export type InfographicStat = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  detailKey: string;
  /** 0..100 untuk bar infografis. */
  ratio: number;
  /** Deskripsi singkat pada kartu. */
  description?: string;
};

/** Konektor dekoratif berbentuk aliran S di belakang pill (SVG murni). */
function SRibbon() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-0 size-full"
      preserveAspectRatio="none"
      viewBox="0 0 100 1000"
      fill="none"
    >
      <defs>
        <linearGradient id="ribbon-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.55" />
          <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.15" />
        </linearGradient>
        <filter id="ribbon-blur" x="-50%" y="-10%" width="200%" height="120%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <path
        d="M50 0 C 90 130, 10 260, 50 390 S 10 650, 50 780 S 20 930, 50 1000"
        stroke="url(#ribbon-grad)"
        strokeWidth="26"
        strokeLinecap="round"
        filter="url(#ribbon-blur)"
        opacity="0.4"
      />
      <path
        d="M50 0 C 90 130, 10 260, 50 390 S 10 650, 50 780 S 20 930, 50 1000"
        stroke="url(#ribbon-grad)"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

/** Infografis "connected pill badges" zig-zag — setiap pill dapat diklik. */
export function InfographicStats({ items }: { items: InfographicStat[] }) {
  return (
    <section className="glass-card relative isolate h-fit overflow-hidden p-3.5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-12 -z-10 size-40 rounded-full opacity-30 blur-3xl"
        style={{ backgroundImage: "var(--gradient-stat)" }}
      />

      <header className="relative z-10">
        <h2 className="text-lg leading-none font-black tracking-tight">
          INFO<span className="gradient-text">GRAFIS</span>
        </h2>
        <div className="mt-1.5 h-px w-16 bg-gradient-to-r from-primary to-transparent" />
        <p className="mt-1.5 text-[8px] leading-snug tracking-[0.14em] text-muted-foreground uppercase">
          BO Pringsewu
        </p>
      </header>

      <div className="relative mt-3.5">
        <SRibbon />
        <ol className="relative z-10 flex flex-col gap-2 sm:gap-2.5">
          {items.map((s, i) => {
            const right = i % 2 === 1;
            return (
              <li
                key={s.label}
                className={`pl-5 sm:w-[74%] sm:max-w-[74%] ${
                  right ? "sm:mr-0 sm:ml-auto sm:pr-5 sm:pl-0" : "sm:mr-auto sm:ml-0"
                }`}
              >
                <Link
                  to="/detail/$key"
                  params={{ key: s.detailKey }}
                  search={{ from: "/" }}
                  aria-label={`Lihat detail ${s.label}`}
                  className={`group relative flex items-center gap-2 rounded-full border border-primary/25 bg-card/70 py-1.5 pl-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--primary)_65%,transparent)] active:translate-y-0 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                    right ? "pr-11" : "pr-3"
                  }`}
                >
                  <span
                    className={`absolute top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-[10px] font-black text-primary-foreground tabular-nums transition-transform duration-300 group-hover:scale-110 ${
                      right ? "-left-4 sm:-right-4 sm:left-auto" : "-left-4"
                    }`}
                    style={{
                      backgroundImage: "var(--gradient-stat)",
                      boxShadow: "var(--shadow-glow)",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/10">
                    <s.icon className="size-3 text-accent" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[7px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                      {s.label}
                    </span>
                    <span className="block text-lg leading-tight font-black tabular-nums">
                      {s.value}
                    </span>
                    <span className="mt-0.5 block h-0.5 w-full overflow-hidden rounded-full bg-secondary/70">
                      <span
                        className="block h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.max(6, Math.min(100, s.ratio))}%`,
                          backgroundImage: "var(--gradient-stat)",
                        }}
                      />
                    </span>
                  </span>

                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
