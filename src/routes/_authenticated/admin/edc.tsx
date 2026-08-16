import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, AccessDenied } from "@/components/AdminLayout";
import { ResourceManager } from "@/components/ResourceManager";
import { useRoles } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/admin/edc")({
  head: () => ({
    meta: [
      { title: "Mesin EDC — Panel BRI BO Pringsewu" },
      { name: "description", content: "Daftar mesin EDC dan merchant terpasang." },
      { property: "og:title", content: "Mesin EDC — Panel BRI BO Pringsewu" },
      { property: "og:description", content: "Daftar mesin EDC dan merchant terpasang." },
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
          table="edc_machines"
          title="Mesin EDC"
          description="Daftar mesin EDC dan merchant terpasang."
          canWrite={r.isItAdmin}
          fields={[
            { key: "kode_edc", label: "Kode EDC" },
            { key: "uker_id", label: "Unit Kerja", type: "uker" },
            { key: "merchant", label: "Merchant" },
            { key: "lokasi", label: "Lokasi" },
            { key: "status", label: "Status", type: "select", options: ["aktif", "gangguan", "nonaktif"] },
            { key: "tanggal_pasang", label: "Tgl Pasang", type: "date" },
          ]}
        />
      ) : (
        <AccessDenied />
      )}
    </AdminLayout>
  );
}
