import { PageHeader } from "@/components/page-header";
import { PushToggle } from "@/components/push-toggle";
import { MomentsEditor } from "@/components/routines/moments-editor";

export const metadata = { title: "Réglages" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Moments de la journée" />
      <MomentsEditor />
      <PushToggle
        publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
      />
    </>
  );
}
