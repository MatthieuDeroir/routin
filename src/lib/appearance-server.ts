import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { preferences } from "@/db/schema";
import { getUser } from "@/lib/session";
import {
  APPEARANCE_COOKIE,
  parseAppearance,
  sanitizeAppearance,
  type Appearance,
} from "@/lib/appearance";

/**
 * Résout l'apparence à appliquer au rendu serveur.
 *
 * La ligne de préférence en base fait autorité dès qu'elle existe : c'est ce
 * qui fait apparaître sur un second appareil le réglage choisi sur le premier.
 * Le cookie reste la voie de repli — avant la première connexion, ou pour les
 * pages qui n'exigent pas de session (login) — et continue d'éviter le flash
 * de thème au tout premier rendu.
 */
export const resolveAppearance = cache(async (): Promise<Appearance> => {
  const cookieAppearance = parseAppearance(
    (await cookies()).get(APPEARANCE_COOKIE)?.value,
  );

  const user = await getUser();
  if (!user?.id) return cookieAppearance;

  const [row] = await db
    .select()
    .from(preferences)
    .where(eq(preferences.userId, user.id))
    .limit(1);

  return row ? sanitizeAppearance(row as Partial<Appearance>) : cookieAppearance;
});
