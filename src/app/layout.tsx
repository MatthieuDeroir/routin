import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Routin", template: "%s — Routin" },
  description: "Vos routines quotidiennes, jour après jour.",
  applicationName: "Routin",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Routin",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

/**
 * `viewportFit: "cover"` + les safe-area-inset du CSS : l'application occupe
 * tout l'écran une fois installée, encoche et barre de geste comprises.
 * Le zoom reste autorisé (jusqu'à x5) — le désactiver casserait l'accessibilité.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col overscroll-y-none">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
