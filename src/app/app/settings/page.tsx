import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/credits";
import type { Plan } from "@/lib/types";
import { ActionForm } from "@/components/ActionForm";
import { addInspiration, createApiKeyAction, revokeApiKey } from "../actions";

export default async function SettingsPage() {
  const user = await requireUser();
  const [keys, ledger, inspirations] = await Promise.all([
    db.apiKey.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { createdAt: "desc" } }),
    db.creditLedger.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { createdAt: "desc" }, take: 15 }),
    db.inspiration.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { createdAt: "desc" } }),
  ]);
  const plan = PLANS[user.workspace.plan as Plan] ?? PLANS.FREE;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card space-y-4">
        <h2 className="font-semibold">Plan et crédits</h2>
        <p className="text-sm">Plan <b>{plan.label}</b> · {user.workspace.credits.toLocaleString("fr-FR")} crédits restants</p>
        <ul className="space-y-1 text-sm">
          {ledger.map((l) => (
            <li key={l.id} className="flex justify-between">
              <span className="muted">{l.reason}</span>
              <span className={l.delta < 0 ? "text-red-300" : "text-emerald-300"}>{l.delta > 0 ? "+" : ""}{l.delta}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Clés API</h2>
        <ul className="space-y-2 text-sm">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center justify-between gap-2">
              <span>{k.name} <code className="muted">{k.prefix}…</code></span>
              <form action={revokeApiKey}><input type="hidden" name="id" value={k.id} /><button className="muted text-xs underline">Révoquer</button></form>
            </li>
          ))}
        </ul>
        <ActionForm action={createApiKeyAction} submitLabel="Créer une clé" showOkAsCode>
          <input name="name" className="input" placeholder="Nom de la clé (ex. Zapier)" />
        </ActionForm>
        <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 text-xs">{`curl -X POST ${appUrl}/api/v1/scripts \\
  -H "Authorization: Bearer mb_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"format":"YAPPER","product":"…","audience":"…"}'`}</pre>
      </section>

      <section className="card space-y-4 lg:col-span-2">
        <h2 className="font-semibold">Comptes d&apos;inspiration ({inspirations.length}/{plan.inspirations})</h2>
        <p className="muted text-sm">Suis des comptes qui performent dans ta niche, puis réplique leurs formats depuis le Studio.</p>
        <ul className="space-y-1 text-sm">
          {inspirations.map((i) => (
            <li key={i.id}><a href={i.url} className="underline" target="_blank" rel="noreferrer">{i.url}</a>{i.notes ? <span className="muted"> · {i.notes}</span> : null}</li>
          ))}
        </ul>
        {inspirations.length < plan.inspirations ? (
          <ActionForm action={addInspiration} submitLabel="Ajouter" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input name="url" className="input" placeholder="https://www.tiktok.com/@compte" required />
            <input name="notes" className="input" placeholder="Pourquoi ce compte ?" />
          </ActionForm>
        ) : (
          <p className="muted text-sm">Limite de ton plan atteinte.</p>
        )}
      </section>
    </div>
  );
}
