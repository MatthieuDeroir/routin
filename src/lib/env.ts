import "server-only";
import { z } from "zod";

/**
 * Validation des variables d'environnement serveur, évaluée **à la demande**.
 *
 * Elle l'était auparavant à l'import, ce qui faisait échouer le build dès la
 * collecte des pages quand un secret d'exécution manquait. Un build ne doit
 * pas exiger les secrets d'exécution : la validation appartient à la première
 * requête qui a réellement besoin de la variable.
 *
 * Les identifiants Google et les clés VAPID restent optionnels : l'application
 * démarre sans eux et affiche un écran de configuration explicite.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "requis (file:./local.db en local, libsql://… en production)"),
  DATABASE_AUTH_TOKEN: z.string().optional(),

  AUTH_SECRET: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),

  CRON_SECRET: z.string().optional(),
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

function load(): Env {
  if (cached) return cached;

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
      .map((issue) => `  - ${issue.path.join(".")} : ${issue.message}`)
      .join("\n");
    throw new Error(
      `Variables d'environnement invalides :\n${details}\n\n` +
        "En local : copiez .env.example en .env.local et complétez-le.\n" +
        "En production : `vercel env add <NOM>`.",
    );
  }

  cached = parsed.data;
  return cached;
}

export const env = {
  get DATABASE_URL() {
    return load().DATABASE_URL;
  },
  get DATABASE_AUTH_TOKEN() {
    return process.env.DATABASE_AUTH_TOKEN || undefined;
  },
  get AUTH_SECRET() {
    return process.env.AUTH_SECRET;
  },
  get AUTH_GOOGLE_ID() {
    return process.env.AUTH_GOOGLE_ID;
  },
  get AUTH_GOOGLE_SECRET() {
    return process.env.AUTH_GOOGLE_SECRET;
  },
  get VAPID_PRIVATE_KEY() {
    return process.env.VAPID_PRIVATE_KEY;
  },
  get VAPID_SUBJECT() {
    return process.env.VAPID_SUBJECT;
  },
  get CRON_SECRET() {
    return process.env.CRON_SECRET;
  },
};

/** L'authentification Google est-elle configurable en l'état ? */
export function isGoogleAuthConfigured(): boolean {
  return Boolean(
    process.env.AUTH_SECRET &&
      process.env.AUTH_GOOGLE_ID &&
      process.env.AUTH_GOOGLE_SECRET,
  );
}

/** Les notifications push sont-elles configurables en l'état ? */
export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}
