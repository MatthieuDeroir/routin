import { addDays, today as todayIn } from "@/lib/domain";
import { getRoutineData } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { StoreProvider } from "@/lib/store/store";

/**
 * Fenêtre de coches chargée d'avance. La configuration (moments, routines,
 * tâches) est transmise en entier : elle tient en quelques dizaines de lignes,
 * et le client doit pouvoir recalculer n'importe quelle journée hors ligne.
 */
const WINDOW_DAYS = 120;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const today = todayIn(user.timeZone);

  const data = await getRoutineData(
    user.id,
    addDays(today, -WINDOW_DAYS),
    addDays(today, 1),
  );

  return (
    <StoreProvider userId={user.id} initial={data}>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {children}
      </main>
    </StoreProvider>
  );
}
