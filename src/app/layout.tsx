import type { Metadata, Viewport } from "next";
import {
  Archivo,
  Bricolage_Grotesque,
  DM_Sans,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Karla,
  Sora,
} from "next/font/google";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { appearanceAttributes, appearanceStyle, themeColor } from "@/lib/appearance";
import { resolveAppearance } from "@/lib/appearance-server";
import "./globals.css";

/**
 * « Brume », la direction retenue, est la seule dont les caractères sont
 * préchargés. Les cinq autres restent déclarées pour que /directions continue
 * de fonctionner, mais avec `preload: false` : leurs fichiers ne sont
 * téléchargés que si la direction correspondante est réellement active.
 */
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["500", "600"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], weight: ["400", "500", "700"] });

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], weight: ["600", "700"], preload: false });
const plexSans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin"], weight: ["400", "500", "600"], preload: false });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"], preload: false });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["600", "700"], preload: false });
const karla = Karla({ variable: "--font-karla", subsets: ["latin"], weight: ["400", "500", "600"], preload: false });

const fontVariables = [sora, dmSans, archivo, plexSans, plexMono, bricolage, karla]
  .map((font) => font.variable)
  .join(" ");

export const metadata: Metadata = {
  title: { default: "Routin", template: "%s — Routin" },
  description: "Vos routines quotidiennes, jour après jour.",
  applicationName: "Routin",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Routin", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

/**
 * `viewportFit: "cover"` + les safe-area-inset du CSS : l'application occupe
 * tout l'écran une fois installée, encoche et barre de geste comprises.
 * Le zoom reste autorisé (jusqu'à x5) — le désactiver casserait l'accessibilité.
 *
 * La couleur de barre suit le thème choisi, d'où la lecture du cookie ici :
 * une barre système figée sur une autre palette se voit immédiatement.
 */
export async function generateViewport(): Promise<Viewport> {
  const appearance = await resolveAppearance();

  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    viewportFit: "cover",
    themeColor: themeColor(appearance),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const appearance = await resolveAppearance();

  return (
    <html
      lang="fr"
      {...appearanceAttributes(appearance)}
      style={appearanceStyle(appearance)}
      className={`${fontVariables} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col overscroll-y-none">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
