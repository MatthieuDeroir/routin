export const THEMES = [
  {
    id: "brume",
    name: "Brume",
    idea: "Direction retenue. Ni carte, ni bordure, presque pas de couleur : le contraste passe par l’échelle typographique et le blanc.",
  },
  {
    id: "cadran",
    name: "Cadran",
    idea: "La journée comme un instrument : rail gradué, heures tabulaires, repère « maintenant » qui descend en temps réel.",
  },
  {
    id: "lumiere",
    name: "Lumière",
    idea: "Le fond prend la couleur du ciel à l’heure qu’il est, de l’aube à la nuit. Les sections sont des strates de verre dépoli.",
  },
  {
    id: "carnet",
    name: "Carnet",
    idea: "Un carnet de suivi sur papier quadrillé : grille de points, coche tracée à l’encre, crayon rouge pour le jour même.",
  },
  {
    id: "sequenceur",
    name: "Séquenceur",
    idea: "La grammaire d’un séquenceur de musique : chaque moment est une piste, chaque tâche un pas qui s’allume. Sombre, monospacé, grille serrée.",
  },
  {
    id: "riso",
    name: "Riso",
    idea: "Deux encres sur papier : outremer et orange fluo, trame de points, capitales condensées, ombres portées franches.",
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

/** Direction retenue. Les autres restent disponibles depuis /directions. */
export const DEFAULT_THEME: ThemeId = "brume";
export const THEME_COOKIE = "routin-direction";

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export function resolveTheme(value: unknown): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME;
}
