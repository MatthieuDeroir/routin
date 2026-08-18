import { Wordmark } from "@/components/wordmark";

export const metadata = { title: "Hors ligne" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-muted-foreground mb-2 text-2xl leading-none">
        <Wordmark />
      </p>
      <h1 className="rt-display text-xl">Vous êtes hors ligne</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Cette page n’a pas encore été mise en cache. Vos routines déjà
        consultées restent accessibles, et vos modifications seront synchronisées
        au retour du réseau.
      </p>
    </main>
  );
}
