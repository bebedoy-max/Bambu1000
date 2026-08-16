import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, AccessDenied } from "@/components/AdminLayout";
import { ResourceManager } from "@/components/ResourceManager";
import { useRoles } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/admin/tutorial")({
  head: () => ({
    meta: [
      { title: "Tutorial — Panel BRI BO Pringsewu" },
      { name: "description", content: "Dokumentasi dan panduan teknis internal IT." },
      { property: "og:title", content: "Tutorial — Panel BRI BO Pringsewu" },
      { property: "og:description", content: "Dokumentasi dan panduan teknis internal IT." },
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
          table="tutorials"
          title="Tutorial"
          description="Dokumentasi dan panduan teknis internal IT."
          ownerColumn="uploaded_by"
          canWrite={r.isItAdmin}
          fields={[
            { key: "judul", label: "Judul" },
            { key: "kategori", label: "Kategori" },
            { key: "file_url", label: "URL File" },
            { key: "konten", label: "Konten", type: "textarea", hideInTable: true },
          ]}
        />
      ) : (
        <AccessDenied />
      )}
    </AdminLayout>
  );
}
