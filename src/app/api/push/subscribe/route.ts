import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { getUser } from "@/lib/session";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(200),
  }),
});

export async function POST(request: Request) {
  const user = await getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const parsed = subscriptionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Abonnement invalide" }, { status: 400 });
  }

  const { endpoint, keys } = parsed.data;

  // L'endpoint est unique : un même appareil qui se réabonne remplace son
  // enregistrement au lieu d'en accumuler un par visite.
  await db
    .insert(pushSubscriptions)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
      createdAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const endpoint = new URL(request.url).searchParams.get("endpoint");
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint manquant" }, { status: 400 });
  }

  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, user.id),
        eq(pushSubscriptions.endpoint, endpoint),
      ),
    );

  return NextResponse.json({ ok: true });
}
