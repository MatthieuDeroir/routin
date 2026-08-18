import { cookies } from "next/headers";
import { AppMenu } from "@/components/app-menu";
import { TodayView } from "@/components/today/today-view";
import { today as todayIn } from "@/lib/domain";
import { requireUser } from "@/lib/session";
import { APPEARANCE_COOKIE, parseAppearance } from "@/lib/appearance";

export default async function HomePage() {
  const user = await requireUser();
  const appearance = parseAppearance((await cookies()).get(APPEARANCE_COOKIE)?.value);

  return (
    <TodayView
      theme={appearance.theme}
      today={todayIn(user.timeZone)}
      timeZone={user.timeZone}
      menu={<AppMenu />}
    />
  );
}
