import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { ResourceManager } from "@/components/ResourceManager";

export const Route = createFileRoute("/_authenticated/admin/tiket")({
  head: () => ({
    meta: [
      { title: "Tiket IT — Panel BRI BO Pringsewu" },
      { name: "description", content: "Tiket dan keluhan IT internal per unit kerja." },
      { property: "og:title", content: "Tiket IT — Panel BRI BO Pringsewu" },
      { property: "og:description", content: "Pelaporan dan penanganan keluhan IT internal." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AdminLayout>
      <ResourceManager
        table="it_tickets"
        title="Tiket IT"
        description="Laporkan dan pantau keluhan IT dari setiap unit kerja."
        ownerColumn="reported_by"
        fields={[
          { key: "judul", label: "Judul" },
          { key: "uker_id", label: "Unit Kerja", type: "uker" },
          { key: "deskripsi", label: "Deskripsi", type: "textarea", hideInTable: true },
          {
            key: "status",
            label: "Status",
            type: "select",
            options: ["open", "in_progress", "resolved", "closed"],
          },
          { key: "resolved_at", label: "Selesai Pada", type: "datetime" },
        ]}
      />
    </AdminLayout>
  );
}