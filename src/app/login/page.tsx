import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { getUser } from "@/lib/session";
import { isGoogleAuthConfigured } from "@/lib/env";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Connexion — Routin" };

export default async function LoginPage() {
  if (await getUser()) redirect("/");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Routin</h1>
        <p className="text-muted-foreground text-sm">
          Vos routines, jour après jour.
        </p>
      </div>

      {isGoogleAuthConfigured ? (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <Button type="submit" size="lg" className="w-full">
            Continuer avec Google
          </Button>
        </form>
      ) : (
        <SetupNotice />
      )}
    </main>
  );
}

function SetupNotice() {
  return (
    <div className="border-border bg-muted/40 w-full max-w-md space-y-4 rounded-xl border p-5 text-sm">
      <p className="font-medium">Authentification Google non configurée</p>
      <ol className="text-muted-foreground list-decimal space-y-2 pl-5">
        <li>
          Ouvrez la{" "}
          <a
            className="underline underline-offset-4"
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noreferrer"
          >
            console Google Cloud
          </a>{" "}
          et créez un ID client OAuth 2.0 de type « Application Web ».
        </li>
        <li>
          Ajoutez l’URI de redirection autorisée&nbsp;:
          <code className="bg-background mx-1 rounded px-1.5 py-0.5 text-xs">
            http://localhost:3002/api/auth/callback/google
          </code>
        </li>
        <li>
          Renseignez <code className="text-xs">AUTH_GOOGLE_ID</code> et{" "}
          <code className="text-xs">AUTH_GOOGLE_SECRET</code> dans{" "}
          <code className="text-xs">.env.local</code>, puis relancez le serveur
          de développement.
        </li>
      </ol>
    </div>
  );
}
