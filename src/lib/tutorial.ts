import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BookOpen, CalendarCheck2, Home, Trophy, Vote, Gift, type LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { menuItems } from "@/lib/access";

const db = supabase as unknown as SupabaseClient;

export type TutorialRow = {
  id: string;
  topic_key: string;
  judul: string;
  ringkasan: string | null;
  konten: string | null;
  urutan: number;
  updated_at?: string | null;
};

export type TutorialTopic = {
  key: string;
  label: string;
  icon: LucideIcon;
  group: string;
};

/** Topik di luar menu sidebar (halaman publik & sub-aplikasi SuperIT Apps). */
const extraTopics: TutorialTopic[] = [
  { key: "umum", label: "Pengenalan Aplikasi", icon: BookOpen, group: "Umum" },
  { key: "dashboard-publik", label: "Dashboard Publik", icon: Home, group: "Umum" },
  { key: "tools-absensi", label: "SuperIT · Absensi", icon: CalendarCheck2, group: "SuperIT Apps" },
  { key: "tools-vote", label: "SuperIT · Voting", icon: Vote, group: "SuperIT Apps" },
  { key: "tools-nominasi", label: "SuperIT · Nominasi", icon: Trophy, group: "SuperIT Apps" },
  { key: "tools-undian", label: "SuperIT · Undian", icon: Gift, group: "SuperIT Apps" },
];

/**
 * Daftar topik panduan. Otomatis mengikuti daftar menu aplikasi, sehingga menu
 * atau fitur baru langsung muncul di halaman Tutorial tanpa perubahan kode.
 */
export function tutorialTopics(): TutorialTopic[] {
  const fromMenus: TutorialTopic[] = menuItems.map((m) => ({
    key: m.key,
    label: m.label,
    icon: m.icon,
    group: "Menu Aplikasi",
  }));
  return [...extraTopics.filter((t) => t.group === "Umum"), ...fromMenus, ...extraTopics.filter((t) => t.group !== "Umum")];
}

/** Kelompokkan topik berdasarkan grup, urutan grup mengikuti kemunculan. */
export function groupTopics(topics: TutorialTopic[]) {
  const map = new Map<string, TutorialTopic[]>();
  for (const t of topics) {
    const arr = map.get(t.group) ?? [];
    arr.push(t);
    map.set(t.group, arr);
  }
  return [...map.entries()].map(([group, items]) => ({ group, items }));
}

export function useTutorials() {
  return useQuery({
    queryKey: ["tutorials"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await db
        .from("tutorials")
        .select("id,topic_key,judul,ringkasan,konten,urutan,updated_at")
        .order("urutan", { ascending: true });
      if (error) return [] as TutorialRow[];
      return (data ?? []) as TutorialRow[];
    },
  });
}

export function useSaveTutorial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      topic_key: string;
      judul: string;
      ringkasan: string;
      konten: string;
    }) => {
      const { error } = await db
        .from("tutorials")
        .upsert(
          {
            topic_key: input.topic_key,
            judul: input.judul,
            ringkasan: input.ringkasan || null,
            konten: input.konten || null,
          },
          { onConflict: "topic_key" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tutorials"] }),
  });
}

export function useDeleteTutorial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (topicKey: string) => {
      const { error } = await db.from("tutorials").delete().eq("topic_key", topicKey);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tutorials"] }),
  });
}

export type ContentBlock =
  | { type: "heading"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "steps"; items: string[] }
  | { type: "paragraph"; text: string };

/** Parser ringan: '## judul', '- poin', '1. langkah', sisanya paragraf. */
export function parseContent(raw: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let bullets: string[] = [];
  let steps: string[] = [];
  const flush = () => {
    if (bullets.length) blocks.push({ type: "bullets", items: bullets });
    if (steps.length) blocks.push({ type: "steps", items: steps });
    bullets = [];
    steps = [];
  };
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) {
      flush();
      continue;
    }
    if (/^#{1,6}\s+/.test(t)) {
      flush();
      blocks.push({ type: "heading", text: t.replace(/^#{1,6}\s+/, "") });
    } else if (/^[-*•]\s+/.test(t)) {
      if (steps.length) flush();
      bullets.push(t.replace(/^[-*•]\s+/, ""));
    } else if (/^\d+[.)]\s+/.test(t)) {
      if (bullets.length) flush();
      steps.push(t.replace(/^\d+[.)]\s+/, ""));
    } else {
      flush();
      blocks.push({ type: "paragraph", text: t });
    }
  }
  flush();
  return blocks;
}
