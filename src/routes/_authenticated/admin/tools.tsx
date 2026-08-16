import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, AccessDenied } from "@/components/AdminLayout";
import { ResourceManager } from "@/components/ResourceManager";
import { useRoles } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/admin/tools")({
  head: () => ({
    meta: [
      { title: "Tools IT — Panel BRI BO Pringsewu" },
      { name: "description", content: "Master tools dan software untuk keperluan IT." },
      { property: "og:title", content: "Tools IT — Panel BRI BO Pringsewu" },
      { property: "og:description", content: "Master tools dan software untuk keperluan IT." },
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
          table="it_tools"
          title="Tools IT"
          description="Master tools dan software untuk keperluan IT."
          ownerColumn="uploaded_by"
          canWrite={r.isItAdmin}
          fields={[
            { key: "nama_tool", label: "Nama Tool" },
            { key: "kategori", label: "Kategori" },
            { key: "versi", label: "Versi" },
            { key: "link_download", label: "Link Download" },
            { key: "catatan", label: "Catatan", type: "textarea", hideInTable: true },
          ]}
        />
      ) : (
        <AccessDenied />
      )}
    </AdminLayout>
  );
}
