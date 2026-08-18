import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

const DEMO_USER_ID = "demo-user";
const SESSION_COOKIE = "authjs.session-token";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Connexion de développement, pour travailler l'interface avant que les
 * identifiants Google ne soient disponibles.
 *
 * Double garde volontaire : la route disparaît en production ET refuse de
 * fonctionner sur autre chose qu'une base locale. Une seule de ces conditions
 * suffirait à protéger, mais une erreur de configuration ne doit pas suffire à
 * ouvrir une session sur des données réelles.
 */
export async function GET() {
  const isLocalDatabase = (process.env.DATABASE_URL ?? "").startsWith("file:");
  if (process.env.NODE_ENV === "production" || !isLocalDatabase) {
    return new NextResponse("Not found", { status: 404 });
  }

  const demoUser = await db.query.users.findFirst({
    where: eq(users.id, DEMO_USER_ID),
  });

  if (!demoUser) {
    return NextResponse.json(
      { error: "Utilisateur de démonstration absent. Lancez `pnpm db:seed`." },
      { status: 409 },
    );
  }

  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + THIRTY_DAYS_MS);

  await db.insert(sessions).values({
    sessionToken,
    userId: DEMO_USER_ID,
    expires,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });

  return NextResponse.redirect(new URL("/", process.env.NEXTAUTH_URL ?? "http://localhost:3002"));
}
