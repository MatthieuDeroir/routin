import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/session";

/**
 * Écran « Aujourd'hui » — coquille provisoire.
 * La vue réelle (sections par moment, swipe entre les jours) arrive au lot 5,
 * une fois la direction visuelle arrêtée.
 */
export default async function HomePage() {
  const user = await requireUser();

  const today = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: user.timeZone,
  }).format(new Date());

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-10">
      <header className="space-y-1">
        <p className="text-muted-foreground text-sm">Bonjour {user.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight first-letter:uppercase">
          {today}
        </h1>
      </header>

      <div className="border-border text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
        Aucune routine pour l’instant. La vue du jour arrive au lot 5.
      </div>

      <form
        className="mt-auto"
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button type="submit" variant="ghost" size="sm">
          Se déconnecter
        </Button>
      </form>
    </main>
  );
}
