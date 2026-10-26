import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseJson, type Slide } from "@/lib/types";
import { ActionForm } from "@/components/ActionForm";
import { SlideshowPreview, YapperPreview } from "@/components/Previews";
import { TzField } from "@/components/TzField";
import { refreshVideos, schedulePostAction } from "../actions";

const STATUS: Record<string, string> = { QUEUED: "En file", RENDERING: "Rendu en cours", READY: "Prête", FAILED: "Échec" };

// Valeur indicative (heure du serveur) ; l'utilisateur ajuste avant de planifier.
function defaultSlot() {
  const d = new Date(Date.now() + 60 * 60_000);
  d.setMinutes(0, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default async function VideosPage() {
  const user = await requireUser();
  const [videos, accounts] = await Promise.all([
    db.video.findMany({
      where: { workspaceId: user.workspaceId },
      include: { avatar: true, script: true, _count: { select: { posts: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.socialAccount.findMany({ where: { workspaceId: user.workspaceId } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="h1">Vidéos</h1>
        <form action={refreshVideos}><button className="btn-ghost">Actualiser les rendus</button></form>
      </div>
      {videos.length === 0 && <p className="muted">Aucune vidéo. Crée-en une depuis le Studio.</p>}
      <div className="space-y-4">
        {videos.map((v) => (
          <article key={v.id} className="card flex flex-col gap-6 md:flex-row">
            <div className="shrink-0 md:w-auto">
              {v.type === "SLIDESHOW" ? (
                <div className="max-w-sm"><SlideshowPreview slides={parseJson<Slide[]>(v.slidesJson, [])} /></div>
              ) : (
                <YapperPreview url={v.outputUrl} imageUrl={v.avatar?.imageUrl} hook={v.hook} />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge">{v.type === "YAPPER" ? "Yapper" : "Slideshow"}</span>
                <span className="badge">{STATUS[v.status] ?? v.status}</span>
                <span className="muted text-xs">{v.creditsCost} crédits · {v._count.posts} publication(s)</span>
              </div>
              <p className="font-semibold">{v.title}</p>
              {v.avatar && <p className="muted text-sm">Avatar : {v.avatar.name}</p>}
              {v.error && <p className="text-sm text-red-400">{v.error}</p>}
              {v.status !== "FAILED" && (
                accounts.length === 0 ? (
                  <p className="muted text-sm">Connecte un compte TikTok ou Instagram pour planifier.</p>
                ) : (
                  <ActionForm action={schedulePostAction} submitLabel="Planifier" className="space-y-3 border-t pt-3">
                    <input type="hidden" name="videoId" value={v.id} />
                    <TzField />
                    <textarea name="caption" rows={2} className="input" defaultValue={v.script ? `${v.script.caption} ${v.script.hashtags}` : ""} />
                    <div className="flex flex-wrap gap-3">
                      {accounts.map((a) => (
                        <label key={a.id} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="accountId" value={a.id} defaultChecked={a.avatarId === v.avatarId} />
                          {a.platform === "TIKTOK" ? "TikTok" : "Instagram"} @{a.handle}
                        </label>
                      ))}
                    </div>
                    <input type="datetime-local" name="scheduledAt" className="input max-w-xs" defaultValue={defaultSlot()} required />
                  </ActionForm>
                )
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
