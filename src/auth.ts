import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { env, isGoogleAuthConfigured } from "@/lib/env";

/**
 * Auth.js v5 — sessions en base (et non JWT) : la session est révocable côté
 * serveur et l'identifiant utilisateur vient directement de la base, ce qui
 * simplifie le filtrage par `user_id` dans tout le reste de l'application.
 *
 * Le provider Google n'est branché que s'il est configuré : l'application doit
 * pouvoir démarrer sans identifiants et afficher un écran de configuration,
 * plutôt que de planter à l'import.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database" },
  secret: env.AUTH_SECRET,
  trustHost: true,
  providers: isGoogleAuthConfigured()
    ? [
        Google({
          clientId: env.AUTH_GOOGLE_ID,
          clientSecret: env.AUTH_GOOGLE_SECRET,
          allowDangerousEmailAccountLinking: false,
        }),
      ]
    : [],
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.timeZone =
        (user as { timeZone?: string }).timeZone ?? "Europe/Paris";
      return session;
    },
  },
});
