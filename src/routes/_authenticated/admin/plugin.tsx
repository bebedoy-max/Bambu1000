import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { AdminLayout, AccessDenied } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAccess } from "@/lib/access";
import {
  WINDOWS_INSTALLER_BASE64,
  WINDOWS_INSTALLER_NAME,
} from "@/lib/windows-installer";

/** Aplikasi bawaan yang sudah dipaketkan bersama panel. */
const builtInApp = {
  name: "SuperIT Event Uploader",
  version: "1.2.8",
  description:
    "Aplikasi desktop pemroses foto event: sinkron wajah master, deteksi & pencocokan wajah, rename otomatis, upload ke Google Drive panel, lalu simpan hasilnya ke panel.",
  changelog:
    "- Unggah foto event kini dikirim langsung ke Google Drive (resumable upload), sehingga foto besar dari HP tidak lagi gagal dengan error 413 Request Entity Too Large\n- Deteksi wajah master dibuat lebih toleran untuk foto kecil/kompresi berat: EXIF rotation dibaca, kontras diperbaiki, threshold deteksi diturunkan, dicoba rotasi, upscale, dan crop scan untuk wajah yang jauh\n- Perbaikan installer Windows: struktur folder aplikasi kini konsisten dan divalidasi sebelum instalasi\n- Sinkron wajah master: foto dengan lebih dari satu wajah kini memakai wajah utama\n- Perbaikan akses event: role it_admin kini dapat membuat, mengubah, dan menghapus event sesuai policy RLS terbaru\n- Paket Windows dibuat ulang sebagai ZIP standar tanpa trailing data dan memakai nama versi baru agar cache file rusak tidak terpakai\n- Perbaikan error \"'NoneType' object has no attribute 'write'\" saat memuat model face recognition di Windows (pythonw tanpa konsol)\n- Log runtime disimpan di ~/.superit-event-uploader-logs/runtime.log\n- Pesan error kini menampilkan jenis error, tidak lagi \"None\"\n- Google Drive otomatis memakai akun Drive aktif di web app — client_secret.json tidak diperlukan\n- Admin cukup login dengan akun panel (email & password)\n- Installer memilih Python 3.10–3.12 otomatis, instalasi tanpa cache pip\n- Tampilan mengikuti tema panel (Dark Blue Metallic)\n- Rename EVT-{event_id}_{personal_number}_{nama_asli}, progress bar, resume-safe",
  downloads: [
    {
      label: "Windows",
      url: "/downloads/SuperITEventUploader-1.2.8-Windows.zip",
      hint: "Jalankan Install-Windows.bat",
    },
    {
      label: "macOS",
      url: "/downloads/SuperITEventUploader-1.2.8-macOS.zip",
      hint: "Jalankan Install-macOS.command",
    },
  ],
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const access = useAccess();

  const downloadWindowsInstaller = () => {
    const binary = window.atob(WINDOWS_INSTALLER_BASE64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const objectUrl = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = WINDOWS_INSTALLER_NAME;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  };

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

          <article className="glass-card space-y-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{builtInApp.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{builtInApp.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge>Bawaan</Badge>
                <Badge variant="secondary">v{builtInApp.version}</Badge>
              </div>
            </div>
            <div className="rounded-xl border border-border/60 p-3 text-xs whitespace-pre-line text-muted-foreground">
              {builtInApp.changelog}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Installer sekali klik — butuh Python 3.10–3.12 terpasang, sisanya otomatis.
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {builtInApp.downloads.map((d) => (
                  d.label === "Windows" ? (
                    <Button
                      key={d.label}
                      size="sm"
                      title={d.hint}
                      onClick={downloadWindowsInstaller}
                    >
                      <Download className="size-4" /> Installer {d.label}
                    </Button>
                  ) : (
                    <Button key={d.label} asChild size="sm" variant="secondary">
                      <a href={d.url} download title={d.hint}>
                        <Download className="size-4" /> Installer {d.label}
                      </a>
                    </Button>
                  )
                ))}
              </div>
            </div>
          </article>
        </div>
      )}
    </AdminLayout>
  );
}
