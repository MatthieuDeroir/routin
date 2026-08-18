import Link from "next/link";
import { cookies } from "next/headers";
import { PageHeader } from "@/components/page-header";
import { APPEARANCE_COOKIE, THEMES, parseAppearance } from "@/lib/appearance";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Réglages" };

export default async function SettingsPage() {
  const user = await requireUser();
  const appearance = parseAppearance((await cookies()).get(APPEARANCE_COOKIE)?.value);
  const theme = THEMES.find((item) => item.id === appearance.theme);

  const entries = [
    {
      href: "/reglages/apparence" as const,
      label: "Apparence",
      value: `${theme?.name} · ${
        { system: "système", light: "clair", dark: "sombre" }[appearance.scheme]
      }`,
    },
    {
      href: "/routines" as const,
      label: "Routines et tâches",
      value: "Blocs de la journée, jours actifs, directives",
    },
    {
      href: "/reglages/rappels" as const,
      label: "Rappels",
      value: "Relances quand la journée avance sans vous",
    },
    {
      href: "/reglages/compte" as const,
      label: "Compte",
      value: user.email ?? "Connecté",
    },
  ];

  return (
    <>
      <PageHeader title="Réglages" />
      <ul className="divide-y divide-[var(--rt-surface-border)] border-y border-[var(--rt-surface-border)]">
        {entries.map((entry) => (
          <li key={entry.href}>
            <Link
              href={entry.href}
              className="hover:bg-accent/50 flex items-center gap-3 px-5 py-4"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9375rem]">{entry.label}</span>
                <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                  {entry.value}
                </span>
              </span>
              <svg viewBox="0 0 24 24" className="text-muted-foreground size-4 shrink-0" fill="none" aria-hidden>
                <path
                  d="M9 5 L16 12 L9 19"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
