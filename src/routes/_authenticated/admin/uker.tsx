import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, AccessDenied } from "@/components/AdminLayout";
import { ResourceManager } from "@/components/ResourceManager";
import { useRoles } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/admin/uker")({
  head: () => ({
    meta: [
      { title: "Unit Kerja — Panel BRI BO Pringsewu" },
      { name: "description", content: "Data kode uker, lokasi, titik maps, dan IP address." },
      { property: "og:title", content: "Unit Kerja — Panel BRI BO Pringsewu" },
      { property: "og:description", content: "Data kode uker, lokasi, titik maps, dan IP address." },
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
          description="Data kode uker, tipe kantor, alamat, titik maps, dan IP address."
          canWrite={r.isItAdmin}
          fields={[
            { key: "kode_uker", label: "Kode Uker", type: "digits", required: true },
            { key: "nama_uker", label: "Nama Uker", required: true },
            {
              key: "tipe",
              label: "Tipe Kantor",
              type: "select",
              options: ["Kantor Cabang", "KCP", "BRI Unit", "Teras BRI"],
            },
            { key: "alamat", label: "Alamat", type: "textarea" },
            { key: "titik_maps", label: "Titik Maps", type: "latlng" },
            { key: "ip_address", label: "IP Address", type: "ip" },
          ]}
        />
      ) : (
        <AccessDenied />
      )}
    </AdminLayout>
  );
}
