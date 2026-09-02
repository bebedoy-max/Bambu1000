import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/components/AdminLayout";
import { ResourceManager } from "@/components/ResourceManager";
import { useRoles } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/admin/qris")({
  head: () => ({
    meta: [
      { title: "Merchant QRIS — Panel BRI BO Pringsewu" },
      { name: "description", content: "Data merchant QRIS beserta store ID, alamat, dan tipe merchant." },
      { property: "og:title", content: "Merchant QRIS — Panel BRI BO Pringsewu" },
      {
        property: "og:description",
        content: "Data merchant QRIS beserta store ID, alamat, dan tipe merchant.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const r = useRoles();
  return (
    <AdminPage menuKey="qris">
      {r.loading ? null : (
        <ResourceManager
          table="qris_merchants"
          title="Merchant QRIS"
          description="Data merchant QRIS beserta store ID, alamat, dan tipe merchant."
          canWrite={r.isItAdmin}
          fields={[
            { key: "store_id", label: "Store ID", type: "digits", required: true, unique: true },
            { key: "nama_merchant", label: "Nama Merchant", required: true },
            { key: "alamat", label: "Alamat", type: "textarea" },
            { key: "tipe", label: "Tipe", type: "select", options: ["Dinamis", "Statis"], required: true },
            {
              key: "bri_merchant",
              label: "BRI Merchant",
              type: "select",
              options: ["Ya", "Tidak"],
              required: true,
            },
          ]}
        />
      )}
    </AdminPage>
  );
}
