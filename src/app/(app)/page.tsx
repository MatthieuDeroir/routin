import { cookies } from "next/headers";
import { signOut } from "@/auth";
import { AppMenu } from "@/components/app-menu";
import { TodayView } from "@/components/today/today-view";
import { today as todayIn } from "@/lib/domain";
import { requireUser } from "@/lib/session";
import { THEME_COOKIE, resolveTheme } from "@/lib/theme";

export default async function HomePage() {
  const user = await requireUser();
  const theme = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <TodayView
      theme={theme}
      today={todayIn(user.timeZone)}
      timeZone={user.timeZone}
      menu={
        <AppMenu
          signOut={
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="hover:bg-accent text-muted-foreground w-full px-4 py-2.5 text-left text-sm"
              >
                Se déconnecter
              </button>
            </form>
          }
        />
      }
    />
  );
}
