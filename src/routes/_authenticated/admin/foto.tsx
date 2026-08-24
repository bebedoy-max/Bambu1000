import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, AccessDenied } from "@/components/AdminLayout";
import { EventGalleryManager } from "@/components/EventGalleryManager";
import { useRoles } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/admin/foto")({
  head: () => ({
    meta: [
      { title: "Event — Panel BRI BO Pringsewu" },
      { name: "description", content: "Catat event dan unggah dokumentasi fotonya ke Google Drive." },
      { property: "og:title", content: "Event — Panel BRI BO Pringsewu" },
      {
        property: "og:description",
        content: "Catat event dan unggah dokumentasi fotonya ke Google Drive.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const r = useRoles();
  return (
    <AdminLayout>
      {r.loading ? null : r.isItAdmin ? (
        <EventGalleryManager canWrite={r.isItAdmin} />
      ) : (
        <AccessDenied />
      )}
    </AdminLayout>
  );
}
