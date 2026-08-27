import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, Gift, Sparkles, Trophy, Vote } from "lucide-react";
import { AdminPage } from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/tools/")({
  head: () => ({
    meta: [
      { title: "SuperIT Apps — Panel BRI BO Pringsewu" },
      {
        name: "description",
        content: "Kumpulan aplikasi tambahan panel: absensi event, vote, undian, dan nomination.",
      },
      { property: "og:title", content: "SuperIT Apps — Panel BRI BO Pringsewu" },
      {
        property: "og:description",
        content: "Kumpulan aplikasi tambahan panel BRI BO Pringsewu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const apps = [
  {
    key: "absensi",
    to: "/admin/tools/absensi",
    label: "Absensi Event",
    description:
      "Buat absensi digital per event, atur field & tampilannya, bagikan linknya ke pekerja, lalu pantau datanya.",
    icon: CalendarCheck,
    ready: true,
  },
<<<<<<< HEAD
  {
    key: "vote",
    to: "/admin/tools/vote",
    label: "Vote",
    description:
      "Buat vote event, atur kategori & nominasi dari Data Pekerja, bagikan linknya, lalu pantau rekap suaranya.",
    icon: Vote,
    ready: true,
  },
=======
  { key: "vote", label: "Vote", description: "Voting peserta event.", icon: Vote, ready: false },
>>>>>>> bfacf289a1f133ee7f1538d526b7cec017ab7153
  { key: "undian", label: "Undian", description: "Undian doorprize event.", icon: Gift, ready: false },
  {
    key: "nomination",
    label: "Nomination",
    description: "Nominasi penghargaan pekerja.",
    icon: Trophy,
    ready: false,
  },
];

function Page() {
  return (
    <AdminPage menuKey="tools">
      <div className="space-y-5">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="size-6" /> SuperIT Apps
          </h1>
          <p className="text-sm text-muted-foreground">
            Aplikasi tambahan (add-ins) yang berjalan di dalam panel: absensi event, vote, undian,
            nomination, dan lainnya.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {apps.map((app) =>
            app.ready && app.to ? (
              <Link key={app.key} to={app.to} className="glass-card block space-y-2 p-5 transition hover:opacity-90">
                <div className="flex items-center justify-between">
                  <app.icon className="size-6" />
                  <Badge>Aktif</Badge>
                </div>
                <h2 className="font-semibold">{app.label}</h2>
                <p className="text-sm text-muted-foreground">{app.description}</p>
              </Link>
            ) : (
              <div key={app.key} className="glass-card space-y-2 p-5 opacity-60">
                <div className="flex items-center justify-between">
                  <app.icon className="size-6" />
                  <Badge variant="secondary">Segera</Badge>
                </div>
                <h2 className="font-semibold">{app.label}</h2>
                <p className="text-sm text-muted-foreground">{app.description}</p>
              </div>
            ),
          )}
        </div>
      </div>
    </AdminPage>
  );
}
