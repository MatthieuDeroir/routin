import { cn } from "@/lib/utils";

/**
 * Logotype de Routin.
 *
 * Le « i » est dessiné plutôt que composé : c'est le seul moyen de teindre son
 * point et son bâton séparément. Ses proportions sont calées sur celles de la
 * fonte d'affichage (hauteur d'x, chasse, épaisseur du fût) et exprimées en em,
 * pour que le mot reste homogène à n'importe quelle taille.
 *
 * Le même « i » sert d'icône d'application : la marque tient dans une lettre.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn("rt-display inline-flex items-baseline whitespace-nowrap", className)}
    >
      <span>Rout</span>
      <IGlyph />
      <span>n</span>
    </span>
  );
}

/** Le « i » de Routin : point rouge, bâton jaune. */
export function IGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 26 100"
      role="img"
      aria-label="i"
      className={cn("mx-[0.015em] inline-block h-[1em] w-[0.26em]", className)}
      style={{ verticalAlign: "baseline" }}
    >
      <circle cx="13" cy="31" r="8" fill="var(--rt-mark-dot, #e04b33)" />
      <rect
        x="6.5"
        y="47"
        width="13"
        height="53"
        rx="2.5"
        fill="var(--rt-mark-stem, #f2b32e)"
      />
    </svg>
  );
}
