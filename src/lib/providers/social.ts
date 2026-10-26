// Connexion et publication via les API officielles :
// - TikTok : Login Kit + Content Posting API (scope video.publish)
// - Instagram : Instagram API with Instagram Login (instagram_business_content_publish)
// PUBLISH_MODE="mock" simule la publication pour la démo et le développement.

import type { Platform } from "../types";

export function isMockPublishing() {
  return process.env.PUBLISH_MODE !== "live";
}

function redirectUri(platform: Platform) {
  return `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/${platform.toLowerCase()}/callback`;
}

export function authorizeUrl(platform: Platform, state: string) {
  if (platform === "TIKTOK") {
    const p = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY ?? "",
      scope: "user.info.basic,video.publish,video.list",
      response_type: "code",
      redirect_uri: redirectUri(platform),
      state,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${p}`;
  }
  const p = new URLSearchParams({
    client_id: process.env.META_APP_ID ?? "",
    redirect_uri: redirectUri(platform),
    scope: "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_insights",
    response_type: "code",
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${p}`;
}

export interface TokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  externalId: string;
  handle: string;
}

export async function exchangeCode(platform: Platform, code: string): Promise<TokenResult> {
  if (platform === "TIKTOK") {
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY ?? "",
        client_secret: process.env.TIKTOK_CLIENT_SECRET ?? "",
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri(platform),
      }),
    });
    const t = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; open_id?: string; error_description?: string };
    if (!t.access_token || !t.open_id) throw new Error(t.error_description ?? "Échec OAuth TikTok");
    const info = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name", {
      headers: { Authorization: `Bearer ${t.access_token}` },
    }).then((r) => r.json() as Promise<{ data?: { user?: { display_name?: string } } }>);
    return {
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      expiresAt: t.expires_in ? new Date(Date.now() + t.expires_in * 1000) : undefined,
      externalId: t.open_id,
      handle: info.data?.user?.display_name ?? t.open_id,
    };
  }
  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.META_APP_ID ?? "",
      client_secret: process.env.META_APP_SECRET ?? "",
      grant_type: "authorization_code",
      redirect_uri: redirectUri(platform),
      code,
    }),
  });
  const t = (await res.json()) as { access_token?: string; user_id?: number | string; error_message?: string };
  if (!t.access_token || !t.user_id) throw new Error(t.error_message ?? "Échec OAuth Instagram");
  const me = await fetch(`https://graph.instagram.com/me?fields=username&access_token=${t.access_token}`).then(
    (r) => r.json() as Promise<{ username?: string }>,
  );
  return { accessToken: t.access_token, externalId: String(t.user_id), handle: me.username ?? String(t.user_id) };
}

export interface PublishInput {
  platform: Platform;
  accessToken: string | null;
  externalId: string | null;
  videoUrl: string | null;
  caption: string;
}

export interface PublishResult {
  externalId: string;
  externalUrl?: string;
}

export async function publish(input: PublishInput): Promise<PublishResult> {
  if (isMockPublishing()) {
    const id = `mock_${Math.random().toString(36).slice(2, 10)}`;
    return { externalId: id };
  }
  if (!input.accessToken) throw new Error("Compte non connecté (jeton absent).");
  if (!input.videoUrl) throw new Error("La vidéo n'a pas de fichier exporté à publier.");

  if (input.platform === "TIKTOK") {
    const res = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({
        post_info: { title: input.caption.slice(0, 2200), privacy_level: "PUBLIC_TO_EVERYONE" },
        source_info: { source: "PULL_FROM_URL", video_url: input.videoUrl },
      }),
    });
    const json = (await res.json()) as { data?: { publish_id?: string }; error?: { message?: string } };
    if (!res.ok || !json.data?.publish_id) throw new Error(json.error?.message ?? `TikTok a répondu ${res.status}`);
    return { externalId: json.data.publish_id };
  }

  // Instagram : création d'un conteneur Reel puis publication.
  const base = `https://graph.instagram.com/v21.0/${input.externalId}`;
  const create = await fetch(`${base}/media`, {
    method: "POST",
    body: new URLSearchParams({
      media_type: "REELS",
      video_url: input.videoUrl,
      caption: input.caption,
      access_token: input.accessToken,
    }),
  }).then((r) => r.json() as Promise<{ id?: string; error?: { message?: string } }>);
  if (!create.id) throw new Error(create.error?.message ?? "Création du Reel échouée");

  // Instagram traite la vidéo de façon asynchrone ; on attend jusqu'à ~60 s.
  for (let i = 0; i < 12; i++) {
    const s = await fetch(`https://graph.instagram.com/v21.0/${create.id}?fields=status_code&access_token=${input.accessToken}`).then(
      (r) => r.json() as Promise<{ status_code?: string }>,
    );
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR") throw new Error("Instagram n'a pas pu traiter la vidéo.");
    await new Promise((r) => setTimeout(r, 5000));
  }
  const pub = await fetch(`${base}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({ creation_id: create.id, access_token: input.accessToken }),
  }).then((r) => r.json() as Promise<{ id?: string; error?: { message?: string } }>);
  if (!pub.id) throw new Error(pub.error?.message ?? "Publication Instagram échouée");
  return { externalId: pub.id };
}

export interface MetricSnapshot {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

/** Métriques simulées : croissance plausible selon l'âge du post (démo). */
export function mockMetrics(publishedAt: Date, seed: string): MetricSnapshot {
  const hours = Math.max(1, (Date.now() - publishedAt.getTime()) / 3_600_000);
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const virality = 0.3 + (h % 100) / 40; // 0,3 à 2,8
  const views = Math.round(200 * virality * Math.log2(1 + hours) * (1 + (h % 7)));
  return {
    views,
    likes: Math.round(views * (0.04 + (h % 5) / 100)),
    comments: Math.round(views * 0.004),
    shares: Math.round(views * 0.006),
  };
}
