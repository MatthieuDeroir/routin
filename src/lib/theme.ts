export const THEMES = [
  {
    id: "cadran",
    name: "Cadran",
    idea: "La journée comme un instrument : rail gradué, heures tabulaires, repère « maintenant » qui descend en temps réel.",
  },
  {
    id: "lumiere",
    name: "Lumière",
    idea: "Le fond prend la couleur du moment en cours, de l’aube à la nuit. Les sections sont des strates de verre dépoli.",
  },
  {
    id: "carnet",
    name: "Carnet",
    idea: "Un carnet de suivi sur papier quadrillé : grille de points, coche tracée à l’encre, crayon rouge pour le jour même.",
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "cadran";
export const THEME_COOKIE = "routin-direction";

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export function resolveTheme(value: unknown): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME;
}
