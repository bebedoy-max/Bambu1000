import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, AccessDenied } from "@/components/AdminLayout";
import { ResourceManager } from "@/components/ResourceManager";
import { useRoles } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/admin/crm")({
  head: () => ({
    meta: [
      { title: "Mesin CRM — Panel BRI BO Pringsewu" },
      { name: "description", content: "Daftar mesin CRM beserta lokasi, IP address, dan tanggal live." },
      { property: "og:title", content: "Mesin CRM — Panel BRI BO Pringsewu" },
      { property: "og:description", content: "Daftar mesin CRM beserta lokasi, IP address, dan tanggal live." },
    ],
  }),
  component: Page,
});

function Page() {
  const r = useRoles();
  return (
    <AdminLayout>
      {r.loading ? null : (
        <ResourceManager
          table="crm_machines"
          title="Mesin CRM"
          description="Daftar mesin CRM beserta lokasi, IP address, dan tanggal live."
          canWrite={r.isItAdmin}
          fields={[
            { key: "tid", label: "TID", type: "digits", required: true },
            { key: "lokasi", label: "Lokasi" },
            { key: "titik_maps", label: "Titik Maps", type: "latlng" },
            { key: "merk", label: "Merk CRM" },
            { key: "ip_address", label: "IP Address", type: "ip" },
            { key: "tgl_live", label: "Tgl. Live", type: "date" },
          ]}
        />
      )}
    </AdminLayout>
  );
}
