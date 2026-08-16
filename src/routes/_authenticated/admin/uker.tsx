import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, AccessDenied } from "@/components/AdminLayout";
import { ResourceManager } from "@/components/ResourceManager";
import { useRoles } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/admin/uker")({
  head: () => ({
    meta: [
      { title: "Unit Kerja — Panel BRI BO Pringsewu" },
      { name: "description", content: "Data kode uker, lokasi, dan penanggung jawab IT." },
      { property: "og:title", content: "Unit Kerja — Panel BRI BO Pringsewu" },
      { property: "og:description", content: "Data kode uker, lokasi, dan penanggung jawab IT." },
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
          table="ukers"
          title="Unit Kerja"
          description="Data kode uker, lokasi, dan penanggung jawab IT."
          canWrite={r.isItAdmin}
          fields={[
            { key: "kode_uker", label: "Kode Uker" },
            { key: "nama_uker", label: "Nama Uker" },
            { key: "tipe", label: "Tipe", type: "select", options: ["Kantor Cabang", "Kantor Cabang Pembantu", "Unit", "Kantor Kas"] },
            { key: "alamat", label: "Alamat", type: "textarea" },
            { key: "latitude", label: "Latitude", type: "number", hideInTable: true },
            { key: "longitude", label: "Longitude", type: "number", hideInTable: true },
            { key: "pic_it", label: "PIC IT" },
            { key: "status_aktif", label: "Status", type: "boolean" },
          ]}
        />
      ) : (
        <AccessDenied />
      )}
    </AdminLayout>
  );
}
