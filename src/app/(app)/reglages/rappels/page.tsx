import { PageHeader } from "@/components/page-header";
import { PushToggle } from "@/components/push-toggle";

export const metadata = { title: "Rappels" };

export default function RemindersPage() {
  return (
    <>
      <PageHeader title="Rappels" back="/reglages" />
      <PushToggle publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
    </>
  );
}
