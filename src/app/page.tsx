import Link from "next/link";
import { PLANS } from "@/lib/credits";

const FEATURES = [
  { title: "Avatars IA réutilisables", text: "Crée des créateurs virtuels avec leur personnalité, leur niche et leur voix." },
  { title: "Vidéos yapper et slideshows", text: "Face-caméra parlés ou carrousels, au format 9:16, prêts pour TikTok et Reels." },
  { title: "Scripts et hooks par IA", text: "5 accroches par concept, script, CTA, légende et hashtags en quelques secondes." },
  { title: "Réplication de formats", text: "Colle la transcription d'une vidéo qui marche : Michbenia en garde la structure." },
  { title: "Publication planifiée", text: "Connecte tes comptes TikTok et Instagram et programme tes posts." },
  { title: "Analytics et API", text: "Vues et engagement par avatar, compte et format. API REST pour automatiser." },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <nav className="mb-20 flex items-center justify-between">
        <span className="text-xl font-black tracking-tight">michbenia</span>
        <div className="flex gap-2">
          <Link href="/login" className="btn-ghost">Connexion</Link>
          <Link href="/signup" className="btn">Essai gratuit</Link>
        </div>
      </nav>

      <section className="mb-24 text-center">
        <p className="badge mb-4">Moteur UGC autonome</p>
        <h1 className="mx-auto max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">
          Des créateurs IA qui publient pour toi, tous les jours.
        </h1>
        <p className="muted mx-auto mt-6 max-w-xl text-lg">
          Avatars, scripts, vidéos UGC et publication sur TikTok et Instagram, dans un seul outil. Sans tournage,
          sans agence.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/signup" className="btn">Créer mon premier avatar</Link>
          <a href="#tarifs" className="btn-ghost">Voir les tarifs</a>
        </div>
      </section>

      <section className="mb-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="card">
            <h3 className="mb-2 font-semibold">{f.title}</h3>
            <p className="muted text-sm">{f.text}</p>
          </div>
        ))}
      </section>

      <section id="tarifs" className="mb-24">
        <h2 className="h1 mb-8 text-center">Tarifs</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(PLANS).map(([key, p]) => (
            <div key={key} className="card">
              <h3 className="font-semibold">{p.label}</h3>
              <p className="my-3 text-3xl font-black">
                {p.priceUsd === null ? "Sur devis" : `${p.priceUsd} $`}
                {p.priceUsd ? <span className="muted text-sm font-normal"> /mois</span> : null}
              </p>
              <ul className="muted space-y-1 text-sm">
                <li>{p.monthlyCredits ? `${p.monthlyCredits.toLocaleString("fr-FR")} crédits${key === "FREE" ? " offerts" : "/mois"}` : "Crédits sur mesure"}</li>
                <li>Analytics : {p.avatarsWithAnalytics >= 1000 ? "illimité" : `${p.avatarsWithAnalytics} avatar(s)`}</li>
                <li>Comptes d&apos;inspiration : {p.inspirations}</li>
              </ul>
            </div>
          ))}
        </div>
        <p className="muted mt-4 text-center text-sm">Yapper : 8 crédits/seconde · Slideshow : 60 crédits · Script : 5 crédits</p>
      </section>
    </main>
  );
}
