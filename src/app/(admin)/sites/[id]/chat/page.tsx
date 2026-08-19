import { and, eq, gte, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { aiKeys, aiUsage, siteChat, sites } from "@/lib/db/schema";
import { ChatForm } from "./chat-form";

export const dynamic = "force-dynamic";

export default async function SiteChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [site] = await db.select().from(sites).where(eq(sites.id, id));
  if (!site) notFound();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [[chat], keys, [{ used }]] = await Promise.all([
    db.select().from(siteChat).where(eq(siteChat.siteId, id)),
    db.select({ provider: aiKeys.provider }).from(aiKeys),
    db
      .select({ used: sql<number>`count(*) filter (where ${aiUsage.ok})::int` })
      .from(aiUsage)
      .where(and(eq(aiUsage.siteId, id), gte(aiUsage.createdAt, monthStart))),
  ]);

  const limit = chat?.monthlyLimit ?? 500;

  return (
    <div className="space-y-6">
      {chat?.enabled ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
          <span className="text-neutral-600">
            Llamadas este mes: <strong className="text-neutral-900">{used}</strong> de {limit}
          </span>
          {used >= limit ? (
            <span className="text-amber-700">
              Tope alcanzado — el chat sigue funcionando, pero sin preguntas de IA.
            </span>
          ) : null}
          <Link href="/ai" className="ml-auto text-xs text-neutral-500 underline-offset-2 hover:underline">
            Ver llaves y consumo global
          </Link>
        </div>
      ) : null}

      <ChatForm
        siteId={id}
        availableProviders={Array.from(new Set(keys.map((k) => k.provider)))}
        values={{
          enabled: chat?.enabled ?? false,
          replacesForm: chat?.replacesForm ?? false,
          keyMode: chat?.keyMode ?? "platform",
          provider: chat?.provider ?? "anthropic",
          model: chat?.model ?? "",
          ownHint: chat?.ownHint ?? null,
          launcherLabel: chat?.launcherLabel ?? "",
          welcome: chat?.welcome ?? "",
          businessContext: chat?.businessContext ?? "",
          serviceOptions: chat?.serviceOptions ?? [],
          monthlyLimit: limit,
        }}
      />
    </div>
  );
}
