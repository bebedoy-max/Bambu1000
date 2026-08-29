import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/components/AdminLayout";
import { ResourceManager } from "@/components/ResourceManager";
import { useRoles } from "@/lib/roles";
import { carouselSources } from "@/lib/carousel";

export const Route = createFileRoute("/_authenticated/admin/carousel")({
  head: () => ({
    meta: [
      { title: "Konten Carousel — Panel BRI BO Pringsewu" },
      {
        name: "description",
        content:
          "Pengaturan bagian konten yang ditampilkan pada kolom carousel dashboard umum BRI BO Pringsewu.",
      },
      { property: "og:title", content: "Konten Carousel — Panel BRI BO Pringsewu" },
      {
        property: "og:description",
        content: "Atur sumber konten dan jumlah slide pada carousel dashboard umum.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const r = useRoles();
  return (
    <AdminPage menuKey="carousel">
      {r.loading ? null : (
        <ResourceManager
          table="carousel_sources"
          title="Konten Carousel"
          description="Pilih bagian konten yang tampil pada kolom carousel dashboard umum. Default: 5 konten terakhir dari masing-masing bagian, urutan slide diacak."
          canWrite={r.isItAdmin}
          fields={[
            {
              key: "sumber",
              label: "Bagian Konten",
              type: "select",
              required: true,
              optionItems: carouselSources.map((s) => ({ value: s.value, label: s.label })),
            },
            { key: "jumlah", label: "Jumlah Konten Terakhir", type: "number" },
            { key: "urutan", label: "Urutan", type: "number" },
            { key: "aktif", label: "Tampilkan", type: "boolean" },
          ]}
        />
      )}
    </AdminPage>
  );
}
