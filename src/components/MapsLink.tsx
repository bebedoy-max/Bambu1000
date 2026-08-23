import { useState } from "react";
import { MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function parseLatLng(value: unknown): { lat: number; lng: number } | null {
  if (value === null || value === undefined) return null;
  const m = String(value)
    .trim()
    .match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** Label titik maps yang bisa diklik: membuka pop up peta + street view. */
export function MapsLink({ value, label }: { value: unknown; label?: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"map" | "photo" | "street">("map");
  const pos = parseLatLng(value);

  if (!pos) {
    const text = value === null || value === undefined || value === "" ? "—" : String(value);
    return <span>{text}</span>;
  }

  const coord = `${pos.lat},${pos.lng}`;
  const embedMap = `https://maps.google.com/maps?q=${coord}&z=17&hl=id&output=embed`;
  const embedPhoto = `https://maps.google.com/maps?q=${coord}&z=17&hl=id&output=embed&t=k`;
  const embedStreet = `https://maps.google.com/maps?q=&layer=c&cbll=${coord}&cbp=11,0,0,0,0&hl=id&output=svembed`;

  const src = mode === "map" ? embedMap : mode === "photo" ? embedPhoto : embedStreet;
  const title = mode === "map" ? "Google Maps" : mode === "photo" ? "Foto Lokasi" : "Google Street View";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMode("map");
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={`Lihat titik maps ${label ?? coord}`}
      >
        <MapPin className="size-3.5" />
        <span className="tabular-nums">{label ?? `${pos.lat}, ${pos.lng}`}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Titik Maps</DialogTitle>
            <DialogDescription>
              Koordinat {pos.lat}, {pos.lng}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={mode === "map" ? "default" : "secondary"}
              onClick={() => setMode("map")}
            >
              Peta
            </Button>
            <Button
              size="sm"
              variant={mode === "photo" ? "default" : "secondary"}
              onClick={() => setMode("photo")}
            >
              Foto
            </Button>
            <Button
              size="sm"
              variant={mode === "street" ? "default" : "secondary"}
              onClick={() => setMode("street")}
            >
              Street View
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border/60">
            <iframe
              key={mode}
              title={title}
              src={src}
              className="h-[420px] w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
