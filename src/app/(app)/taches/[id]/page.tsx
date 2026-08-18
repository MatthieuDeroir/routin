import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { TaskEditor } from "@/components/routines/task-editor";

export default async function TaskPage({ params }: PageProps<"/taches/[id]">) {
  const { id } = await params;

  return (
    <>
      <PageHeader
        title={id === "nouvelle" ? "Nouvelle tâche" : "Modifier la tâche"}
        back="/routines"
      />
      <Suspense fallback={null}>
        <TaskEditor id={id} />
      </Suspense>
    </>
  );
}
