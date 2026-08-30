import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import { loadWorkerSlides } from "@/lib/worker-slider";

/** Kolom slide profil pekerja (di bawah infografis). */
export function WorkerSlider() {
  const q = useQuery({
    queryKey: ["worker-slides"],
    queryFn: loadWorkerSlides,
    staleTime: 60_000,
  });
  const slides = q.data ?? [];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) return null;
  const s = slides[idx % slides.length]!;

  return (
    <section className="glass-card relative overflow-hidden p-3.5">
      <h2 className="text-center text-base leading-tight font-extrabold tracking-tight">
        {s.nama}
      </h2>

      <div
        className="mt-3 overflow-hidden rounded-xl border border-border/60 bg-muted"
        style={
          s.glow
            ? ({
                "--glow": s.glow,
                borderColor: s.glow,
                animation: "worker-glow-pulse 2.4s ease-in-out infinite",
              } as React.CSSProperties)
            : undefined
        }
      >
        {s.photo ? (
          <img
            src={s.photo}
            alt={`Foto ${s.nama}`}
            loading="lazy"
            className="block aspect-[3/4] w-full object-cover object-top"
          />
        ) : (
          <div className="grid aspect-[3/4] w-full place-items-center text-muted-foreground">
            <UserRound className="size-10" />
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1 text-sm">
        <p className="font-medium">{s.jabatan || "—"}</p>
        <p className="text-muted-foreground">{s.uker || "—"}</p>
      </div>

      {slides.length > 1 ? (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            aria-label="Pekerja sebelumnya"
            onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)}
            className="grid size-7 place-items-center rounded-full border border-border/70 bg-background/60 transition-colors hover:border-primary/60"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Pekerja berikutnya"
            onClick={() => setIdx((i) => (i + 1) % slides.length)}
            className="grid size-7 place-items-center rounded-full border border-border/70 bg-background/60 transition-colors hover:border-primary/60"
          >
            <ChevronRight className="size-3.5" />
          </button>
          <div className="ml-1 flex flex-wrap gap-1.5">
            {slides.map((w, i) => (
              <button
                key={w.id}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-5 bg-primary" : "w-2 bg-border"
                }`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
