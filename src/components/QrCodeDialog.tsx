import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Pop up QR Code sebuah link, lengkap dengan tombol unduh PNG. */
export function QrCodeDialog({
  open,
  onOpenChange,
  url,
  title,
  fileName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  url: string;
  title?: string;
  fileName?: string;
}) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    if (!open || !url) return;
    let alive = true;
    void QRCode.toDataURL(url, { width: 720, margin: 2 }).then((d) => {
      if (alive) setSrc(d);
    });
    return () => {
      alive = false;
    };
  }, [open, url]);

  function download() {
    const a = document.createElement("a");
    a.href = src;
    a.download = `${(fileName ?? title ?? "qr-code").replace(/[^\w-]+/g, "-")}.png`;
    a.click();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title ?? "QR Code"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-center">
          {src ? (
            <img
              src={src}
              alt="QR Code link absensi"
              className="mx-auto w-full max-w-[280px] rounded-xl bg-white p-3"
            />
          ) : (
            <p className="text-sm text-muted-foreground">Membuat QR...</p>
          )}
          <p className="break-all text-xs text-muted-foreground">{url}</p>
          <Button className="w-full" onClick={download} disabled={!src}>
            <Download className="size-4" /> Unduh QR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
