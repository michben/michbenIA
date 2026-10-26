import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isMockPublishing } from "@/lib/providers/social";
import { ActionForm } from "@/components/ActionForm";
import { addMockAccount, disconnectAccount, linkAccountAvatar } from "../actions";

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ error?: string; connected?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const [accounts, avatars] = await Promise.all([
    db.socialAccount.findMany({ where: { workspaceId: user.workspaceId }, include: { avatar: true }, orderBy: { createdAt: "desc" } }),
    db.avatar.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { name: "asc" } }),
  ]);
  const mock = isMockPublishing();

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section>
        <h1 className="h1 mb-2">Comptes sociaux</h1>
        <p className="muted mb-6 text-sm">
          Michbenia publie sur tes propres comptes via les API officielles (TikTok Content Posting API, Instagram API).
          Associe chaque compte à un avatar pour des analytics par créateur.
        </p>
        {params.error && <p className="mb-4 text-sm text-red-400">{params.error}</p>}
        {params.connected && <p className="mb-4 text-sm text-emerald-400">Compte connecté.</p>}
        {accounts.length === 0 && <p className="muted">Aucun compte connecté.</p>}
        <div className="space-y-3">
          {accounts.map((a) => (
            <div key={a.id} className="card flex flex-wrap items-center gap-3 p-4">
              <span className="badge">{a.platform === "TIKTOK" ? "TikTok" : "Instagram"}</span>
              <span className="flex-1 font-semibold">@{a.handle}</span>
              {!a.accessToken && <span className="muted text-xs">démo</span>}
              <form action={linkAccountAvatar} className="flex items-center gap-2">
                <input type="hidden" name="id" value={a.id} />
                <select name="avatarId" defaultValue={a.avatarId ?? ""} className="input w-40">
                  <option value="">Sans avatar</option>
                  {avatars.map((av) => <option key={av.id} value={av.id}>{av.name}</option>)}
                </select>
                <button className="btn-ghost">OK</button>
              </form>
              <form action={disconnectAccount}>
                <input type="hidden" name="id" value={a.id} />
                <button className="muted text-xs underline">Déconnecter</button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <aside className="card h-fit space-y-4">
        <h2 className="font-semibold">Connecter un compte</h2>
        <div className="flex flex-col gap-2">
          <a href="/api/oauth/tiktok/start" className="btn">Connecter TikTok</a>
          <a href="/api/oauth/instagram/start" className="btn">Connecter Instagram</a>
        </div>
        <p className="muted text-xs">Instagram exige un compte professionnel (Business ou Creator).</p>
        {mock && (
          <div className="border-t pt-4">
            <h3 className="mb-3 text-sm font-semibold">Mode démo : ajouter un compte simulé</h3>
            <ActionForm action={addMockAccount} submitLabel="Ajouter">
              <select name="platform" className="input">
                <option value="TIKTOK">TikTok</option>
                <option value="INSTAGRAM">Instagram</option>
              </select>
              <input name="handle" className="input" placeholder="@moncompte" required />
              <select name="avatarId" className="input">
                <option value="">Sans avatar</option>
                {avatars.map((av) => <option key={av.id} value={av.id}>{av.name}</option>)}
              </select>
            </ActionForm>
          </div>
        )}
      </aside>
    </div>
  );
}
