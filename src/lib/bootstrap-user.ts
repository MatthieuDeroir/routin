import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { routines } from "@/db/schema";
import { ALL_DAYS } from "@/lib/domain";

/**
 * Découpage de journée par défaut, posé au premier chargement d'un compte.
 *
 * Sans routines, l'écran d'accueil d'un nouveau compte est vide et le premier
 * geste attendu serait d'aller définir des blocs — ce que personne n'a envie de
 * faire avant même d'avoir vu l'application. Ces six blocs se renomment, se
 * réordonnent et se suppriment.
 */
const DEFAULT_ROUTINES = [
  { name: "Réveil", emoji: "🌅", color: "#8a7a4e" },
  { name: "Matin", emoji: "☕", color: "#46605a" },
  { name: "Midi", emoji: "🍽️", color: "#3f6b8f" },
  { name: "Après-midi", emoji: "🌤️", color: "#7a5b8c" },
  { name: "Soir", emoji: "🌙", color: "#a8564a" },
  { name: "Nuit", emoji: "🌌", color: "#5f7a45" },
];

export async function ensureUserDefaults(userId: string): Promise<void> {
  const existing = await db
    .select({ id: routines.id })
    .from(routines)
    .where(eq(routines.userId, userId))
    .limit(1);

  // On regarde même les routines supprimées : un compte qui a délibérément tout
  // effacé ne doit pas voir la configuration par défaut revenir au rechargement.
  if (existing.length > 0) return;

  const now = Date.now();
  await db.insert(routines).values(
    DEFAULT_ROUTINES.map((routine, index) => ({
      ...routine,
      id: crypto.randomUUID(),
      userId,
      daysMask: ALL_DAYS,
      position: index,
      updatedAt: now,
      deletedAt: null,
    })),
  );
}
