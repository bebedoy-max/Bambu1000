import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, AccessDenied } from "@/components/AdminLayout";
import { ResourceManager } from "@/components/ResourceManager";
import { useRoles } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/admin/atm")({
  head: () => ({
    meta: [
      { title: "Mesin ATM — Panel BRI BO Pringsewu" },
      { name: "description", content: "Daftar mesin ATM beserta jadwal maintenance." },
      { property: "og:title", content: "Mesin ATM — Panel BRI BO Pringsewu" },
      { property: "og:description", content: "Daftar mesin ATM beserta jadwal maintenance." },
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
          table="atm_machines"
          title="Mesin ATM"
          description="Daftar mesin ATM beserta jadwal maintenance."
          canWrite={r.isItAdmin}
          fields={[
            { key: "kode_atm", label: "Kode ATM" },
            { key: "uker_id", label: "Unit Kerja", type: "uker" },
            { key: "lokasi", label: "Lokasi" },
            { key: "status", label: "Status", type: "select", options: ["aktif", "gangguan", "maintenance", "nonaktif"] },
            { key: "tanggal_pasang", label: "Tgl Pasang", type: "date" },
            { key: "tanggal_maintenance_terakhir", label: "Maintenance Terakhir", type: "date" },
          ]}
        />
      ) : (
        <AccessDenied />
      )}
    </AdminLayout>
  );
}
