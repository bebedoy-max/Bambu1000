import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Lock, PauseCircle, Vote as VoteIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateID } from "@/lib/absensi-ui";
import { voteInitials, type VoteCategory, type VoteNominee } from "@/lib/vote-ui";
import { checkVoter, getVoteEvent, submitVote } from "@/lib/vote.functions";

export const Route = createFileRoute("/vote/$slug")({
  head: () => ({
    meta: [
      { title: "Voting Pekerja — BRI BO Pringsewu" },
      {
        name: "description",
        content:
          "Halaman voting pekerja BRI Branch Office Pringsewu. Masukkan Personal Number untuk memberikan suara.",
      },
      { property: "og:title", content: "Voting Pekerja — BRI BO Pringsewu" },
      {
        property: "og:description",
        content: "Berikan suaramu untuk nominasi pekerja terbaik BRI BO Pringsewu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

type VoterState = { pn: string; nama: string | null; votes: { category: string; nominee: string }[] };

function Page() {
  const { slug } = Route.useParams();
  const [pn, setPn] = useState("");
  const [voter, setVoter] = useState<VoterState | null>(null);
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["vote-public", slug],
    queryFn: () => getVoteEvent({ data: { slug } }),
    refetchInterval: 30_000,
  });

  const settings = q.data?.settings ?? null;
  const nominees = (q.data?.nominees ?? []) as VoteNominee[];
  const categories = (settings?.categories ?? []) as VoteCategory[];
  const accent = settings?.accent ?? "#a855f7";

  const votedMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of voter?.votes ?? []) m.set(v.category, v.nominee);
    return m;
  }, [voter]);

  const closed = settings?.isClosed === true;
  const hold = settings?.isHold === true;

  async function masuk() {
    if (closed) return;
    setBusy(true);
    try {
      const res = await checkVoter({ data: { slug, pn: pn.trim() } });
      if (!res.valid) {
        toast.error(
          res.reason === "format"
            ? "Personal Number harus 6-10 digit angka."
            : res.reason === "not_found"
              ? "Personal Number tidak terdaftar pada Data Pekerja."
              : "Vote event tidak ditemukan.",
        );
      } else {
        setVoter({ pn: pn.trim(), nama: res.nama, votes: res.votes });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memeriksa Personal Number");
    }
    setBusy(false);
  }

  async function pilih(category: string, nominee: string) {
    if (!voter || votedMap.has(category)) return;
    setBusy(true);
    try {
      const res = await submitVote({ data: { slug, pn: voter.pn, category, nominee } });
      if (res.ok) {
        setVoter({ ...voter, votes: [...voter.votes, { category, nominee }] });
        toast.success(`Suara untuk ${category} tersimpan`);
        void q.refetch();
      } else {
        toast.error(
          res.reason === "closed"
            ? "Voting telah ditutup."
            : res.reason === "hold"
              ? "Voting sedang dihentikan sementara."
              : res.reason === "already_voted"
                ? "Kamu sudah memilih pada kategori ini."
                : "Suara tidak dapat disimpan.",
        );
        void q.refetch();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengirim suara");
    }
    setBusy(false);
  }

  if (q.isLoading) {
    return <Shell accent={accent}><p className="text-center text-sm opacity-70">Memuat...</p></Shell>;
  }
  if (!settings) {
    return (
      <Shell accent={accent}>
        <p className="text-center text-sm opacity-80">Vote event tidak ditemukan atau sudah dihapus.</p>
      </Shell>
    );
  }

  const selesai = voter && categories.every((c) => votedMap.has(c.name));

  return (
    <Shell accent={accent}>
      <header className="space-y-2 text-center">
        {settings.logo ? (
          <img src={settings.logo} alt={settings.title} className="mx-auto max-h-24 object-contain" />
        ) : null}
        <p className="text-xs uppercase tracking-[0.3em] opacity-70">{settings.eyebrow}</p>
        <h1 className="text-2xl font-bold sm:text-3xl">{settings.title}</h1>
        <p className="text-sm opacity-80">
          {settings.subtitle} · {formatDateID(settings.eventDate)}
        </p>
      </header>

      {closed ? (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-6 text-center">
          <Lock className="mx-auto mb-2 size-8" />
          <h2 className="text-lg font-semibold">Voting telah ditutup</h2>
          <p className="text-sm opacity-80">
            Periode voting sudah selesai. Terima kasih atas partisipasinya.
          </p>
        </div>
      ) : null}

      {!closed && hold ? (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-center text-sm">
          <PauseCircle className="mx-auto mb-1 size-6" />
          Voting dihentikan sementara oleh panitia. Silakan coba beberapa saat lagi.
        </div>
      ) : null}

      {!voter ? (
        <div className="mx-auto w-full max-w-sm space-y-3 rounded-2xl border border-white/15 bg-white/5 p-5">
          <div>
            <Label className="text-sm">Personal Number</Label>
            <Input
              inputMode="numeric"
              placeholder="contoh: 00222254"
              value={pn}
              disabled={closed}
              onChange={(e) => setPn(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="bg-white/10"
            />
          </div>
          <Button
            className="w-full"
            style={{ background: accent }}
            disabled={busy || closed || hold || pn.trim().length < 6}
            onClick={() => void masuk()}
          >
            <VoteIcon className="size-4" />
            {closed
              ? "Voting Telah Ditutup"
              : hold
                ? "Voting Dihentikan Sementara"
                : "Masuk & Mulai Voting"}
          </Button>
          <p className="text-center text-xs opacity-70">
            Personal Number diverifikasi dengan Data Pekerja BRI BO Pringsewu.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm">
            <span>
              Halo, <b>{voter.nama ?? voter.pn}</b> · {votedMap.size}/{categories.length} kategori
            </span>
            <Button size="sm" variant="ghost" onClick={() => setVoter(null)}>
              Keluar
            </Button>
          </div>

          {selesai ? (
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-5 text-center">
              <CheckCircle2 className="mx-auto mb-2 size-8" />
              <h2 className="font-semibold">Terima kasih, semua suaramu sudah tersimpan.</h2>
            </div>
          ) : null}

          {categories.map((c) => {
            const list = nominees.filter((n) => n.category === c.name);
            const chosen = votedMap.get(c.name);
            return (
              <section key={c.name} className="space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold" style={{ color: c.color }}>
                  <span>{c.icon}</span> {c.name}
                  {chosen ? <span className="text-xs opacity-70">· sudah memilih</span> : null}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((n) => {
                    const active = chosen === n.nama;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        disabled={busy || !!chosen || hold || closed}
                        onClick={() => void pilih(c.name, n.nama)}
                        className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition disabled:opacity-60 ${
                          active
                            ? "border-white/60 bg-white/15"
                            : "border-white/15 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        {n.foto ? (
                          <img src={n.foto} alt={n.nama} className="size-12 rounded-full object-cover" />
                        ) : (
                          <span
                            className="grid size-12 shrink-0 place-items-center rounded-full text-sm font-bold"
                            style={{ background: c.color }}
                          >
                            {voteInitials(n.nama)}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{n.nama}</span>
                          <span className="block truncate text-xs opacity-70">
                            {[n.jabatan, n.uker].filter(Boolean).join(" · ") || "-"}
                          </span>
                        </span>
                        {active ? <CheckCircle2 className="ml-auto size-5" /> : null}
                      </button>
                    );
                  })}
                  {list.length === 0 ? (
                    <p className="text-sm opacity-70">Belum ada nominasi pada kategori ini.</p>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

function Shell({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <main
      className="min-h-screen px-4 py-10 text-white"
      style={{
        background: `radial-gradient(900px 500px at 50% -10%, ${accent}55, transparent), #0b1020`,
      }}
    >
      <div className="mx-auto w-full max-w-4xl space-y-6">{children}</div>
    </main>
  );
}
