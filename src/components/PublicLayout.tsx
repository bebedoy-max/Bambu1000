import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Building2, LayoutDashboard, LogIn, ShieldCheck } from "lucide-react";
import { useSession } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import logoUrl from "@/assets/logo.png";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profil", label: "Profil Kantor", icon: Building2 },
  { to: "/informasi", label: "Informasi", icon: ShieldCheck },
] as const;

export function PublicLayout({ children }: { children: ReactNode }) {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoUrl} alt="Logo" className="h-14 w-auto object-contain" />
          </Link>
          <nav className="ml-auto flex items-center gap-1">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground"
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
            <Button asChild size="sm" className="ml-2">
              <Link to={session ? "/admin" : "/auth"}>
                <LogIn className="size-4" />
                {session ? "Panel Admin" : "Masuk"}
              </Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-7xl px-4 pb-10 text-xs text-muted-foreground sm:px-6">
        &copy; {new Date().getFullYear()} BRI Branch Office Pringsewu — Aplikasi internal.
      </footer>
    </div>
  );
}