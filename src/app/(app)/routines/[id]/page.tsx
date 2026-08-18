import { PageHeader } from "@/components/page-header";
import { RoutineEditor } from "@/components/routines/routine-editor";

export default async function RoutinePage({ params }: PageProps<"/routines/[id]">) {
  const { id } = await params;

  return (
    <>
      <PageHeader
        title={id === "nouvelle" ? "Nouvelle routine" : "Modifier la routine"}
        back="/routines"
      />
      <RoutineEditor id={id} />
    </>
  );
}
