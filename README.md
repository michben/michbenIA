# Michbenia

Moteur UGC IA : des créateurs virtuels qui produisent et publient des vidéos courtes sur TikTok et Instagram.
Avatars IA, vidéos « yapper » (face-caméra) et slideshows, scripts et hooks générés par Claude, publication
planifiée via les API officielles, analytics par avatar, compte et format, et API REST.

## Fonctionnalités du MVP

| Module | Ce qui marche |
|---|---|
| **Avatars** | Créateurs virtuels réutilisables (nom, niche, personnalité, langue, image, IDs avatar/voix HeyGen). |
| **Studio** | Brief → 5 hooks, script, CTA, légende et hashtags (Claude `claude-opus-5-5`, sortie structurée). Réplication d'une vidéo existante à partir de sa transcription. Sans clé API : générateur de démo hors-ligne. |
| **Vidéos** | Yapper rendu par un fournisseur d'avatars (HeyGen API v2, ou `mock`). Slideshow 9:16 rendu dans l'app. Choix du hook par vidéo pour tester plusieurs accroches. |
| **Comptes** | Connexion OAuth TikTok (Login Kit + Content Posting API) et Instagram (Instagram API with Instagram Login). Chaque compte peut être rattaché à un avatar. |
| **Planning** | Publications planifiées multi-comptes, publiées par une tâche cron (`/api/cron/publish`). |
| **Analytics** | Vues et engagement par avatar, compte et format, meilleurs hooks. |
| **Crédits** | Barème inspiré de Pamba : script 5, slideshow 60, yapper 8 crédits/seconde. 300 crédits offerts à l'inscription, remboursement automatique si un rendu échoue. |
| **API** | Clés API par espace, endpoints REST `/api/v1/*`. |

## Démarrage

```bash
npm install
cp .env.example .env      # puis renseigne AUTH_SECRET (et ANTHROPIC_API_KEY si tu l'as)
npm run setup             # crée la base SQLite et le compte de démo
npm run dev
```

Ouvre http://localhost:3000 et connecte-toi avec `demo@michbenia.app` / `demo1234`, ou crée un compte.

Par défaut tout tourne en **mode démo** : rendu vidéo simulé (`VIDEO_PROVIDER=mock`) et publication simulée
(`PUBLISH_MODE=mock`), ce qui permet de tester le parcours complet sans aucun compte externe.

## Passer en réel

| Brique | Variables | À faire |
|---|---|---|
| Scripts par Claude | `ANTHROPIC_API_KEY` | Clé sur console.anthropic.com. |
| Vidéos avatar | `VIDEO_PROVIDER=heygen`, `HEYGEN_API_KEY` | Renseigner l'Avatar ID et le Voice ID HeyGen sur chaque avatar. |
| TikTok | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `PUBLISH_MODE=live` | App sur developers.tiktok.com avec Login Kit et Content Posting API (scopes `user.info.basic`, `video.publish`, `video.list`). Redirect URI : `APP_URL/api/oauth/tiktok/callback`. TikTok exige un audit de l'app avant la publication publique. |
| Instagram | `META_APP_ID`, `META_APP_SECRET`, `PUBLISH_MODE=live` | App Meta avec le produit « Instagram API with Instagram Login ». Redirect URI : `APP_URL/api/oauth/instagram/callback`. Comptes Business ou Creator uniquement. |
| Tâches planifiées | `CRON_SECRET` | Appeler `/api/cron/publish` et `/api/cron/render` chaque minute, `/api/cron/metrics` chaque heure, avec `Authorization: Bearer $CRON_SECRET`. |

### Production

Changer `provider = "sqlite"` en `"postgresql"` dans `prisma/schema.prisma`, pointer `DATABASE_URL` sur la base,
puis `npx prisma db push`. Next.js se déploie tel quel sur Vercel, Render ou tout hébergeur Node.

## API

Crée une clé dans **Réglages & API**, puis :

```bash
# Générer un script
curl -X POST $APP_URL/api/v1/scripts -H "Authorization: Bearer mb_live_…" -H "Content-Type: application/json" \
  -d '{"format":"SLIDESHOW","product":"App budget","audience":"étudiants"}'

# Créer une vidéo à partir du script (hookIndex = accroche choisie)
curl -X POST $APP_URL/api/v1/videos -H "Authorization: Bearer mb_live_…" -H "Content-Type: application/json" \
  -d '{"scriptId":"…","type":"SLIDESHOW","hookIndex":2}'

# Planifier une publication
curl -X POST $APP_URL/api/v1/posts -H "Authorization: Bearer mb_live_…" -H "Content-Type: application/json" \
  -d '{"videoId":"…","accountId":"…","caption":"…","scheduledAt":"2026-11-02T18:00:00+01:00"}'
```

| Méthode | Endpoint | |
|---|---|---|
| GET, POST | `/api/v1/scripts` | Lister, générer |
| GET, POST | `/api/v1/videos` | Lister, créer |
| GET | `/api/v1/videos/:id` | Statut d'une vidéo |
| GET, POST | `/api/v1/posts` | Lister, planifier |
| GET | `/api/v1/analytics` | Agrégats par avatar, compte, format |

Codes d'erreur : 401 clé invalide, 400 corps invalide, 402 crédits insuffisants, 404 introuvable.

## Stack

Next.js 16 (App Router, server actions) · TypeScript · Prisma (SQLite en local, PostgreSQL en prod) ·
Tailwind CSS 4 · Claude via `@anthropic-ai/sdk` · HeyGen · Vitest.

```
src/lib/ai.ts                 Génération de scripts (Claude + mode démo)
src/lib/services.ts           Logique métier : scripts, vidéos, planification, publication, analytics
src/lib/providers/video.ts    Fournisseurs de rendu (mock, HeyGen)
src/lib/providers/social.ts   OAuth et publication TikTok / Instagram
src/lib/credits.ts            Plans et barème de crédits
src/app/app/*                 Tableau de bord
src/app/api/v1/*              API publique
src/app/api/cron/[job]        Tâches planifiées
```

## Prochaines étapes

- Paiement des plans et recharges de crédits (Stripe).
- Export MP4/images des slideshows pour la publication réelle (TikTok photo mode, carrousel Instagram).
- Relève des vraies métriques (TikTok `video/query`, Instagram Insights) ; aujourd'hui simulées en mode démo.
- Génération d'images d'avatars et clonage de voix (fournisseurs à choisir).
- Boucle d'optimisation : réutiliser automatiquement les hooks les plus performants dans le Studio.
- Serveur MCP au-dessus de l'API publique.
- Chiffrement des jetons OAuth au repos et rafraîchissement automatique des jetons TikTok.
