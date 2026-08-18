export const THEMES = [
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
    idea: "La grammaire d’un séquenceur de musique : chaque moment est une piste, chaque tâche un pas, et un pas validé s’allume. Sombre, monospacé, calé sur une grille serrée.",
  },
  {
    id: "riso",
    name: "Riso",
    idea: "Deux encres sur du papier : outremer et orange fluo, trame de points visible, capitales condensées, ombres portées franches. L’énergie d’un objet imprimé.",
  },
  {
    id: "brume",
    name: "Brume",
    idea: "Le pôle opposé : ni carte, ni bordure, presque pas de couleur. Le contraste passe par l’échelle typographique et le blanc.",
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
