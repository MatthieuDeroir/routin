import { type VercelConfig } from "@vercel/config/v1";

/**
 * Rappels programmés.
 *
 * La cadence doit correspondre à `WINDOW_MINUTES` dans
 * `src/app/api/cron/reminders/route.ts` : la fenêtre de rattrapage sert
 * précisément à ne rien manquer entre deux passages. La route est idempotente
 * (une seule notification par tâche et par jour), donc l'appeler plus souvent
 * est sans risque — un déclencheur externe porteur de CRON_SECRET fonctionne
 * aussi bien, si la cadence des crons du plan ne suffit pas.
 */
export const config: VercelConfig = {
  framework: "nextjs",
  crons: [{ path: "/api/cron/reminders", schedule: "*/15 * * * *" }],
};
