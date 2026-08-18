import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Garde d'authentification pour les Server Components et les routes API.
 * L'application n'utilise pas de middleware : avec des sessions en base, la
 * vérification vit là où la donnée est lue, ce qui évite un runtime Edge
 * séparé et garantit qu'aucune requête ne contourne le filtre par utilisateur.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function getUser() {
  const session = await auth();
  return session?.user ?? null;
}
