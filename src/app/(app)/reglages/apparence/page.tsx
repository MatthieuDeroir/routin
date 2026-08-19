import { PageHeader } from "@/components/page-header";
import { AppearanceEditor } from "@/components/settings/appearance-editor";
import { resolveAppearance } from "@/lib/appearance-server";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Apparence" };

export default async function AppearancePage() {
  const user = await requireUser();
  const appearance = await resolveAppearance();

  return (
    <>
      <PageHeader title="Apparence" back="/reglages" />
      <AppearanceEditor initial={appearance} userId={user.id} />
    </>
  );
}
