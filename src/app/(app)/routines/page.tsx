import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { RoutinesList } from "@/components/routines/routines-list";

export const metadata = { title: "Mes routines" };

export default function RoutinesPage() {
  return (
    <>
      <PageHeader
        title="Mes routines"
        action={
          <Link
            href="/routines/nouvelle"
            className="border-input rounded-[var(--radius)] border px-3 py-1.5 text-sm"
          >
            Nouvelle
          </Link>
        }
      />
      <RoutinesList />
      <div className="px-5 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <Link
          href="/taches/nouvelle"
          className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
        >
          Ajouter une tâche sans routine
        </Link>
      </div>
    </>
  );
}
