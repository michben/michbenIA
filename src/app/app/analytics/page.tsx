import { requireUser } from "@/lib/auth";
import { getAnalytics, type AnalyticsRow } from "@/lib/services";

const pct = (n: number) => `${(n * 100).toFixed(1)} %`;
const num = (n: number) => n.toLocaleString("fr-FR");

function Table({ title, rows }: { title: string; rows: AnalyticsRow[] }) {
  return (
    <div className="card overflow-x-auto">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="muted text-sm">Pas encore de données.</p>
      ) : (
        <table className="data-table w-full text-sm">
          <thead className="muted text-left text-xs uppercase">
            <tr><th>Nom</th><th className="whitespace-nowrap text-right">Posts</th><th className="whitespace-nowrap text-right">Vues</th><th className="whitespace-nowrap text-right">Engagement</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="py-2">{r.label}</td>
                <td className="py-2 text-right tabular-nums">{r.posts}</td>
                <td className="py-2 text-right tabular-nums">{num(r.views)}</td>
                <td className="py-2 text-right tabular-nums">{pct(r.engagement)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default async function AnalyticsPage() {
  const user = await requireUser();
  const a = await getAnalytics(user.workspaceId);
  return (
    <div className="space-y-6">
      <h1 className="h1">Analytics</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card"><p className="label">Posts publiés</p><p className="text-2xl font-black tabular-nums">{a.totals.posts}</p></div>
        <div className="card"><p className="label">Vues</p><p className="text-2xl font-black tabular-nums">{num(a.totals.views)}</p></div>
        <div className="card"><p className="label">Engagement moyen</p><p className="text-2xl font-black tabular-nums">{pct(a.totals.engagement)}</p></div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Table title="Par avatar" rows={a.byAvatar} />
        <Table title="Par compte" rows={a.byAccount} />
        <Table title="Par format" rows={a.byFormat} />
      </div>
      <div className="card overflow-x-auto">
        <h2 className="mb-3 font-semibold">Meilleurs hooks</h2>
        {a.topPosts.length === 0 ? (
          <p className="muted text-sm">Publie des vidéos pour voir quels hooks performent.</p>
        ) : (
          <table className="data-table w-full text-sm">
            <tbody>
              {a.topPosts.map((p) => (
                <tr key={p.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="py-2">{p.hook}</td>
                  <td className="py-2 text-right tabular-nums">{num(p.views)} vues</td>
                  <td className="py-2 text-right tabular-nums">{pct(p.engagement)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
