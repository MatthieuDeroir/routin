import { cookies } from "next/headers";
import { PageHeader } from "@/components/page-header";
import { AppearanceEditor } from "@/components/settings/appearance-editor";
import { APPEARANCE_COOKIE, parseAppearance } from "@/lib/appearance";

export const metadata = { title: "Apparence" };

export default async function AppearancePage() {
  const appearance = parseAppearance((await cookies()).get(APPEARANCE_COOKIE)?.value);

  return (
    <>
      <PageHeader title="Apparence" back="/reglages" />
      <AppearanceEditor initial={appearance} />
    </>
  );
}
