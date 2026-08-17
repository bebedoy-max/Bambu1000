import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Banknote, Boxes, Building2, CalendarDays, CreditCard, LifeBuoy, Users } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { AdminLayout } from "@/components/AdminLayout";
import { StatCard } from "@/components/StatCard";
import { ProjectSummary } from "@/components/ProjectSummary";
import { useRoles } from "@/lib/roles";

const db = supabase as unknown as SupabaseClient;

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Ringkasan Panel — BRI BO Pringsewu" },
      { name: "description", content: "Ringkasan data internal BRI Branch Office Pringsewu." },
      { property: "og:title", content: "Ringkasan Panel — BRI BO Pringsewu" },
      { property: "og:description", content: "Ringkasan data internal BRI BO Pringsewu." },
    ],
  }),
  component: Page,
});

async function count(table: string) {
  const { count: c } = await db.from(table).select("id", { count: "exact", head: true });
  return c ?? 0;
}

function Page() {
  const { isItAdmin, isEventAdmin } = useRoles();
  const stats = useQuery({
    queryKey: ["admin-stats", isItAdmin, isEventAdmin],
    queryFn: async () => ({
      ukers: await count("ukers"),
      employees: await count("employees"),
      atm: await count("atm_machines"),
      edc: await count("edc_machines"),
      events: await count("events"),
      tickets: await count("it_tickets"),
      assets: isItAdmin ? await count("assets") : 0,
    }),
  });

  const s = stats.data;
  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold">
        Ringkasan <span className="gradient-text">Data Internal</span>
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Statistik seluruh modul yang tersedia untuk peran Anda.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Unit Kerja" value={s?.ukers ?? "—"} icon={Building2} />
        <StatCard label="Pegawai" value={s?.employees ?? "—"} icon={Users} />
        <StatCard label="Mesin ATM" value={s?.atm ?? "—"} icon={Banknote} />
        <StatCard label="Mesin EDC" value={s?.edc ?? "—"} icon={CreditCard} />
        <StatCard label="Event" value={s?.events ?? "—"} icon={CalendarDays} />
        <StatCard label="Tiket IT" value={s?.tickets ?? "—"} icon={LifeBuoy} />
        {isItAdmin ? <StatCard label="Aset IT" value={s?.assets ?? "—"} icon={Boxes} /> : null}
      </div>
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Intisari Project IT</h2>
        <ProjectSummary />
      </section>
    </AdminLayout>
  );
}