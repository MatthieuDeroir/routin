import Link from "next/link";
import { cookies } from "next/headers";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { THEME_COOKIE, resolveTheme } from "@/lib/theme";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Directions visuelles" };

/**
 * Les directions écartées ne sont pas supprimées : elles vivent ici, hors du
 * chemin quotidien. Revenir en arrière ou comparer reste possible sans avoir
 * à ressortir du code d'un commit.
 */
export default async function DirectionsPage() {
  await requireUser();
  const current = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <h1 className="rt-display text-2xl leading-tight">Directions visuelles</h1>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        « Brume » est la direction retenue. Les cinq autres restent disponibles
        pour comparaison : le choix s’applique à toute l’application.
      </p>

      <ThemeSwitcher current={current} />

      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mt-6 text-sm underline underline-offset-4"
      >
        Retour à la journée
      </Link>
    </main>
  );
}
