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
            { key: "tid", label: "TID", type: "digits", required: true },
            { key: "nama_merchant", label: "Nama Merchant" },
            {
              key: "kategori_edc",
              label: "Kategori EDC",
              type: "select",
              options: ["Merchant", "Brilink", "UKO"],
            },
            { key: "alamat", label: "Alamat", type: "textarea" },
            { key: "keterangan", label: "Keterangan", type: "textarea" },
          ]}
        />
      ) : (
        <AccessDenied />
      )}
    </AdminLayout>
  );
}
