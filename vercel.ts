import { type VercelConfig } from "@vercel/config/v1";

/**
 * Configuration du projet.
 *
 * Pas de `crons` ici : le plan Hobby limite les tâches planifiées à **une par
 * jour**, ce qui ne permet pas de rappeler une tâche à son heure. Le
 * déclencheur vit donc dans `.github/workflows/reminders.yml`, qui appelle
 * `/api/cron/reminders` toutes les quinze minutes avec CRON_SECRET.
 *
 * En passant au plan Pro, il suffit de rétablir ici :
 *   crons: [{ path: "/api/cron/reminders", schedule: "*\/15 * * * *" }]
 * et de désactiver le workflow.
 */
export const config: VercelConfig = {
  framework: "nextjs",
};
