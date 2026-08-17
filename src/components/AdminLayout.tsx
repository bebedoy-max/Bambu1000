import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  Boxes,
  Building2,
  CalendarDays,
  CreditCard,
  Gauge,
  Image,
  LifeBuoy,
  LogOut,
  Network,
  ScrollText,
  Users,
  Wrench,
  BookOpen,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRoles } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logoUrl from "@/assets/logo.png";

type Item = { to: string; label: string; icon: typeof Gauge; need?: "it" | "event" | "super" };

const items: Item[] = [
  { to: "/admin", label: "Ringkasan", icon: Gauge },
  { to: "/admin/uker", label: "Unit Kerja", icon: Building2 },
  { to: "/admin/pegawai", label: "Pegawai", icon: Users },
  { to: "/admin/atm", label: "Mesin ATM", icon: Banknote },
  { to: "/admin/edc", label: "Mesin EDC", icon: CreditCard },
  { to: "/admin/event", label: "Event & Absensi", icon: CalendarDays, need: "event" },
  { to: "/admin/ip", label: "IP Address Uker", icon: Network, need: "it" },
  { to: "/admin/tools", label: "Tools IT", icon: Wrench, need: "it" },
  { to: "/admin/tutorial", label: "Tutorial", icon: BookOpen, need: "it" },
  { to: "/admin/foto", label: "Galeri Foto", icon: Image, need: "it" },
  { to: "/admin/tiket", label: "Tiket IT", icon: LifeBuoy },
  { to: "/admin/aset", label: "Inventaris Aset", icon: Boxes, need: "it" },
  { to: "/admin/audit", label: "Audit Log", icon: ScrollText, need: "super" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { isItAdmin, isEventAdmin, isSuperadmin, session, roles } = useRoles();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const visible = items.filter((i) =>
    i.need === "it"
      ? isItAdmin
      : i.need === "event"
        ? isEventAdmin
        : i.need === "super"
          ? isSuperadmin
          : true,
  );

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border/60 p-4 backdrop-blur-xl lg:flex">
        <Link to="/" className="mb-4 flex items-center gap-3 px-2">
          <img src={logoUrl} alt="Logo" className="h-14 w-auto object-contain" />
        </Link>
        {visible.map((i) => (
          <Link
            key={i.to}
            to={i.to}
            activeOptions={{ exact: i.to === "/admin" }}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground"
          >
            <i.icon className="size-4" />
            {i.label}
          </Link>
        ))}
        <div className="mt-auto space-y-3 pt-4">
          <div className="glass-card p-3">
            <p className="truncate text-xs text-muted-foreground">{session?.user.email}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {roles.map((r) => (
                <Badge key={r} variant="secondary" className="text-[10px]">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="size-4" /> Keluar
          </Button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-1 border-b border-border/60 p-3 lg:hidden">
          {visible.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              activeOptions={{ exact: i.to === "/admin" }}
              className="rounded-lg px-2 py-1 text-xs text-muted-foreground [&.active]:bg-secondary [&.active]:text-foreground"
            >
              {i.label}
            </Link>
          ))}
        </div>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export function AccessDenied() {
  return (
    <div className="glass-card p-10 text-center">
      <h1 className="text-xl font-semibold">Akses ditolak</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Anda tidak memiliki peran yang diperlukan untuk membuka halaman ini.
      </p>
    </div>
  );
}