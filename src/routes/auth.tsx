import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Gagal masuk dengan Google");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/admin", replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="glass-card w-full max-w-md p-8">
        <span
          className="grid size-12 place-items-center rounded-2xl text-sm font-black text-primary-foreground"
          style={{ backgroundImage: "var(--gradient-brand)" }}
        >
          BRI
        </span>
        <h1 className="mt-4 text-2xl font-bold">Panel Internal</h1>
        <p className="text-sm text-muted-foreground">BRI Branch Office Pringsewu</p>

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