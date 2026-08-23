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
import { useConfirm } from "@/components/ConfirmDialog";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  checkPersonalNumber,
  claimPendingPersonalNumber,
  isAccountRegistered,
  rejectUnregisteredAccount,
  PENDING_PN_KEY,
} from "@/lib/registration";
import { clearPostLogin, markPostLogin } from "@/lib/post-login";

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
  const confirm = useConfirm();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pn, setPn] = useState("");
  const [busy, setBusy] = useState(false);
  const [splash, setSplash] = useState<string | null>("Memeriksa sesi...");
  const [tab, setTab] = useState("masuk");
  const [googleOpen, setGoogleOpen] = useState(false);
  const [googlePn, setGooglePn] = useState("");
  const done = useRef(false);

  /** Info akun tidak terdaftar lalu kembali ke dashboard umum. */
  async function showUnregistered() {
    clearPostLogin();
    setSplash(null);
    await confirm({
      title: "Akun tidak terdaftar",
      description:
        "Akun Google Anda tidak terdaftar. Silakan registrasi menggunakan Personal Number Anda di halaman menu login.",
      infoOnly: true,
      confirmText: "Mengerti",
    });
    void navigate({ to: "/", replace: true });
  }

  /** Registrasi Google gagal menghubungkan Personal Number: jelaskan alasannya. */
  async function showClaimFailed(message: string) {
    clearPostLogin();
    setSplash(null);
    await confirm({
      title: "Registrasi belum berhasil",
      description: `${message} Silakan periksa kembali Personal Number Anda lalu ulangi registrasi.`,
      infoOnly: true,
      confirmText: "Mengerti",
    });
    setTab("daftar");
  }

  /** Dipanggil begitu sesi tersedia (login email maupun Google). */
  async function finish() {
    if (done.current) return;
    done.current = true;
    setSplash("Memverifikasi akun...");
    const claim = await claimPendingPersonalNumber();

    // Akun hanya boleh masuk bila Personal Number-nya ada di Data Pekerja.
    if (!(await isAccountRegistered())) {
      await rejectUnregisteredAccount();
      done.current = false;
      // Alur registrasi (ada Personal Number tertunda) tidak boleh dianggap
      // sebagai "akun tidak terdaftar" — tampilkan penyebab sebenarnya.
      if (claim.status === "failed") await showClaimFailed(claim.message);
      else await showUnregistered();
      return;
    }

    clearPostLogin();
    setSplash("Welcome to Super IT Zone...");
    await qc.invalidateQueries();
    await wait(1200);
    void navigate({ to: "/admin", replace: true });
  }

  useEffect(() => {
    let mounted = true;
    if (typeof window !== "undefined" && sessionStorage.getItem("unregistered_account")) {
      sessionStorage.removeItem("unregistered_account");
      // Bila ada Personal Number tertunda, ini alur registrasi: jangan tampilkan
      // pesan "akun tidak terdaftar", biarkan proses klaim berjalan.
      if (!localStorage.getItem(PENDING_PN_KEY)) {
        void showUnregistered();
        return;
      }
    }
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
    markPostLogin();
    const { error } = await supabase.auth.signInWithPassword(p.data);
    setBusy(false);
    if (error) {
      clearPostLogin();
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
    const { data: signUpData, error } = await supabase.auth.signUp({
      ...p.data,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { personal_number: pnParsed.data },
      },
    });
    if (error) {
      setBusy(false);
      const msg = error.message || "";
      if (/rate limit|too many requests|over_email_send_rate/i.test(msg)) {
        toast.error(
          "Batas pengiriman email registrasi tercapai. Tunggu beberapa menit lalu coba lagi, " +
            "atau matikan 'Confirm email' di pengaturan Authentication.",
        );
      } else if (/already registered|already exists|user_already/i.test(msg)) {
        toast.error("Email ini sudah terdaftar. Silakan masuk.");
      } else {
        toast.error(msg);
      }
      return;
    }
    localStorage.setItem(PENDING_PN_KEY, pnParsed.data);

    // Bila konfirmasi email dimatikan, sesi langsung terbentuk:
    // hubungkan Personal Number lalu terapkan level aksesnya.
    if (signUpData.session) {
      await claimPendingPersonalNumber();
      setBusy(false);
      void finish();
      return;
    }

    // Tanpa sesi: login langsung agar level akses tersinkron tanpa menunggu email.
    const { error: signInErr } = await supabase.auth.signInWithPassword(p.data);
    setBusy(false);
    if (!signInErr) {
      await claimPendingPersonalNumber();
      void finish();
      return;
    }
    toast.success("Registrasi berhasil. Silakan masuk dengan email & password Anda.");
  }

  /** Login Google langsung tanpa verifikasi PN (khusus pengguna yang sudah terdaftar). */
  async function googleSignIn() {
    markPostLogin();
    setSplash("Menghubungkan ke Google...");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) {
      clearPostLogin();
      setSplash(null);
      toast.error(error.message || "Gagal masuk dengan Google");
    }
  }

  async function googleContinue() {
    const parsed = pnSchema.safeParse(googlePn);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    const check = await checkPersonalNumber(parsed.data);
    setBusy(false);
    if (!check.ok) {
      toast.error(check.message);
      return;
    }
    localStorage.setItem(PENDING_PN_KEY, parsed.data);
    setGoogleOpen(false);
    markPostLogin();
    setSplash("Menghubungkan ke Google...");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) {
      clearPostLogin();
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

        <Tabs value={tab} onValueChange={setTab} className="mt-6">
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
        {tab === "masuk" ? (
          <Button variant="secondary" className="w-full" disabled={busy} onClick={googleSignIn}>
            Masuk dengan Google
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              setGooglePn("");
              setGoogleOpen(true);
            }}
          >
            Daftar dengan Google
          </Button>
        )}
      </div>
    </div>
  );
}
