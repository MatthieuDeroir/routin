export const metadata = { title: "Hors ligne" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold">Vous êtes hors ligne</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Cette page n’a pas encore été mise en cache. Vos routines déjà
        consultées restent accessibles, et vos modifications seront synchronisées
        au retour du réseau.
      </p>
    </main>
  );
}
