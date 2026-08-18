import { PageHeader } from "@/components/page-header";
import { MomentsEditor } from "@/components/routines/moments-editor";

export const metadata = { title: "Moments de la journée" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Moments de la journée" />
      <MomentsEditor />
    </>
  );
}
