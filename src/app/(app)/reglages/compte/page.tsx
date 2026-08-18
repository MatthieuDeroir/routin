import { signOut } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Compte" };

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader title="Compte" back="/reglages" />

      <dl className="space-y-4 px-5">
        <div>
          <dt className="text-muted-foreground text-xs tracking-wide uppercase">
            Connecté en tant que
          </dt>
          <dd className="mt-1 text-[0.9375rem]">
            {user.name}
            {user.email ? (
              <span className="text-muted-foreground"> · {user.email}</span>
            ) : null}
          </dd>
        </div>

        <div>
          <dt className="text-muted-foreground text-xs tracking-wide uppercase">
            Fuseau horaire
          </dt>
          <dd className="mt-1 text-[0.9375rem]">{user.timeZone}</dd>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Il détermine où commence et se termine une journée, donc à quel
            moment vos coches basculent au lendemain.
          </p>
        </div>
      </dl>

      <div className="mt-8 px-5">
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button type="submit" variant="ghost" className="text-muted-foreground">
            Se déconnecter
          </Button>
        </form>
      </div>
    </>
  );
}
