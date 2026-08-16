import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, AccessDenied } from "@/components/AdminLayout";
import { ResourceManager } from "@/components/ResourceManager";
import { useRoles } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/admin/pegawai")({
  head: () => ({
    meta: [
      { title: "Pegawai — Panel BRI BO Pringsewu" },
      { name: "description", content: "Data pegawai per unit kerja." },
      { property: "og:title", content: "Pegawai — Panel BRI BO Pringsewu" },
      { property: "og:description", content: "Data pegawai per unit kerja." },
    ],
  }),
  component: Page,
});

function Page() {
  const r = useRoles();
  const allowed = true;
  return (
    <AdminLayout>
      {r.loading ? null : allowed ? (
        <ResourceManager
          table="employees"
          title="Pegawai"
          description="Data pegawai per unit kerja."
          canWrite={r.isItAdmin}
          fields={[
            { key: "nip", label: "NIP" },
            { key: "nama", label: "Nama" },
            { key: "jabatan", label: "Jabatan" },
            { key: "uker_id", label: "Unit Kerja", type: "uker" },
            { key: "email", label: "Email" },
            { key: "no_hp", label: "No. HP" },
            { key: "foto_url", label: "URL Foto", hideInTable: true },
            { key: "status_aktif", label: "Status", type: "boolean" },
          ]}
        />
      ) : (
        <AccessDenied />
      )}
    </AdminLayout>
  );
}
