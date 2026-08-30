import { useContext, useMemo, useState } from "react";
import { BookOpen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageEditContext } from "@/components/AdminLayout";
import { useConfirm } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  groupTopics,
  parseContent,
  tutorialTopics,
  useDeleteTutorial,
  useSaveTutorial,
  useTutorials,
  type TutorialTopic,
} from "@/lib/tutorial";

/** Render isi panduan (heading, poin, langkah, paragraf). */
function ContentView({ raw }: { raw: string }) {
  const blocks = useMemo(() => parseContent(raw), [raw]);
  return (
    <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
      {blocks.map((b, i) => {
        if (b.type === "heading")
          return (
            <h3 key={i} className="mt-6 text-base font-semibold text-foreground first:mt-0">
              {b.text}
            </h3>
          );
        if (b.type === "bullets")
          return (
            <ul key={i} className="ml-5 list-disc space-y-1">
              {b.items.map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </ul>
          );
        if (b.type === "steps")
          return (
            <ol key={i} className="space-y-2">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                    {j + 1}
                  </span>
                  <span>{it}</span>
                </li>
              ))}
            </ol>
          );
        return (
          <p key={i} className="text-muted-foreground">
            {b.text}
          </p>
        );
      })}
    </div>
  );
}

export function TutorialGuide() {
  const canEdit = useContext(PageEditContext);
  const confirm = useConfirm();
  const { data: rows = [], isLoading } = useTutorials();
  const save = useSaveTutorial();
  const del = useDeleteTutorial();

  const topics = useMemo(() => tutorialTopics(), []);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string>(topics[0]?.key ?? "umum");
  const [editing, setEditing] = useState<TutorialTopic | null>(null);
  const [form, setForm] = useState({ judul: "", ringkasan: "", konten: "" });

  const byKey = useMemo(() => new Map(rows.map((r) => [r.topic_key, r])), [rows]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return topics;
    return topics.filter((t) => {
      const row = byKey.get(t.key);
      return (
        t.label.toLowerCase().includes(s) ||
        (row?.judul ?? "").toLowerCase().includes(s) ||
        (row?.ringkasan ?? "").toLowerCase().includes(s) ||
        (row?.konten ?? "").toLowerCase().includes(s)
      );
    });
  }, [q, topics, byKey]);

  const groups = useMemo(() => groupTopics(filtered), [filtered]);
  const current = topics.find((t) => t.key === active) ?? topics[0];
  const currentRow = current ? byKey.get(current.key) : undefined;

  function openEditor(topic: TutorialTopic) {
    const row = byKey.get(topic.key);
    setForm({
      judul: row?.judul ?? topic.label,
      ringkasan: row?.ringkasan ?? "",
      konten: row?.konten ?? "",
    });
    setEditing(topic);
  }

  async function submit() {
    if (!editing) return;
    if (!form.judul.trim()) {
      toast.error("Judul wajib diisi");
      return;
    }
    try {
      await save.mutateAsync({ topic_key: editing.key, ...form });
      toast.success("Panduan disimpan");
      setEditing(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(topicKey: string) {
    const ok = await confirm({
      title: "Hapus panduan?",
      description: "Isi panduan untuk topik ini akan dihapus.",
    });
    if (!ok) return;
    try {
      await del.mutateAsync(topicKey);
      toast.success("Panduan dihapus");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const filled = rows.filter((r) => (r.konten ?? "").trim()).length;

  return (
    <div className="space-y-4">
      <div className="glass-card flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold">Tutorial &amp; Panduan</h1>
          <p className="text-sm text-muted-foreground">
            Panduan tata cara penggunaan seluruh fitur aplikasi. Daftar topik mengikuti menu yang
            ada, jadi menu/fitur baru otomatis muncul di sini.
          </p>
        </div>
        <Badge variant="secondary">
          {filled}/{topics.length} topik terisi
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="glass-card max-h-[70vh] space-y-3 overflow-y-auto p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari panduan…"
              className="pl-9"
            />
          </div>
          {groups.map((g) => (
            <div key={g.group} className="space-y-1">
              <p className="px-2 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {g.group}
              </p>
              {g.items.map((t) => {
                const has = (byKey.get(t.key)?.konten ?? "").trim().length > 0;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActive(t.key)}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                      active === t.key
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <t.icon className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{t.label}</span>
                    {!has ? <span className="size-1.5 rounded-full bg-muted-foreground/40" /> : null}
                  </button>
                );
              })}
            </div>
          ))}
          {!groups.length ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Topik tidak ditemukan.
            </p>
          ) : null}
        </aside>

        <section className="glass-card min-h-[50vh] p-5">
          {!current ? null : (
            <>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold">{currentRow?.judul ?? current.label}</h2>
                  {currentRow?.ringkasan ? (
                    <p className="mt-1 text-sm text-muted-foreground">{currentRow.ringkasan}</p>
                  ) : null}
                </div>
                {canEdit ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openEditor(current)}>
                      {currentRow ? <Pencil className="size-4" /> : <Plus className="size-4" />}
                      {currentRow ? "Edit" : "Tulis panduan"}
                    </Button>
                    {currentRow ? (
                      <Button size="sm" variant="ghost" onClick={() => remove(current.key)}>
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="mt-5">
                {isLoading ? null : (currentRow?.konten ?? "").trim() ? (
                  <ContentView raw={currentRow!.konten!} />
                ) : (
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <BookOpen className="size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Panduan untuk topik ini belum ditulis.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Panduan · {editing?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Judul</Label>
              <Input
                value={form.judul}
                onChange={(e) => setForm((s) => ({ ...s, judul: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Ringkasan</Label>
              <Input
                value={form.ringkasan}
                onChange={(e) => setForm((s) => ({ ...s, ringkasan: e.target.value }))}
                placeholder="Satu kalimat penjelasan singkat"
              />
            </div>
            <div className="space-y-1">
              <Label>Isi panduan</Label>
              <Textarea
                rows={14}
                value={form.konten}
                onChange={(e) => setForm((s) => ({ ...s, konten: e.target.value }))}
                placeholder={"## Judul bagian\n- poin penting\n1. langkah pertama\n2. langkah kedua"}
              />
              <p className="text-xs text-muted-foreground">
                Format: <code>## Judul</code> untuk sub-judul, <code>- </code> untuk poin,{" "}
                <code>1. </code> untuk langkah berurutan.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button onClick={submit} disabled={save.isPending}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
