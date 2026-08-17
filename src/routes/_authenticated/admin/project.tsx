import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout, AccessDenied } from "@/components/AdminLayout";
import { ResourceManager } from "@/components/ResourceManager";
import { useRoles } from "@/lib/roles";
import { fetchParamTotals, paramDefs, paramLabel } from "@/lib/projects";

export const Route = createFileRoute("/_authenticated/admin/project")({
  head: () => ({
    meta: [
      { title: "Project IT — Panel BRI BO Pringsewu" },
      { name: "description", content: "Kelola project IT beserta parameter pencapaian dan deadline." },
      { property: "og:title", content: "Project IT — Panel BRI BO Pringsewu" },
      { property: "og:description", content: "Daftar project IT, parameter pencapaian, tanggal mulai, dan deadline." },
    ],
  }),
  component: Page,
});

function Page() {
  const r = useRoles();
  const totals = useQuery({ queryKey: ["param-totals"], queryFn: fetchParamTotals });

  const optionItems = paramDefs.map((d) => ({
    value: d.key,
    label: paramLabel(d, totals.data?.[d.key] ?? 0),
  }));

  return (
    <AdminLayout>
      {r.loading ? null : r.isItAdmin ? (
        <ResourceManager
          table="projects"
          title="Project IT"
          description="Buat project IT, tentukan parameter pencapaian, tanggal mulai, dan deadline."
          canWrite={r.isItAdmin}
          ownerColumn="created_by"
          fields={[
            { key: "nama_project", label: "Nama Project", required: true },
            { key: "deskripsi", label: "Deskripsi", type: "textarea", required: true },
            {
              key: "parameter",
              label: "Parameter Pencapaian",
              type: "select",
              required: true,
              optionItems,
            },
            { key: "tanggal_mulai", label: "Tgl. Mulai", type: "date", required: true },
            { key: "deadline", label: "Deadline", type: "date", required: true },
          ]}
        />
      ) : (
        <AccessDenied />
      )}
    </AdminLayout>
  );
}
