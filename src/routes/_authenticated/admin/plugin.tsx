import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Puzzle } from "lucide-react";
import { AdminLayout, AccessDenied } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAccess } from "@/lib/access";
import { db } from "@/lib/face";

type CompanionApp = {
  id: string;
  name: string;
  description: string | null;
  version: string | null;
  changelog: string | null;
  download_url: string;
  updated_at: string | null;
};

export const Route = createFileRoute("/_authenticated/admin/plugin")({
  head: () => ({
    meta: [
      { title: "SuperIT Plug In — Panel BRI BO Pringsewu" },
      {
        name: "description",
        content: "Unduh aplikasi companion dan plugin pendukung panel SuperIT.",
      },
      { property: "og:title", content: "SuperIT Plug In — Panel BRI BO Pringsewu" },
      {
        property: "og:description",
        content: "Daftar aplikasi companion dan plugin pendukung panel SuperIT.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const access = useAccess();

  const apps = useQuery({
    queryKey: ["companion-apps"],
    enabled: access.isAdminLevel,
    queryFn: async () => {
      const { data, error } = await db
        .from("companion_apps")
        .select("id,name,description,version,changelog,download_url,updated_at")
        .order("name");
      if (error) throw error;
      return (data ?? []) as CompanionApp[];
    },
  });

  return (
    <AdminLayout>
      {access.loading ? null : !access.isAdminLevel ? (
        <AccessDenied />
      ) : (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold">SuperIT Plug In</h1>
            <p className="text-sm text-muted-foreground">
              Aplikasi tambahan pendukung panel: companion app pemroses foto event dan plugin
              lainnya.
            </p>
          </div>

          {apps.isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat daftar aplikasi…</p>
          ) : (apps.data ?? []).length === 0 ? (
            <div className="glass-card flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
              <Puzzle className="size-6" />
              <p className="text-sm">Belum ada aplikasi terdaftar.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(apps.data ?? []).map((app) => (
                <article key={app.id} className="glass-card space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{app.name}</h2>
                      {app.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">{app.description}</p>
                      ) : null}
                    </div>
                    {app.version ? <Badge variant="secondary">v{app.version}</Badge> : null}
                  </div>
                  {app.changelog ? (
                    <div className="rounded-xl border border-border/60 p-3 text-xs whitespace-pre-line text-muted-foreground">
                      {app.changelog}
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">
                      {app.updated_at
                        ? `Diperbarui ${new Date(app.updated_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}`
                        : ""}
                    </span>
                    <Button asChild size="sm">
                      <a href={app.download_url} target="_blank" rel="noreferrer">
                        <Download className="size-4" /> Unduh
                      </a>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
