import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logoUrl from "@/assets/logo.png";
import { AuthSplash } from "@/components/AuthSplash";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { checkPersonalNumber, claimPendingPersonalNumber, PENDING_PN_KEY } from "@/lib/registration";

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

const loginSchema = z.object({
  email: z.string().trim().email("Email tidak valid").max(255),
  password: z.string().min(6, "Password minimal 6 karakter").max(72),
});

const pnSchema = z
  .string()
  .trim()
  .regex(/^\d{8}$/, "Personal Number wajib 8 digit angka");

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function Auth() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pn, setPn] = useState("");
  const [busy, setBusy] = useState(false);
  const [splash, setSplash] = useState<string | null>("Memeriksa sesi...");
  const [googleOpen, setGoogleOpen] = useState(false);
  const [googlePn, setGooglePn] = useState("");
  const done = useRef(false);

  /** Dipanggil begitu sesi tersedia (login email maupun Google). */
  async function finish() {
    if (done.current) return;
    done.current = true;
    setSplash("Welcome to Super IT Zone...");
    await claimPendingPersonalNumber();
    await qc.invalidateQueries();
    await wait(1200);
    void navigate({ to: "/admin", replace: true });
  }

  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && mounted) void finish();
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) void finish();
      else setSplash(null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn() {
    const p = loginSchema.safeParse({ email, password });
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
    void finish();
  }

  async function signUp() {
    const pnParsed = pnSchema.safeParse(pn);
    if (!pnParsed.success) {
      toast.error(pnParsed.error.issues[0]!.message);
      return;
    }
    const p = loginSchema.safeParse({ email, password });
    if (!p.success) {
      toast.error(p.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    const check = await checkPersonalNumber(pnParsed.data);
    if (!check.ok) {
      setBusy(false);
      toast.error(check.message);
      return;
    }
    const { error } = await supabase.auth.signUp({
      ...p.data,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { personal_number: pnParsed.data },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    localStorage.setItem(PENDING_PN_KEY, pnParsed.data);
    toast.success("Registrasi berhasil. Silakan masuk dengan email & password Anda.");
  }

  async function googleContinue() {
    const parsed = pnSchema.safeParse(googlePn);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    const check = await checkPersonalNumber(parsed.data, { allowExisting: true });
    setBusy(false);
    if (!check.ok) {
      toast.error(check.message);
      return;
    }
    localStorage.setItem(PENDING_PN_KEY, parsed.data);
    setGoogleOpen(false);
    setSplash("Menghubungkan ke Google...");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) {
      setSplash(null);
      toast.error(error.message || "Gagal masuk dengan Google");
    }
  }

  if (splash) return <AuthSplash label={splash} />;

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Dialog open={googleOpen} onOpenChange={setGoogleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verifikasi Personal Number</DialogTitle>
            <DialogDescription>
              Masukkan Personal Number Anda. Sistem akan mencocokkan dengan Data Pekerja sebelum
              melanjutkan ke pemilihan akun Google.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="gpn">Personal Number</Label>
            <Input
              id="gpn"
              inputMode="numeric"
              placeholder="8 digit angka"
              value={googlePn}
              onChange={(e) => setGooglePn(e.target.value.replace(/\D/g, "").slice(0, 8))}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setGoogleOpen(false)}>
              Batal
            </Button>
            <Button onClick={googleContinue} disabled={busy}>
              Lanjut ke Google
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="glass-card relative w-full max-w-md p-8">
        <button
          type="button"
          onClick={() => navigate({ to: "/", replace: true })}
          aria-label="Tutup"
          className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full border border-border/60 bg-background/60 text-muted-foreground backdrop-blur transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>
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
              <Label htmlFor="pn">Personal Number</Label>
              <Input
                id="pn"
                inputMode="numeric"
                placeholder="8 digit angka"
                value={pn}
                onChange={(e) => setPn(e.target.value.replace(/\D/g, "").slice(0, 8))}
              />
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
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            setGooglePn("");
            setGoogleOpen(true);
          }}
        >
          Masuk dengan Google
        </Button>
      </div>
    </div>
  );
}
