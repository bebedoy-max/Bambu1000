import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAccess, useProfileStatus } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logoUrl from "@/assets/logo.png";
import { AuthSplash } from "@/components/AuthSplash";
import { GlobalSearch } from "@/components/GlobalSearch";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function AdminLayout({ children }: { children: ReactNode }) {
  const { session, levelLabel, visibleMenus } = useAccess();
  const status = useProfileStatus();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    const start = Date.now();
    setSigningOut(true);
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    const elapsed = Date.now() - start;
    await wait(Math.max(0, 2000 - elapsed));
    void navigate({ to: "/", replace: true });
  }

  if (signingOut) return <AuthSplash label="Bye My Friends.. See You Later...." />;

  if (status.data === "pending" || status.data === "rejected") {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="glass-card max-w-md p-8 text-center">
          <Clock className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold">
            {status.data === "pending" ? "Menunggu Approval Admin" : "Registrasi Ditolak"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {status.data === "pending"
              ? "Registrasi Anda berhasil, namun akses ke data internal baru aktif setelah disetujui admin."
              : "Pendaftaran Anda ditolak admin. Silakan hubungi tim IT untuk informasi lebih lanjut."}
          </p>
          <Button className="mt-6" variant="secondary" onClick={signOut}>
            <LogOut className="size-4" /> Keluar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border/60 p-4 backdrop-blur-xl lg:flex">
        <Link to="/" className="mb-4 flex items-center gap-3 px-2">
          <img src={logoUrl} alt="Logo" className="h-14 w-auto object-contain" />
        </Link>
        {visibleMenus.map((i) => (
          <Link
            key={i.to}
            to={i.to}
            activeOptions={{ exact: i.to === "/admin" }}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:metal-item hover:text-foreground [&.active]:metal-item-active [&.active]:text-foreground"
          >
            <i.icon className="size-4" />
            {i.label}
          </Link>
        ))}
        <div className="mt-auto space-y-3 pt-4">
          <div className="glass-card p-3">
            <p className="truncate text-xs text-muted-foreground">{session?.user.email}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-[10px]">
                {levelLabel}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="size-4" /> Keluar
          </Button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex items-center justify-end gap-3 border-b border-border/60 bg-background/60 p-3 backdrop-blur-xl">
          <GlobalSearch className="w-full max-w-md" />
        </header>
        <div className="flex flex-wrap gap-1 border-b border-border/60 p-3 lg:hidden">
          {visibleMenus.map((i) => (
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

/** Membungkus halaman admin dengan pengecekan hak akses menu (menu Akses Halaman). */
export function AdminPage({ menuKey, children }: { menuKey: string; children: ReactNode }) {
  const { loading, canAccess } = useAccess();
  return (
    <AdminLayout>{loading ? null : canAccess(menuKey) ? children : <AccessDenied />}</AdminLayout>
  );
}
