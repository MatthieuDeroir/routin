import Link from "next/link";

/** En-tête commun aux écrans secondaires : un retour, un titre, une action. */
export function PageHeader({
  title,
  back = "/",
  action,
}: {
  title: string;
  back?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-center gap-3 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4">
      <Link
        href={back}
        aria-label="Retour"
        className="text-muted-foreground hover:text-foreground -ml-2 grid size-9 shrink-0 place-items-center rounded-full"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
          <path
            d="M15 5 L8 12 L15 19"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
      <h1 className="rt-display flex-1 truncate text-xl leading-tight">{title}</h1>
      {action}
    </header>
  );
}
