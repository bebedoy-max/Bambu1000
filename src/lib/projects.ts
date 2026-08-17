import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const db = supabase as unknown as SupabaseClient;

export type ProjectItem = { id: string; label: string };

export type ParamDef = {
  key: string;
  /** Label satuan, mis. "Unit Kerja". */
  noun: string;
  fetch: () => Promise<ProjectItem[]>;
};

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

async function rows(table: string, cols: string, order: string) {
  const { data, error } = await db.from(table).select(cols).order(order);
  if (error) throw error;
  return (data ?? []) as unknown as Record<string, unknown>[];
}

export const paramDefs: ParamDef[] = [
  {
    key: "uker",
    noun: "Unit Kerja",
    fetch: async () =>
      (await rows("ukers", "id, kode_uker, nama_uker", "kode_uker")).map((r) => ({
        id: `uker:${s(r["id"])}`,
        label: `${s(r["kode_uker"])} — ${s(r["nama_uker"])}`,
      })),
  },
  {
    key: "perangkat",
    noun: "Perangkat",
    fetch: async () =>
      (await rows("it_devices", "id, nama_perangkat, nama_pengguna", "nama_perangkat")).map((r) => ({
        id: `perangkat:${s(r["id"])}`,
        label: [s(r["nama_perangkat"]), s(r["nama_pengguna"])].filter(Boolean).join(" — "),
      })),
  },
  {
    key: "atm",
    noun: "ATM",
    fetch: async () =>
      (await rows("atm_machines", "id, tid, lokasi", "tid")).map((r) => ({
        id: `atm:${s(r["id"])}`,
        label: `ATM ${s(r["tid"])} — ${s(r["lokasi"])}`,
      })),
  },
  {
    key: "crm",
    noun: "CRM",
    fetch: async () =>
      (await rows("crm_machines", "id, tid, lokasi", "tid")).map((r) => ({
        id: `crm:${s(r["id"])}`,
        label: `CRM ${s(r["tid"])} — ${s(r["lokasi"])}`,
      })),
  },
  {
    key: "atm_crm",
    noun: "ATM/CRM",
    fetch: async () => {
      const [a, c] = await Promise.all([
        paramDefs[2]!.fetch(),
        paramDefs[3]!.fetch(),
      ]);
      return [...a, ...c];
    },
  },
  {
    key: "edc_uko",
    noun: "EDC UKO",
    fetch: async () =>
      (await rows("edc_machines", "id, tid, nama_merchant, kategori_edc", "tid"))
        .filter((r) => s(r["kategori_edc"]).toLowerCase() === "uko")
        .map((r) => ({
          id: `edc:${s(r["id"])}`,
          label: `${s(r["tid"])} — ${s(r["nama_merchant"])}`,
        })),
  },
  {
    key: "edc_merchant",
    noun: "EDC Merchant",
    fetch: async () =>
      (await rows("edc_machines", "id, tid, nama_merchant, kategori_edc", "tid"))
        .filter((r) => s(r["kategori_edc"]).toLowerCase() === "merchant")
        .map((r) => ({
          id: `edc:${s(r["id"])}`,
          label: `${s(r["tid"])} — ${s(r["nama_merchant"])}`,
        })),
  },
];

export function findParam(key: string | null | undefined) {
  return paramDefs.find((p) => p.key === key) ?? null;
}

/** Label opsi parameter: "100% 24 Unit Kerja". */
export function paramLabel(def: ParamDef, total: number) {
  return `100% ${total} ${def.noun}`;
}

/** Ambil jumlah item untuk seluruh parameter (dipakai untuk label dropdown). */
export async function fetchParamTotals(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const d of paramDefs) {
    try {
      out[d.key] = (await d.fetch()).length;
    } catch {
      out[d.key] = 0;
    }
  }
  return out;
}
