import { PageHeader } from "@/components/page-header";
import { StatsView } from "@/components/stats/stats-view";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Statistiques" };

export default async function StatsPage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader title="Statistiques" />
      <StatsView timeZone={user.timeZone} />
    </>
  );
}
