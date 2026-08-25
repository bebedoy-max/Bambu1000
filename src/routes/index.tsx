import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Banknote, Building2, CreditCard, Users, CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PublicLayout } from "@/components/PublicLayout";
import { StatCard } from "@/components/StatCard";
import { ProjectSummary } from "@/components/ProjectSummary";
import { Button } from "@/components/ui/button";
import { AuthSplash } from "@/components/AuthSplash";
import { clearPostLogin, POST_LOGIN_TARGET } from "@/lib/post-login";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard Monitoring — BRI BO Pringsewu" },
      {
        name: "description",
        content:
          "Ringkasan unit kerja, mesin ATM, mesin EDC, dan pegawai BRI Branch Office Pringsewu secara real-time.",
      },
      { property: "og:title", content: "Dashboard Monitoring — BRI BO Pringsewu" },
      {
        property: "og:description",
        content: "Monitoring unit kerja, ATM, EDC, dan pegawai BRI Branch Office Pringsewu.",
      },
    ],
  }),
  component: Index,
});

async function count(table: string, filter?: { col: string; val: unknown }) {
  let q = supabase.from(table as "ukers").select("id", { count: "exact", head: true });
  if (filter) q = q.eq(filter.col as "id", filter.val as string);
  const { count: c } = await q;
  return c ?? 0;
}

function Index() {
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(false);

  // Bila Supabase mengembalikan hasil login ke Site URL ("/"), teruskan ke /auth
  // lengkap dengan parameternya supaya prosesnya bisa diselesaikan / dijelaskan.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = window.location.search;
    const h = window.location.hash;
    const isOAuth = /[?&](code|error|error_description)=/.test(s) || /(access_token|error)=/.test(h);
    if (isOAuth) window.location.replace(`/auth${s}${h}`);
  }, []);

  // Pengguna yang sudah login selalu diarahkan ke panel admin; dashboard umum
  // hanya untuk pengunjung yang belum login.
  useEffect(() => {
    if (typeof window === "undefined") return;

    let mounted = true;
    setRedirecting(true);
    const go = () => {
      if (!mounted) return;
      clearPostLogin();
      void navigate({ to: POST_LOGIN_TARGET, replace: true });
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) go();
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) go();
      else {
        clearPostLogin();
        setRedirecting(false);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const stats = useQuery({
    queryKey: ["public-stats"],
    queryFn: async () => ({
      ukers: await count("ukers"),
      atm: (await count("atm_machines")) + (await count("crm_machines")),
      edc: await count("edc_machines"),
      employees: await count("employees"),
      projects: await count("projects"),
    }),
  });


  const cards = [
    { label: "Unit Kerja", value: stats.data?.ukers ?? "—", icon: Building2, hint: "Uker aktif terdaftar", detailKey: "uker" },
    { label: "Mesin ATM/CRM", value: stats.data?.atm ?? "—", icon: Banknote, hint: "Termonitor", detailKey: "atm" },
    { label: "Mesin EDC", value: stats.data?.edc ?? "—", icon: CreditCard, hint: "Merchant terpasang", detailKey: "edc" },
    { label: "Pegawai", value: stats.data?.employees ?? "—", icon: Users, hint: "Seluruh unit kerja", detailKey: "pegawai" },
    { label: "Project IT", value: stats.data?.projects ?? "—", icon: CalendarDays, hint: "Project berjalan", detailKey: "project" },
  ];

  if (redirecting) return <AuthSplash label="Menyiapkan panel Anda..." />;

  return (
    <PublicLayout>
      <section className="glass-card mb-8 overflow-hidden p-8 sm:p-10">
        <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
          Branch Office Pringsewu
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl leading-tight font-bold sm:text-4xl">
          <span className="gradient-text">Dashboard Monitoring</span> Operasional & Infrastruktur IT
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Pantau unit kerja, jaringan mesin ATM dan EDC, data pegawai, serta kegiatan kantor dalam
          satu tampilan terpadu.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/profil">Profil Kantor</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/informasi">Informasi Umum</Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Project IT Berjalan</h2>
        <ProjectSummary limit={4} />
      </section>
    </PublicLayout>
  );
}
