import "server-only";
import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { isPushConfigured } from "@/lib/env";

let configured = false;

function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contact@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  );
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Envoie une notification à tous les appareils d'un utilisateur.
 *
 * Un abonnement révoqué par le navigateur répond 404 ou 410 : on le supprime
 * plutôt que de le retenter à chaque rappel, sinon la table se remplit
 * d'appareils morts qui ralentissent chaque envoi.
 */
export async function sendToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  if (!isPushConfigured()) return { sent: 0, removed: 0 };
  configure();

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  let sent = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
        );
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
          removed += 1;
        } else {
          console.error("[routin] envoi push impossible", status, error);
        }
      }
    }),
  );

  return { sent, removed };
}
