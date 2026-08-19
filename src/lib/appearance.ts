import type { CSSProperties } from "react";

/**
 * Préférences d'apparence.
 *
 * Elles vivent dans un cookie plutôt que dans le magasin local : le serveur
 * doit pouvoir les appliquer au premier rendu. Un réglage lu côté client
 * seulement produirait un flash de thème par défaut à chaque chargement.
 */

export const THEMES = [
  {
    id: "brume",
    name: "Brume",
    idea: "Ni carte ni bordure, presque pas de couleur : le contraste passe par l’échelle typographique et le blanc.",
    swatch: ["#f2f4f2", "#46605a", "#8a7a4e"],
  },
  {
    id: "cadran",
    name: "Cadran",
    idea: "La journée comme un instrument : rail gradué, heures tabulaires, repère « maintenant » en temps réel.",
    swatch: ["#f5f7f9", "#24316d", "#c8761c"],
  },
  {
    id: "lumiere",
    name: "Lumière",
    idea: "Le fond prend la couleur du ciel à l’heure qu’il est. Les sections sont des strates de verre dépoli.",
    swatch: ["#e8eef5", "#2f4a6d", "#c9762e"],
  },
  {
    id: "carnet",
    name: "Carnet",
    idea: "Papier quadrillé : grille de points, coche tracée à l’encre, crayon rouge pour le jour même.",
    swatch: ["#edf1f3", "#1b3a4b", "#ad3f2d"],
  },
  {
    id: "sequenceur",
    name: "Séquenceur",
    idea: "La grammaire d’un séquenceur : chaque moment est une piste, chaque tâche un pas qui s’allume.",
    swatch: ["#17161d", "#62e0b0", "#f2b950"],
  },
  {
    id: "riso",
    name: "Riso",
    idea: "Deux encres sur papier : outremer et orange fluo, trame de points, ombres portées franches.",
    swatch: ["#f4f1e9", "#2b31a8", "#ff5b1f"],
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

/**
 * Couleurs d'accent. Chaque valeur porte sa variante claire et sombre : en
 * mode clair l'accent est foncé et le texte posé dessus est blanc, en mode
 * sombre c'est l'inverse — d'où un `--primary-foreground` commun à tous.
 */
export const ACCENTS = [
  { id: "ambre", name: "Ambre", light: "#8a6a1f", dark: "#dcae55" },
  { id: "terre", name: "Terre", light: "#a1512f", dark: "#e08a63" },
  { id: "foret", name: "Forêt", light: "#2f6b4f", dark: "#7fc4a1" },
  { id: "ocean", name: "Océan", light: "#2b5b8a", dark: "#86b6e0" },
  { id: "prune", name: "Prune", light: "#6b4a7a", dark: "#c3a2d4" },
  { id: "framboise", name: "Framboise", light: "#a63a5a", dark: "#e690a8" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

export const RADII = [
  { id: "net", name: "Net", value: "0rem" },
  { id: "leger", name: "Léger", value: "0.25rem" },
  { id: "doux", name: "Doux", value: "0.75rem" },
  { id: "rond", name: "Rond", value: "1.25rem" },
] as const;

export type RadiusId = (typeof RADII)[number]["id"];

export const DENSITIES = [
  { id: "compact", name: "Compacte", hint: "Plus de tâches à l’écran" },
  { id: "normal", name: "Normale", hint: "L’équilibre par défaut" },
  { id: "large", name: "Aérée", hint: "Plus d’air entre les lignes" },
] as const;

export type DensityId = (typeof DENSITIES)[number]["id"];

export type SchemeId = "system" | "light" | "dark";

export const TEXT_SCALE_MIN = 0.85;
export const TEXT_SCALE_MAX = 1.3;

export interface Appearance {
  theme: ThemeId;
  scheme: SchemeId;
  /** `null` = la couleur du thème, non surchargée. */
  accent: AccentId | null;
  /** `null` = l’arrondi du thème. */
  radius: RadiusId | null;
  density: DensityId;
  textScale: number;
}

export const DEFAULT_APPEARANCE: Appearance = {
  theme: "brume",
  scheme: "system",
  accent: null,
  radius: null,
  density: "normal",
  textScale: 1,
};

export const APPEARANCE_COOKIE = "routin-apparence";

const has = <T extends { id: string }>(list: readonly T[], value: unknown) =>
  list.some((item) => item.id === value);

/**
 * Tolérante par construction : une valeur corrompue ou d'origine inconnue
 * (cookie abîmé, ligne de préférence écrite par une version antérieure)
 * retombe sur les défauts plutôt que de faire échouer tout le rendu.
 */
export function sanitizeAppearance(parsed: Partial<Appearance>): Appearance {
  const scale = Number(parsed.textScale);

  return {
    theme: has(THEMES, parsed.theme)
      ? (parsed.theme as ThemeId)
      : DEFAULT_APPEARANCE.theme,
    scheme: (["system", "light", "dark"] as const).includes(
      parsed.scheme as SchemeId,
    )
      ? (parsed.scheme as SchemeId)
      : DEFAULT_APPEARANCE.scheme,
    accent: has(ACCENTS, parsed.accent) ? (parsed.accent as AccentId) : null,
    radius: has(RADII, parsed.radius) ? (parsed.radius as RadiusId) : null,
    density: has(DENSITIES, parsed.density)
      ? (parsed.density as DensityId)
      : DEFAULT_APPEARANCE.density,
    textScale: Number.isFinite(scale)
      ? Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, scale))
      : 1,
  };
}

/** Tolérant par construction : un cookie corrompu retombe sur les défauts. */
export function parseAppearance(raw: string | undefined | null): Appearance {
  if (!raw) return DEFAULT_APPEARANCE;

  try {
    return sanitizeAppearance(JSON.parse(decodeURIComponent(raw)));
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function serializeAppearance(appearance: Appearance): string {
  return encodeURIComponent(JSON.stringify(appearance));
}

export function appearanceAttributes(appearance: Appearance) {
  return {
    "data-theme": appearance.theme,
    "data-scheme": appearance.scheme,
    "data-density": appearance.density,
  } as const;
}

/**
 * Surcharges appliquées en style inline sur `<html>` : elles l'emportent sur
 * les jetons du thème, et n'existent que pour ce que l'utilisateur a réglé.
 */
export function appearanceStyle(appearance: Appearance): CSSProperties {
  const style: Record<string, string> = {
    "--rt-text-scale": String(appearance.textScale),
  };

  const accent = ACCENTS.find((item) => item.id === appearance.accent);
  if (accent) {
    style["--primary"] = `light-dark(${accent.light}, ${accent.dark})`;
    style["--primary-foreground"] = "light-dark(#ffffff, #12161a)";
    style["--ring"] = `light-dark(${accent.light}, ${accent.dark})`;
  }

  const radius = RADII.find((item) => item.id === appearance.radius);
  if (radius) style["--radius"] = radius.value;

  return style as CSSProperties;
}

/** Couleur de la barre de navigation du navigateur, accordée au thème. */
export function themeColor(appearance: Appearance): string {
  const theme = THEMES.find((item) => item.id === appearance.theme);
  return theme?.swatch[0] ?? "#f2f4f2";
}
