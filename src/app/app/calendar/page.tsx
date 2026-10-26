import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isMockPublishing } from "@/lib/providers/social";
import { cancelPost, runPublisherNow } from "../actions";

const STATUS: Record<string, string> = { SCHEDULED: "Planifié", PUBLISHING: "Publication…", PUBLISHED: "Publié", FAILED: "Échec" };

export default async function CalendarPage() {
  const user = await requireUser();
  const posts = await db.post.findMany({
    where: { workspaceId: user.workspaceId },
    include: { video: true, account: true },
    orderBy: { scheduledAt: "asc" },
    take: 200,
  });

  const byDay = new Map<string, typeof posts>();
  for (const p of posts) {
    const day = p.scheduledAt.toISOString().slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), p]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">Planning</h1>
        <form action={runPublisherNow}>
          <button className="btn-ghost">Publier les posts échus maintenant</button>
        </form>
      </div>
      {isMockPublishing() && (
        <p className="muted text-sm">Mode démo : la publication est simulée. Passe PUBLISH_MODE=live pour publier via les API officielles.</p>
      )}
      {posts.length === 0 && <p className="muted">Rien de planifié. Planifie une vidéo depuis l&apos;onglet Vidéos.</p>}
      {[...byDay.entries()].map(([day, items]) => (
        <section key={day}>
          <h2 className="label mb-2">
            {new Date(day).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
          </h2>
          <div className="space-y-2">
            {items.map((p) => (
              <div key={p.id} className="card flex flex-wrap items-center gap-3 p-4">
                <span className="w-24 text-sm font-semibold">
                  {p.scheduledAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC
                </span>
                <span className="badge">{p.account.platform === "TIKTOK" ? "TikTok" : "Instagram"} @{p.account.handle}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{p.video.title}</span>
                <span className="badge">{STATUS[p.status] ?? p.status}</span>
                {p.error && <span className="w-full text-xs text-red-400">{p.error}</span>}
                {(p.status === "SCHEDULED" || p.status === "FAILED") && (
                  <form action={cancelPost}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="muted text-xs underline">Annuler</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
