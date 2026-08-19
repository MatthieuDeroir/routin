"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ACCENTS,
  APPEARANCE_COOKIE,
  DEFAULT_APPEARANCE,
  DENSITIES,
  RADII,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  THEMES,
  appearanceAttributes,
  appearanceStyle,
  serializeAppearance,
  type Appearance,
} from "@/lib/appearance";
import { useStore } from "@/lib/store/store";
import { cn } from "@/lib/utils";

/**
 * Réglages d'apparence.
 *
 * Chaque modification s'applique à l'application entière, immédiatement :
 * l'aperçu, c'est l'application elle-même. Un panneau de prévisualisation
 * séparé mentirait sur le résultat et obligerait à faire l'aller-retour pour
 * vérifier. Un échantillon de liste reste affiché ici pour juger la densité et
 * l'arrondi sans quitter la page.
 */
export function AppearanceEditor({
  initial,
  userId,
}: {
  initial: Appearance;
  userId: string;
}) {
  const [appearance, setAppearance] = useState(initial);
  const { upsertPreference } = useStore();

  useEffect(() => {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(appearanceAttributes(appearance))) {
      root.setAttribute(key, value);
    }
    const style = appearanceStyle(appearance) as Record<string, string>;
    for (const key of ["--primary", "--primary-foreground", "--ring", "--radius"]) {
      if (key in style) root.style.setProperty(key, style[key]);
      else root.style.removeProperty(key);
    }
    root.style.setProperty("--rt-text-scale", String(appearance.textScale));

    // Cache local instantané, pour ce navigateur : évite un flash de thème au
    // prochain chargement sans attendre l'aller-retour réseau.
    document.cookie = `${APPEARANCE_COOKIE}=${serializeAppearance(appearance)}; path=/; max-age=31536000; samesite=lax`;
  }, [appearance]);

  // La persistance entre appareils est débattue légèrement : un curseur (la
  // taille du texte) déclenche ce changement à chaque cran glissé, et envoyer
  // une synchro par cran serait pur gaspillage. Le premier rendu est ignoré :
  // ouvrir la page sans rien changer n'a pas à réémettre ce qui est déjà là.
  const persistTimer = useRef<number | undefined>(undefined);
  const skipFirst = useRef(true);
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      upsertPreference({ id: userId, ...appearance, deletedAt: null });
    }, 400);
    return () => window.clearTimeout(persistTimer.current);
  }, [appearance, userId, upsertPreference]);

  const set = <K extends keyof Appearance>(key: K, value: Appearance[K]) =>
    setAppearance((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-9 px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <Sample />

      <Group label="Thème" hint="Chacun a sa palette, sa typographie et son grain.">
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              aria-pressed={appearance.theme === theme.id}
              onClick={() => set("theme", theme.id)}
              className={cn(
                "rounded-[var(--radius)] border p-3 text-left transition-colors",
                appearance.theme === theme.id
                  ? "border-primary ring-primary/30 ring-2"
                  : "border-input",
              )}
            >
              <span className="flex gap-1">
                {theme.swatch.map((color) => (
                  <span
                    key={color}
                    className="h-5 flex-1 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
              <span className="mt-2 block text-sm font-medium">{theme.name}</span>
            </button>
          ))}
        </div>
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
          {THEMES.find((theme) => theme.id === appearance.theme)?.idea}
        </p>
      </Group>

      <Group label="Éclairage">
        <Segmented
          options={[
            { id: "system", label: "Système" },
            { id: "light", label: "Clair" },
            { id: "dark", label: "Sombre" },
          ]}
          value={appearance.scheme}
          onChange={(value) => set("scheme", value as Appearance["scheme"])}
        />
      </Group>

      <Group label="Couleur d’accent" hint="Celle des coches, des boutons et des anneaux.">
        <div className="flex flex-wrap gap-2">
          <Swatch
            selected={appearance.accent === null}
            onClick={() => set("accent", null)}
            label="Celle du thème"
            color="var(--primary)"
          />
          {ACCENTS.map((accent) => (
            <Swatch
              key={accent.id}
              selected={appearance.accent === accent.id}
              onClick={() => set("accent", accent.id)}
              label={accent.name}
              color={`light-dark(${accent.light}, ${accent.dark})`}
            />
          ))}
        </div>
      </Group>

      <Group label="Arrondi">
        <div className="grid grid-cols-5 gap-2">
          <RadiusChoice
            selected={appearance.radius === null}
            onClick={() => set("radius", null)}
            label="Thème"
            radius="var(--radius)"
          />
          {RADII.map((radius) => (
            <RadiusChoice
              key={radius.id}
              selected={appearance.radius === radius.id}
              onClick={() => set("radius", radius.id)}
              label={radius.name}
              radius={radius.value}
            />
          ))}
        </div>
      </Group>

      <Group label="Densité">
        <Segmented
          options={DENSITIES.map((density) => ({
            id: density.id,
            label: density.name,
          }))}
          value={appearance.density}
          onChange={(value) => set("density", value as Appearance["density"])}
        />
        <p className="text-muted-foreground mt-2 text-xs">
          {DENSITIES.find((density) => density.id === appearance.density)?.hint}
        </p>
      </Group>

      <Group
        label="Taille du texte"
        hint="Multiplie la taille réglée dans votre navigateur, elle ne la remplace pas."
      >
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs">A</span>
          <input
            type="range"
            min={TEXT_SCALE_MIN * 100}
            max={TEXT_SCALE_MAX * 100}
            step={5}
            value={Math.round(appearance.textScale * 100)}
            onChange={(event) => set("textScale", Number(event.target.value) / 100)}
            aria-label="Taille du texte"
            className="accent-[var(--primary)] flex-1"
          />
          <span className="text-muted-foreground text-lg">A</span>
          <span className="rt-num text-muted-foreground w-12 text-right text-xs">
            {Math.round(appearance.textScale * 100)} %
          </span>
        </div>
      </Group>

      <Button
        type="button"
        variant="ghost"
        onClick={() => setAppearance(DEFAULT_APPEARANCE)}
        className="text-muted-foreground"
      >
        Rétablir les valeurs par défaut
      </Button>
    </div>
  );
}

function Group({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-muted-foreground mb-1 text-xs tracking-wide uppercase">
        {label}
      </h2>
      {hint ? (
        <p className="text-muted-foreground mb-2.5 text-xs leading-relaxed">{hint}</p>
      ) : (
        <div className="mb-2.5" />
      )}
      {children}
    </section>
  );
}

/** Échantillon de liste : la densité et l'arrondi ne se jugent que sur des lignes. */
function Sample() {
  return (
    <div className="border-[var(--rt-surface-border)] rounded-[var(--radius)] border border-dashed p-3">
      <p className="text-muted-foreground mb-2 text-[0.6875rem] tracking-wide uppercase">
        ☕ Matin
      </p>
      <ul className="space-y-[var(--rt-list-gap)]">
        {[
          { name: "Étirements", time: "7 h", done: true },
          { name: "Journal", time: null, done: false },
        ].map((item) => (
          <li
            key={item.name}
            className="border-[var(--rt-surface-border)] bg-[var(--rt-surface)] flex items-center gap-3 rounded-[var(--radius)] border px-3 py-[var(--rt-row-py)]"
          >
            <span
              className={cn(
                "grid size-[22px] shrink-0 place-items-center border",
                item.done ? "border-primary bg-primary" : "border-foreground/30",
              )}
              style={{ borderRadius: "var(--rt-check-radius)" }}
            >
              {item.done ? (
                <svg viewBox="0 0 24 24" className="size-[14px]" fill="none">
                  <path
                    d="M4.5 12.5 L9.5 17.5 L19.5 6.5"
                    stroke="var(--primary-foreground)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </span>
            <span
              className={cn(
                "flex-1 text-[0.9375rem]",
                item.done && "text-muted-foreground line-through",
              )}
            >
              {item.name}
            </span>
            {item.time ? (
              <span className="rt-num text-muted-foreground text-xs">{item.time}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="border-input flex gap-1 rounded-[var(--radius)] border p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "flex-1 rounded-[calc(var(--radius)-0.2rem)] px-2 py-1.5 text-sm transition-colors",
            value === option.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Swatch({
  selected,
  onClick,
  label,
  color,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      className={cn(
        "size-10 rounded-full transition-transform",
        selected ? "ring-foreground scale-110 ring-2 ring-offset-2" : "opacity-75",
      )}
      style={{ backgroundColor: color }}
    />
  );
}

function RadiusChoice({
  selected,
  onClick,
  label,
  radius,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  radius: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-[var(--radius)] border px-1 py-2 text-[0.625rem] transition-colors",
        selected ? "border-primary text-foreground" : "border-input text-muted-foreground",
      )}
    >
      <span
        className="bg-primary/70 size-6"
        style={{ borderRadius: radius === "var(--radius)" ? radius : `min(${radius}, 0.75rem)` }}
      />
      {label}
    </button>
  );
}
