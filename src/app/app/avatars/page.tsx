import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActionForm } from "@/components/ActionForm";
import { createAvatar, deleteAvatar } from "../actions";

export default async function AvatarsPage() {
  const user = await requireUser();
  const avatars = await db.avatar.findMany({
    where: { workspaceId: user.workspaceId },
    include: { _count: { select: { videos: true, socialAccounts: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <section>
        <h1 className="h1 mb-6">Avatars IA</h1>
        {avatars.length === 0 && <p className="muted">Aucun avatar pour l&apos;instant. Crée ton premier créateur virtuel.</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          {avatars.map((a) => (
            <div key={a.id} className="card flex gap-4">
              <div
                className="h-24 w-20 shrink-0 rounded-xl bg-cover bg-center"
                style={{ backgroundImage: a.imageUrl ? `url(${a.imageUrl})` : "linear-gradient(160deg,#ff4f7b,#7c5cff)" }}
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{a.name}</p>
                <p className="muted text-xs">{a.niche} · {a.language.toUpperCase()}</p>
                <p className="mt-2 line-clamp-3 text-sm">{a.persona}</p>
                <p className="muted mt-2 text-xs">
                  {a._count.videos} vidéo(s) · {a._count.socialAccounts} compte(s)
                  {a.providerAvatarId ? " · HeyGen lié" : ""}
                </p>
                <form action={deleteAvatar} className="mt-2">
                  <input type="hidden" name="id" value={a.id} />
                  <button className="muted text-xs underline">Supprimer</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <aside className="card h-fit">
        <h2 className="mb-4 font-semibold">Nouvel avatar</h2>
        <ActionForm action={createAvatar} submitLabel="Créer l'avatar">
          <div><label className="label">Nom</label><input name="name" className="input" placeholder="Léa" required /></div>
          <div><label className="label">Niche</label><input name="niche" className="input" placeholder="Skincare, fitness, SaaS…" required /></div>
          <div>
            <label className="label">Personnalité</label>
            <textarea name="persona" className="input" rows={3} placeholder="26 ans, directe, un peu sarcastique, parle comme une grande sœur." required />
          </div>
          <div>
            <label className="label">Langue</label>
            <select name="language" className="input" defaultValue="fr">
              <option value="fr">Français</option><option value="en">Anglais</option><option value="es">Espagnol</option>
            </select>
          </div>
          <div><label className="label">Image (URL)</label><input name="imageUrl" className="input" placeholder="https://…" /></div>
          <details>
            <summary className="muted cursor-pointer text-xs">Fournisseur vidéo (HeyGen)</summary>
            <div className="mt-3 space-y-3">
              <div><label className="label">Avatar ID</label><input name="providerAvatarId" className="input" /></div>
              <div><label className="label">Voice ID</label><input name="voiceId" className="input" /></div>
            </div>
          </details>
        </ActionForm>
      </aside>
    </div>
  );
}
