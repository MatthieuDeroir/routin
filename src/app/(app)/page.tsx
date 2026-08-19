import { AppMenu } from "@/components/app-menu";
import { TodayView } from "@/components/today/today-view";
import { today as todayIn } from "@/lib/domain";
import { requireUser } from "@/lib/session";
import { resolveAppearance } from "@/lib/appearance-server";

export default async function HomePage() {
  const user = await requireUser();
  const appearance = await resolveAppearance();

  return (
    <TodayView
      theme={appearance.theme}
      today={todayIn(user.timeZone)}
      timeZone={user.timeZone}
      menu={<AppMenu />}
    />
  );
}
