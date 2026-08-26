import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  compressImage,
  formatDateID,
  themeVars,
  type AbsensiSettings,
} from "@/lib/absensi-ui";
import { getAbsensiEvent, submitAbsensi } from "@/lib/absensi.functions";

export const Route = createFileRoute("/absensi/$slug")({
  head: () => ({
    meta: [
      { title: "Absensi Event — BRI BO Pringsewu" },
      {
        name: "description",
        content:
          "Formulir absensi digital event BRI Branch Office Pringsewu: isi data peserta dan ambil foto selfie di lokasi.",
      },
      { property: "og:title", content: "Absensi Event — BRI BO Pringsewu" },
      {
        property: "og:description",
        content: "Absensi digital peserta event BRI Branch Office Pringsewu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AbsensiPage,
});

const emptyForm = {
  nama: "",
  personalNumber: "",
  unitKerja: "",
  noTelp: "",
  fotoSelfie: null as string | null,
};

type FieldKey = "nama" | "personalNumber" | "unitKerja" | "noTelp" | "fotoSelfie";

function AbsensiPage() {
  const { slug } = Route.useParams();
  const [settings, setSettings] = useState<AbsensiSettings | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string | null>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    getAbsensiEvent({ data: { slug } })
      .then((s) => (s ? setSettings(s as AbsensiSettings) : setNotFound(true)))
      .catch(() => setNotFound(true));
    return () => stopCamera();
  }, [slug]);

  useEffect(() => {
    const video = videoRef.current;
    if (!cameraOn || !video || !streamRef.current) return;
    video.srcObject = streamRef.current;
    video.muted = true;
    video.play().catch(() => {});
  }, [cameraOn]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      setShowPhotoOptions(false);
      setErrors((prev) => ({ ...prev, fotoSelfie: null }));
    } catch {
      setErrors((prev) => ({
        ...prev,
        fotoSelfie: "Tidak bisa mengakses kamera. Periksa izin kamera pada perangkat.",
      }));
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || video.clientWidth;
    const h = video.videoHeight || video.clientHeight;
    if (!w || !h) {
      setErrors((prev) => ({
        ...prev,
        fotoSelfie: "Kamera belum siap. Tunggu gambar muncul lalu coba lagi.",
      }));
      return;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    if (!dataUrl || dataUrl.length < 1000) {
      setErrors((prev) => ({
        ...prev,
        fotoSelfie: "Foto gagal diambil. Coba lagi atau gunakan tombol unggah foto.",
      }));
      return;
    }
    setForm((f) => ({ ...f, fotoSelfie: dataUrl }));
    stopCamera();
  }

  function handleFilePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, fotoSelfie: reader.result as string }));
      setErrors((prev) => ({ ...prev, fotoSelfie: null }));
      setShowPhotoOptions(false);
      stopCamera();
    };
    reader.readAsDataURL(file);
  }

  function retakePhoto() {
    setForm((f) => ({ ...f, fotoSelfie: null }));
    setShowPhotoOptions(true);
  }

  function update(key: keyof typeof emptyForm, value: string) {
    let v = value;
    if (key === "nama") v = value.toUpperCase();
    if (key === "personalNumber") v = value.replace(/\D/g, "").slice(0, 8);
    if (key === "noTelp") v = value.replace(/\D/g, "").slice(0, 15);
    setForm((f) => ({ ...f, [key]: v }));
    setErrors((e) => ({ ...e, [key]: null }));
  }

  function validate(s: AbsensiSettings) {
    const fields = s.fields;
    const errs: Partial<Record<FieldKey, string>> = {};
    if (fields.nama && !form.nama.trim()) errs.nama = "Nama wajib diisi.";
    if (fields.personalNumber) {
      if (!form.personalNumber.trim()) errs.personalNumber = "Personal Number wajib diisi.";
      else if (!/^\d{8}$/.test(form.personalNumber))
        errs.personalNumber = "Personal Number harus 8 digit angka.";
    }
    if (fields.unitKerja && !form.unitKerja) errs.unitKerja = "Pilih unit kerja.";
    if (fields.noTelp) {
      if (!form.noTelp.trim()) errs.noTelp = "Nomor telepon wajib diisi.";
      else if (!/^\d{9,15}$/.test(form.noTelp))
        errs.noTelp = "Nomor telepon hanya angka (9-15 digit).";
    }
    if (fields.fotoSelfie && !form.fotoSelfie) errs.fotoSelfie = "Ambil foto selfie terlebih dahulu.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings || !validate(settings)) return;
    setSubmitting(true);
    const record: {
      slug: string;
      nama?: string;
      personalNumber?: string;
      unitKerja?: string;
      noTelp?: string;
      fotoSelfie?: string | null;
    } = { slug };
    const fields = settings.fields;
    if (fields.nama) record.nama = form.nama.trim();
    if (fields.personalNumber) record.personalNumber = form.personalNumber.trim();
    if (fields.unitKerja) record.unitKerja = form.unitKerja;
    if (fields.noTelp) record.noTelp = form.noTelp.trim();
    if (fields.fotoSelfie && form.fotoSelfie) {
      record.fotoSelfie = await compressImage(form.fotoSelfie);
    }
    try {
      await submitAbsensi({ data: record });
      setSubmitted(true);
    } catch {
      setErrors((prev) => ({
        ...prev,
        fotoSelfie: "Gagal mengirim absensi. Periksa koneksi lalu coba lagi.",
      }));
    }
    setSubmitting(false);
  }

  function resetForm() {
    setForm(emptyForm);
    setSubmitted(false);
    setErrors({});
  }

  if (notFound) {
    return (
      <div className="absensi-root">
        <div className="page">
          <div className="page-overlay" />
          <div className="card-wrap">
            <div className="form-card" style={{ textAlign: "center" }}>
              <p className="success-title">Absensi tidak ditemukan</p>
              <p className="success-sub">Tautan absensi tidak valid atau sudah dihapus admin.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="absensi-root">
        <div className="page">
          <div className="page-overlay" />
        </div>
      </div>
    );
  }

  const fields = settings.fields;
  const bgStyle = {
    ...themeVars(settings.themeColor),
    ...(settings.background ? { backgroundImage: `url(${settings.background})` } : {}),
  } as React.CSSProperties;
  const cardStyle = settings.cardBackground
    ? ({ "--card-bg": `url(${settings.cardBackground})` } as React.CSSProperties)
    : undefined;

  return (
    <div className="absensi-root">
      <div className="page" style={bgStyle}>
        <div className="page-overlay" />
        {settings.logoLeft && (
          <img
            className="corner-logo corner-logo-left"
            style={{ width: settings.logoLeftSize || 136, height: settings.logoLeftSize || 136 }}
            src={settings.logoLeft}
            alt="Logo kiri"
          />
        )}
        {settings.logoRight && (
          <img
            className="corner-logo corner-logo-right"
            style={{ width: settings.logoRightSize || 136, height: settings.logoRightSize || 136 }}
            src={settings.logoRight}
            alt="Logo kanan"
          />
        )}
        <div className="card-wrap">
          <div className="header-block">
            <div className="logo-circle">
              {settings.logo ? (
                <img src={settings.logo} alt="Logo acara" />
              ) : (
                (settings.officeName || "B").charAt(0)
              )}
            </div>
            <h1 className="event-title">{settings.eventName}</h1>
            <p className="event-sub">
              {settings.officeName} &middot; {formatDateID(settings.eventDate)}
            </p>
          </div>

          <div className="form-card" style={cardStyle}>
            {!settings.isOpen ? (
              <div className="success-wrap">
                <p className="success-title">Absensi ditutup</p>
                <p className="success-sub">
                  Panitia sudah menutup absensi untuk acara ini. Hubungi admin acara bila perlu.
                </p>
              </div>
            ) : submitted ? (
              <div className="success-wrap">
                <div className="success-icon">&#10003;</div>
                <p className="success-title">Absensi berhasil dicatat</p>
                <p className="success-sub">
                  Terima kasih, {form.nama || "rekan"}. Selamat mengikuti acara!
                </p>
                <button className="btn-outline" onClick={resetForm} style={{ marginTop: 18 }}>
                  Absen peserta lain
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {fields.nama && (
                  <div className="field-group">
                    <label className="field-label">Nama</label>
                    <input
                      className="field-input"
                      placeholder="Nama lengkap"
                      value={form.nama}
                      onChange={(e) => update("nama", e.target.value)}
                      style={{ textTransform: "uppercase" }}
                    />
                    {errors.nama && <p className="error-text">{errors.nama}</p>}
                  </div>
                )}

                {fields.personalNumber && (
                  <div className="field-group">
                    <label className="field-label">Personal Number</label>
                    <input
                      className="field-input"
                      placeholder="Contoh: 00123456"
                      inputMode="numeric"
                      maxLength={8}
                      value={form.personalNumber}
                      onChange={(e) => update("personalNumber", e.target.value)}
                    />
                    {errors.personalNumber && <p className="error-text">{errors.personalNumber}</p>}
                  </div>
                )}

                {fields.unitKerja && (
                  <div className="field-group">
                    <label className="field-label">Unit Kerja</label>
                    <select
                      className="field-select"
                      value={form.unitKerja}
                      onChange={(e) => update("unitKerja", e.target.value)}
                    >
                      <option value="">Pilih unit kerja</option>
                      {(settings.unitKerjaList || []).map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    {errors.unitKerja && <p className="error-text">{errors.unitKerja}</p>}
                  </div>
                )}

                {fields.noTelp && (
                  <div className="field-group">
                    <label className="field-label">Nomor Telp.</label>
                    <input
                      className="field-input"
                      placeholder="08xxxxxxxxxx"
                      inputMode="numeric"
                      value={form.noTelp}
                      onChange={(e) => update("noTelp", e.target.value)}
                    />
                    {errors.noTelp && <p className="error-text">{errors.noTelp}</p>}
                  </div>
                )}

                {fields.fotoSelfie && (
                  <div className="field-group">
                    <label className="field-label">Foto Selfie di Lokasi</label>
                    <div className="selfie-box">
                      <canvas ref={canvasRef} style={{ display: "none" }} />
                      {form.fotoSelfie ? (
                        <>
                          <img src={form.fotoSelfie} alt="Foto selfie peserta" />
                          <button type="button" className="btn-outline" onClick={retakePhoto}>
                            Ambil ulang foto
                          </button>
                        </>
                      ) : cameraOn ? (
                        <>
                          <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            onLoadedMetadata={() => videoRef.current?.play().catch(() => {})}
                            style={{ transform: "scaleX(-1)" }}
                          />
                          <div className="selfie-actions">
                            <button type="button" className="btn-gold" onClick={capturePhoto}>
                              Jepret Foto
                            </button>
                            <button type="button" className="btn-outline" onClick={stopCamera}>
                              Tutup Kamera
                            </button>
                          </div>
                        </>
                      ) : showPhotoOptions ? (
                        <div className="selfie-actions">
                          <button type="button" className="btn-outline" onClick={startCamera}>
                            Kamera
                          </button>
                          <label
                            className="btn-outline"
                            style={{ textAlign: "center", cursor: "pointer" }}
                          >
                            Upload
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: "none" }}
                              onChange={handleFilePhoto}
                            />
                          </label>
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() => setShowPhotoOptions(false)}
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn-gold"
                          onClick={() => setShowPhotoOptions(true)}
                        >
                          Ambil Foto
                        </button>
                      )}
                    </div>
                    {errors.fotoSelfie && <p className="error-text">{errors.fotoSelfie}</p>}
                  </div>
                )}

                <button className="btn-gold" type="submit" disabled={submitting}>
                  {submitting ? "Mengirim..." : "Kirim Absensi"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
