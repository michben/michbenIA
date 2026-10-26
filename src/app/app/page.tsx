import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function Overview() {
  const user = await requireUser();
  const ws = user.workspaceId;
  const [avatars, scripts, videos, scheduled, published, accounts] = await Promise.all([
    db.avatar.count({ where: { workspaceId: ws } }),
    db.script.count({ where: { workspaceId: ws } }),
    db.video.count({ where: { workspaceId: ws } }),
    db.post.count({ where: { workspaceId: ws, status: "SCHEDULED" } }),
    db.post.count({ where: { workspaceId: ws, status: "PUBLISHED" } }),
    db.socialAccount.count({ where: { workspaceId: ws } }),
  ]);

  const steps = [
    { done: avatars > 0, label: "Créer un avatar IA", href: "/app/avatars" },
    { done: scripts > 0, label: "Générer un script et des hooks", href: "/app/studio" },
    { done: videos > 0, label: "Produire une vidéo", href: "/app/studio" },
    { done: accounts > 0, label: "Connecter TikTok ou Instagram", href: "/app/accounts" },
    { done: scheduled + published > 0, label: "Planifier une publication", href: "/app/videos" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="h1">Bonjour{user.name ? ` ${user.name}` : ""} 👋</h1>
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Avatars", avatars],
          ["Scripts", scripts],
          ["Vidéos", videos],
          ["Comptes", accounts],
          ["Planifiés", scheduled],
          ["Publiés", published],
        ].map(([label, n]) => (
          <div key={label} className="card">
            <p className="label">{label}</p>
            <p className="text-2xl font-black">{n}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <h2 className="mb-4 font-semibold">Démarrage</h2>
        <ol className="space-y-2">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-3 text-sm">
              <span>{s.done ? "✅" : "⬜️"}</span>
              <Link href={s.href} className={s.done ? "muted line-through" : "underline"}>{s.label}</Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
