import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasClaude } from "@/lib/ai";
import { CREDIT_COSTS } from "@/lib/credits";
import { parseJson, type Slide } from "@/lib/types";
import { ActionForm } from "@/components/ActionForm";
import { SlideshowPreview } from "@/components/Previews";
import { createVideoAction, generateScriptAction } from "../actions";

export default async function StudioPage() {
  const user = await requireUser();
  const [avatars, scripts] = await Promise.all([
    db.avatar.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { name: "asc" } }),
    db.script.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
      <aside className="card h-fit">
        <h1 className="h1 mb-1">Studio</h1>
        <p className="muted mb-4 text-sm">
          Brief → 5 hooks, script, CTA, légende. {CREDIT_COSTS.SCRIPT} crédits.
          {!hasClaude() && " (Mode démo : ajoute ANTHROPIC_API_KEY pour la génération par Claude.)"}
        </p>
        <ActionForm action={generateScriptAction} submitLabel="Générer le script">
          <div>
            <label className="label">Format</label>
            <select name="format" className="input">
              <option value="YAPPER">Yapper (face-caméra)</option>
              <option value="SLIDESHOW">Slideshow (carrousel)</option>
            </select>
          </div>
          <div><label className="label">Produit ou offre</label><input name="product" className="input" required placeholder="Sérum vitamine C Glowup" /></div>
          <div><label className="label">Audience</label><input name="audience" className="input" required placeholder="femmes 20-30 ans peau terne" /></div>
          <div><label className="label">Angle (optionnel)</label><input name="angle" className="input" placeholder="routine en 2 minutes le matin" /></div>
          <div>
            <label className="label">Avatar (optionnel)</label>
            <select name="avatarId" className="input">
              <option value="">Aucun</option>
              {avatars.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div><label className="label">Durée yapper (s)</label><input name="duration" type="number" min={15} max={180} defaultValue={45} className="input" /></div>
          <div>
            <label className="label">Répliquer une vidéo (optionnel)</label>
            <textarea name="reference" rows={3} className="input" placeholder="Colle la transcription ou la description d'une vidéo TikTok/Instagram qui performe." />
          </div>
        </ActionForm>
      </aside>

      <section className="space-y-4">
        <h2 className="font-semibold">Scripts récents</h2>
        {scripts.length === 0 && <p className="muted">Génère ton premier script à gauche.</p>}
        {scripts.map((s) => {
          const hooks = parseJson<string[]>(s.hooksJson, []);
          const slides = parseJson<Slide[]>(s.slidesJson, []);
          return (
            <article key={s.id} className="card space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge">{s.format === "YAPPER" ? "Yapper" : "Slideshow"}</span>
                <span className="font-semibold">{s.product}</span>
                <span className="muted text-sm">· {s.audience}</span>
              </div>
              {s.format === "SLIDESHOW" && slides.length > 0 ? (
                <SlideshowPreview slides={slides} />
              ) : (
                <p className="whitespace-pre-line text-sm">{s.body}</p>
              )}
              <p className="text-sm"><span className="muted">CTA :</span> {s.cta}</p>
              <p className="text-sm"><span className="muted">Légende :</span> {s.caption} <span className="muted">{s.hashtags}</span></p>

              <ActionForm action={createVideoAction} submitLabel="Créer la vidéo" className="space-y-3 border-t pt-4" >
                <input type="hidden" name="scriptId" value={s.id} />
                <input type="hidden" name="type" value={s.format} />
                <fieldset className="space-y-1">
                  <legend className="label">Choisis le hook</legend>
                  {hooks.map((h, i) => (
                    <label key={i} className="flex items-start gap-2 text-sm">
                      <input type="radio" name="hookIndex" value={i} defaultChecked={i === 0} className="mt-1" />
                      {h}
                    </label>
                  ))}
                </fieldset>
                {s.format === "YAPPER" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select name="avatarId" className="input" required>
                      <option value="">Avatar…</option>
                      {avatars.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <input name="duration" type="number" min={15} max={180} defaultValue={45} className="input" aria-label="Durée (s)" />
                  </div>
                )}
              </ActionForm>
            </article>
          );
        })}
      </section>
    </div>
  );
}
