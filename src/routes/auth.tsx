import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logoUrl from "@/assets/logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk Panel Internal — BRI BO Pringsewu" },
      {
        name: "description",
        content:
          "Halaman masuk pegawai untuk mengakses panel internal BRI Branch Office Pringsewu.",
      },
      { property: "og:title", content: "Masuk Panel Internal — BRI BO Pringsewu" },
      { property: "og:description", content: "Autentikasi pegawai BRI BO Pringsewu." },
    ],
  }),
  component: Auth,
});

const schema = z.object({
  email: z.string().trim().email("Email tidak valid").max(255),
  password: z.string().min(6, "Password minimal 6 karakter").max(72),
});

function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nama, setNama] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function signIn() {
    const p = schema.safeParse({ email, password });
    if (!p.success) {
      toast.error(p.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(p.data);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    void navigate({ to: "/admin", replace: true });
  }

  async function signUp() {
    const p = schema.safeParse({ email, password });
    if (!p.success) {
      toast.error(p.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      ...p.data,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
        data: { nama: nama.trim().slice(0, 100) },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Akun dibuat. Silakan masuk.");
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) toast.error(error.message || "Gagal masuk dengan Google");
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <button
        type="button"
        onClick={() => navigate({ to: "/", replace: true })}
        aria-label="Tutup"
        className="absolute left-4 top-4 z-10 grid size-10 place-items-center rounded-full border border-border/60 bg-background/60 text-foreground backdrop-blur transition-colors hover:bg-secondary"
      >
        <X className="size-5" />
      </button>
      <div className="glass-card w-full max-w-md p-8">
        <img src={logoUrl} alt="Logo" className="h-[68px] w-auto object-contain" />

        <Tabs defaultValue="masuk" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="masuk">Masuk</TabsTrigger>
            <TabsTrigger value="daftar">Daftar</TabsTrigger>
          </TabsList>
          <TabsContent value="masuk" className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button onClick={signIn} disabled={busy}>
              Masuk
            </Button>
          </TabsContent>
          <TabsContent value="daftar" className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nama">Nama Lengkap</Label>
              <Input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email2">Email</Label>
              <Input id="email2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password2">Password</Label>
              <Input
                id="password2"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button onClick={signUp} disabled={busy}>
              Buat Akun
            </Button>
          </TabsContent>
        </Tabs>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> atau <span className="h-px flex-1 bg-border" />
        </div>
        <Button variant="secondary" className="w-full" onClick={google}>
          Masuk dengan Google
        </Button>
      </div>
    </div>
  );
}