import "server-only";
import { z } from "zod";

/**
 * Validation des variables d'environnement serveur.
 *
 * Les identifiants Google et les clés VAPID sont volontairement *optionnels* :
 * l'application doit pouvoir démarrer sans eux et afficher un écran de
 * configuration explicite, plutôt que de planter au boot pendant le setup.
 * Les fonctionnalités concernées vérifient leur propre disponibilité.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),
  DATABASE_AUTH_TOKEN: z.string().optional(),

  AUTH_SECRET: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),

  CRON_SECRET: z.string().optional(),
});

const parsed = schema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  CRON_SECRET: process.env.CRON_SECRET,
});

if (!parsed.success) {
  const details = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(
    `Variables d'environnement invalides :\n${details}\n\nCopiez .env.example en .env.local et complétez-le.`,
  );
}

export const env = parsed.data;

/** L'authentification Google est-elle configurable en l'état ? */
export const isGoogleAuthConfigured = Boolean(
  env.AUTH_SECRET && env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET,
);

/** Les notifications push sont-elles configurables en l'état ? */
export const isPushConfigured = Boolean(
  env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY,
);
