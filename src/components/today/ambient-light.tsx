"use client";

/**
 * Couche d'ambiance de la direction « Lumière » : le fond de la page prend la
 * couleur du ciel à l'heure affichée. Les paliers sont choisis sur les
 * basculements réels de la lumière — pas sur les moments de l'utilisateur, qui
 * eux sont arbitraires.
 */
const SKIES: { until: number; light: [string, string]; dark: [string, string] }[] = [
  { until: 5 * 60, light: ["#c8d3e8", "#e4dce8"], dark: ["#0d1220", "#161a2c"] },
  { until: 8 * 60, light: ["#d7e0f0", "#f7e4d4"], dark: ["#131a2c", "#2a2436"] },
  { until: 12 * 60, light: ["#e6f0f8", "#fbfcfa"], dark: ["#141b2a", "#1b2334"] },
  { until: 17 * 60, light: ["#eef5f7", "#fdfcf7"], dark: ["#151c2b", "#1d2536"] },
  { until: 20 * 60, light: ["#f8ecdb", "#efdfd2"], dark: ["#1e1c2c", "#2a2130"] },
  { until: 24 * 60, light: ["#d5d3e6", "#c2c3dc"], dark: ["#0f1220", "#171a2a"] },
];

export function AmbientLight({ minute }: { minute: number }) {
  const sky = SKIES.find((entry) => minute < entry.until) ?? SKIES[SKIES.length - 1];

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 transition-[background-image] duration-1000"
      style={
        {
          backgroundImage: `linear-gradient(175deg, ${sky.light[0]} 0%, ${sky.light[1]} 100%)`,
          "--sky-dark-a": sky.dark[0],
          "--sky-dark-b": sky.dark[1],
        } as React.CSSProperties
      }
      data-ambient
    />
  );
}
