import { cookies } from "next/headers";
import { signOut } from "@/auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { TodayView } from "@/components/today/today-view";
import { addDays, today as todayIn } from "@/lib/domain";
import { getRoutineData } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { THEME_COOKIE, resolveTheme } from "@/lib/theme";

/** Fenêtre de jours chargée d'avance, pour que la navigation reste locale. */
const WINDOW_DAYS = 21;

export default async function HomePage() {
  const user = await requireUser();
  const theme = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);

  const today = todayIn(user.timeZone);
  const data = await getRoutineData(
    user.id,
    addDays(today, -WINDOW_DAYS),
    addDays(today, WINDOW_DAYS),
  );

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <TodayView
        theme={theme}
        today={today}
        timeZone={user.timeZone}
        moments={data.moments}
        routines={data.routines}
        tasks={data.tasks}
        completions={data.completions}
      />

      <ThemeSwitcher current={theme} />

      <form
        className="px-5 pb-6"
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
        >
          Se déconnecter
        </button>
      </form>
    </main>
  );
}
