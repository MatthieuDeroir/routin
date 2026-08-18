import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { TaskEditor } from "@/components/routines/task-editor";
import { today as todayIn } from "@/lib/domain";
import { requireUser } from "@/lib/session";

export default async function TaskPage({ params }: PageProps<"/taches/[id]">) {
  const { id } = await params;
  const user = await requireUser();

  return (
    <>
      <PageHeader
        title={id === "nouvelle" ? "Nouvelle tâche" : "Modifier la tâche"}
        back="/routines"
      />
      <Suspense fallback={null}>
        <TaskEditor id={id} today={todayIn(user.timeZone)} />
      </Suspense>
    </>
  );
}
