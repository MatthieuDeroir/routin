"use client";

import { cn } from "@/lib/utils";

/**
 * Champs de formulaire écrits à la main plutôt qu'importés : ils doivent suivre
 * les jetons de la direction visuelle (rayon, surface, bordure) au même titre
 * que le reste, et les contrôles natifs suffisent largement ici.
 */
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="text-muted-foreground block text-xs">{hint}</span>
      ) : null}
    </label>
  );
}

const controlClass =
  "border-input bg-[var(--rt-surface)] text-foreground placeholder:text-muted-foreground/70 " +
  "focus-visible:ring-ring w-full rounded-[var(--radius)] border px-3 py-2.5 text-[0.9375rem] " +
  "focus-visible:ring-2 focus-visible:outline-none";

export function TextInput(props: React.ComponentProps<"input">) {
  return <input {...props} className={cn(controlClass, props.className)} />;
}

export function TextArea(props: React.ComponentProps<"textarea">) {
  return (
    <textarea
      rows={3}
      {...props}
      className={cn(controlClass, "resize-y", props.className)}
    />
  );
}

export function Select(props: React.ComponentProps<"select">) {
  return (
    <select {...props} className={cn(controlClass, "appearance-none", props.className)} />
  );
}

/** Barre d'actions collée en bas, au-dessus de la zone sûre du téléphone. */
export function FormActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-[var(--rt-surface-border)] bg-background sticky bottom-0 mt-8 flex gap-3 border-t px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {children}
    </div>
  );
}
