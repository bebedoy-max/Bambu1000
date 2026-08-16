import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, AccessDenied } from "@/components/AdminLayout";
import { ResourceManager } from "@/components/ResourceManager";
import { useRoles } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/admin/foto")({
  head: () => ({
    meta: [
      { title: "Galeri Foto — Panel BRI BO Pringsewu" },
      { name: "description", content: "Penyimpanan dokumentasi foto area IT." },
      { property: "og:title", content: "Galeri Foto — Panel BRI BO Pringsewu" },
      { property: "og:description", content: "Penyimpanan dokumentasi foto area IT." },
    ],
  }),
  component: Page,
});

function Page() {
  const r = useRoles();
  const allowed = r.isItAdmin;
  return (
    <AdminLayout>
      {r.loading ? null : allowed ? (
        <ResourceManager
          table="photos"
          title="Galeri Foto"
          description="Penyimpanan dokumentasi foto area IT."
          ownerColumn="uploaded_by"
          canWrite={r.isItAdmin}
          fields={[
            { key: "judul", label: "Judul" },
            { key: "kategori", label: "Kategori" },
            { key: "uker_id", label: "Unit Kerja", type: "uker" },
            { key: "file_url", label: "URL Foto" },
          ]}
        />
      ) : (
        <AccessDenied />
      )}
    </AdminLayout>
  );
}
