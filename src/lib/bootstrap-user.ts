import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dayMoments } from "@/db/schema";

/**
 * Découpage de journée par défaut, posé au premier chargement d'un compte.
 *
 * Sans moments, une tâche horodatée n'appartient à aucune section et l'écran
 * d'accueil d'un nouveau compte est vide : le premier geste attendu serait
 * d'aller configurer des bornes horaires, ce que personne n'a envie de faire
 * avant même d'avoir vu l'application. Ces cinq blocs sont modifiables et
 * supprimables dans les réglages.
 */
const DEFAULT_MOMENTS = [
  { name: "Réveil", emoji: "🌅", startMinute: 0, endMinute: 480 },
  { name: "Matin", emoji: "☕", startMinute: 480, endMinute: 720 },
  { name: "Midi", emoji: "🍽️", startMinute: 720, endMinute: 840 },
  { name: "Après-midi", emoji: "🌤️", startMinute: 840, endMinute: 1140 },
  { name: "Soir", emoji: "🌙", startMinute: 1140, endMinute: 1440 },
];

export async function ensureUserDefaults(userId: string): Promise<void> {
  const existing = await db
    .select({ id: dayMoments.id })
    .from(dayMoments)
    .where(eq(dayMoments.userId, userId))
    .limit(1);

  // On regarde même les moments supprimés : un compte qui a délibérément tout
  // effacé ne doit pas voir la configuration par défaut revenir au rechargement.
  if (existing.length > 0) return;

  const now = Date.now();
  await db.insert(dayMoments).values(
    DEFAULT_MOMENTS.map((moment, index) => ({
      ...moment,
      id: crypto.randomUUID(),
      userId,
      position: index,
      updatedAt: now,
      deletedAt: null,
    })),
  );
}
