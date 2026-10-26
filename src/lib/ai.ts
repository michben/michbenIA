import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import type { VideoType } from "./types";

export const MODEL = "claude-opus-5-5";

export const ScriptSchema = z.object({
  hooks: z.array(z.string()).describe("5 accroches de 2 secondes max, très différentes les unes des autres"),
  body: z.string().describe("Script complet, parlé à la première personne pour un yapper, ou texte global pour un slideshow"),
  slides: z
    .array(z.object({ title: z.string(), text: z.string() }))
    .describe("Pour un slideshow : 5 à 8 slides. Pour un yapper : liste vide."),
  cta: z.string(),
  caption: z.string().describe("Légende du post TikTok/Instagram"),
  hashtags: z.array(z.string()),
});

export type GeneratedScript = z.infer<typeof ScriptSchema>;

export interface ScriptBrief {
  format: VideoType;
  product: string;
  audience: string;
  angle?: string;
  language?: string;
  durationSeconds?: number;
  avatarPersona?: string;
  /** Description ou transcription d'une vidéo existante à répliquer. */
  referenceVideo?: string;
}

const SYSTEM = `Tu es le directeur créatif de Michbenia, un studio de contenus UGC courts pour TikTok et Instagram.
Tu écris des contenus qui ressemblent à de vrais créateurs : naturels, spécifiques, sans jargon publicitaire.
Règles :
- Les accroches tiennent en moins de 2 secondes à l'oral et créent une tension (curiosité, contradiction, résultat concret).
- Un yapper est un face-caméra parlé : phrases courtes, rythme oral, une idée par phrase, environ 2,5 mots par seconde.
- Un slideshow (carrousel) raconte une progression : slide 1 = accroche, dernière slide = CTA ; 6 à 20 mots par slide.
- N'invente pas de chiffres, d'avis clients ou de promesses que le brief ne donne pas.
- Respecte la langue demandée.`;

function briefToPrompt(brief: ScriptBrief) {
  const lines = [
    `Format : ${brief.format === "YAPPER" ? "yapper (face-caméra parlé)" : "slideshow (carrousel)"}`,
    `Produit / offre : ${brief.product}`,
    `Audience : ${brief.audience}`,
    brief.angle ? `Angle marketing : ${brief.angle}` : null,
    `Langue : ${brief.language ?? "fr"}`,
    brief.format === "YAPPER" ? `Durée visée : ${brief.durationSeconds ?? 45} secondes` : null,
    brief.avatarPersona ? `Personnalité du créateur IA : ${brief.avatarPersona}` : null,
    brief.referenceVideo
      ? `Vidéo de référence à répliquer (garde la structure et le rythme, change le fond pour notre produit) :\n${brief.referenceVideo}`
      : null,
  ];
  return lines.filter(Boolean).join("\n");
}

export function hasClaude() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export async function generateScript(brief: ScriptBrief): Promise<GeneratedScript> {
  if (!hasClaude()) return demoScript(brief);

  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // Si le modèle principal décline, l'API relance la requête sur un modèle de repli.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(ScriptSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: briefToPrompt(brief) }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("La génération a été refusée pour ce brief. Reformule le produit ou l'angle.");
  }
  if (!response.parsed_output) throw new Error("Réponse de Claude illisible, réessaie.");
  return response.parsed_output;
}

/** Générateur hors-ligne, utilisé quand aucune clé Claude n'est configurée (démo, tests). */
export function demoScript(brief: ScriptBrief): GeneratedScript {
  const p = brief.product;
  const a = brief.audience;
  const hooks = [
    `Personne ne parle de ça quand on parle de ${p}.`,
    `J'ai testé ${p} pendant 30 jours, voilà ce qui a changé.`,
    `Si tu fais partie des ${a}, arrête de scroller.`,
    `L'erreur que je faisais avant ${p}.`,
    `3 choses que j'aurais aimé savoir avant ${p}.`,
  ];
  const slides =
    brief.format === "SLIDESHOW"
      ? [
          { title: hooks[4], text: "Swipe, la 3e m'a surprise." },
          { title: "1. Le problème", text: `Les ${a} perdent du temps sans s'en rendre compte.` },
          { title: "2. Le déclic", text: `${p} règle ça dès la première semaine.` },
          { title: "3. Le détail qui change tout", text: brief.angle ?? "C'est simple à mettre en place." },
          { title: "Mon avis", text: "Je ne reviendrais pas en arrière." },
          { title: "À toi de tester", text: "Lien dans la bio." },
        ]
      : [];
  return {
    hooks,
    body:
      brief.format === "YAPPER"
        ? `${hooks[1]} Franchement, j'étais sceptique. Je suis dans les ${a}, et j'avais déjà tout essayé. ` +
          `Ce qui m'a convaincue avec ${p}, c'est ${brief.angle ?? "la simplicité"}. ` +
          `Au bout d'une semaine, j'ai vu la différence. Si tu hésites, teste, tu me diras.`
        : slides.map((s) => `${s.title} — ${s.text}`).join("\n"),
    slides,
    cta: "Lien dans la bio pour tester.",
    caption: `Mon retour honnête sur ${p} 👇`,
    hashtags: ["ugc", "avis", "tiktokfrance", p.toLowerCase().replace(/[^a-z0-9]/g, "")].filter(Boolean),
  };
}
