import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, LayoutGrid, RotateCcw, Sparkles } from "lucide-react";
import bgPpt from "@/assets/bg-ppt.png";
import brilianWay from "@/assets/brilian-way.png";
import logoBri from "@/assets/logo-bri.png";
import { normalizeBoard, type NominasiBoard, type NominasiNominee } from "@/lib/nominasi-ui";
import { getNominasiEvent } from "@/lib/nominasi.functions";

export const Route = createFileRoute("/_authenticated/admin/tools/nominasi/papan/$id")({
  head: () => ({
    meta: [
      { title: "Papan Nominasi — SuperIT Apps" },
      {
        name: "description",
        content: "Papan pengumuman Best Performance: acak nominasi lalu tampilkan pemenangnya.",
      },
      { property: "og:title", content: "Papan Nominasi — SuperIT Apps" },
      {
        property: "og:description",
        content: "Papan pengumuman Best Performance BRI BO Pringsewu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function NomineeCard({
  nominee,
  revealed,
  shuffling,
  delay,
}: {
  nominee: NominasiNominee;
  revealed: boolean;
  shuffling: boolean;
  delay: number;
}) {
  return (
    <div
      className={`nom-card ${revealed ? "is-revealed" : ""} ${shuffling ? "is-shuffling" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="nom-frame">
        {nominee.photo ? (
          <img src={nominee.photo} alt={nominee.name} className="nom-photo" />
        ) : (
          <div className="nom-photo nom-photo-empty" />
        )}
        <div className="nom-shine" />
      </div>
      <div className="nom-plate">
        <p className="nom-name">{nominee.name}</p>
        <p className="nom-position">{nominee.position}</p>
      </div>
    </div>
  );
}

function Page() {
  const { id } = useParams({ from: "/_authenticated/admin/tools/nominasi/papan/$id" });
  const q = useQuery({
    queryKey: ["nominasi-event", id],
    queryFn: () => getNominasiEvent({ data: { id } }),
  });

  const board: NominasiBoard | null = useMemo(
    () => (q.data ? normalizeBoard(q.data.data) : null),
    [q.data],
  );

  const [activeCat, setActiveCat] = useState(0);
  const [shuffling, setShuffling] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [order, setOrder] = useState<number[]>([]);
  const [finale, setFinale] = useState(false);
  const timers = useRef<number[]>([]);

  const categories = board?.categories ?? [];
  const current = categories[activeCat];

  useEffect(() => {
    setRevealed(false);
    setShuffling(false);
    setOrder((current?.nominees ?? []).map((_, i) => i));
  }, [activeCat, current?.nominees.length]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearInterval(t));
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  function play() {
    if (!current || current.nominees.length === 0 || shuffling) return;
    setRevealed(false);
    setShuffling(true);
    const n = current.nominees.length;
    const spin = window.setInterval(() => {
      setOrder((o) => {
        const next = [...o];
        for (let i = next.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [next[i], next[j]] = [next[j]!, next[i]!];
        }
        return next;
      });
    }, 90);
    timers.current.push(spin);
    const stop = window.setTimeout(() => {
      window.clearInterval(spin);
      setOrder(Array.from({ length: n }, (_, i) => i));
      setShuffling(false);
      setRevealed(true);
    }, 2600);
    timers.current.push(stop);
  }

  if (q.isLoading || !board) {
    return <div className="p-8 text-sm text-muted-foreground">Memuat papan...</div>;
  }

  const leftLogo = board.logo ?? brilianWay;
  const rightLogo = board.logo2 ?? logoBri;

  return (
    <div className="nominasi-board" style={{ backgroundImage: `url(${bgPpt})` }}>
      <div className="nom-toolbar">
        <Link to="/admin/tools/nominasi/$id" params={{ id }} className="nom-btn nom-btn-ghost">
          <ArrowLeft className="size-4" /> Panel
        </Link>
        <button type="button" className="nom-btn" onClick={play} disabled={shuffling}>
          <Sparkles className="size-4" /> {shuffling ? "Mengacak..." : "Umumkan"}
        </button>
        <button
          type="button"
          className="nom-btn nom-btn-ghost"
          onClick={() => {
            setRevealed(false);
            setOrder((current?.nominees ?? []).map((_, i) => i));
          }}
        >
          <RotateCcw className="size-4" /> Ulang
        </button>
        <button type="button" className="nom-btn nom-btn-ghost" onClick={() => setFinale(true)}>
          <LayoutGrid className="size-4" /> Tampilkan Semua
        </button>
      </div>

      <header className="nom-header">
        <img src={leftLogo} alt="Logo kiri" style={{ height: board.logoHeight }} />
        <div className="nom-title-wrap">
          <h1 className="nom-heading">{board.heading}</h1>
          <p className="nom-sub">
            {board.period} · {board.unit}
          </p>
        </div>
        <img src={rightLogo} alt="Logo kanan" style={{ height: board.logo2Height }} />
      </header>

      <nav className="nom-tabs">
        {categories.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className={`nom-tab ${i === activeCat ? "is-active" : ""}`}
            onClick={() => setActiveCat(i)}
          >
            {c.name}
          </button>
        ))}
      </nav>

      <h2 className="nom-cat-title">{current?.name ?? "-"}</h2>

      <div className="nom-grid">
        {(order.length ? order : (current?.nominees ?? []).map((_, i) => i)).map((idx, pos) => {
          const nom = current?.nominees[idx];
          if (!nom) return null;
          return (
            <NomineeCard
              key={nom.id}
              nominee={nom}
              revealed={revealed}
              shuffling={shuffling}
              delay={pos * 140}
            />
          );
        })}
      </div>

      {finale ? (
        <div className="nom-finale" onClick={() => setFinale(false)}>
          <div className="nom-finale-inner" onClick={(e) => e.stopPropagation()}>
            <h2 className="nom-heading">{board.heading}</h2>
            <p className="nom-sub">
              {board.period} · {board.unit}
            </p>
            <div className="nom-finale-grid">
              {categories.map((c) => (
                <div key={c.id} className="nom-finale-cat">
                  <h3>{c.name}</h3>
                  <div className="nom-finale-list">
                    {c.nominees.map((n) => (
                      <div key={n.id} className="nom-finale-item">
                        <div className="nom-finale-photo">
                          {n.photo ? <img src={n.photo} alt={n.name} /> : null}
                        </div>
                        <div>
                          <p className="nom-name">{n.name}</p>
                          <p className="nom-position">{n.position}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="nom-btn" onClick={() => setFinale(false)}>
              Tutup
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
