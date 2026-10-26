// Logique métier partagée par l'interface (server actions) et l'API publique.
import { db } from "./db";
import { generateScript, type ScriptBrief } from "./ai";
import { CREDIT_COSTS, refundCredits, spendCredits, videoCost } from "./credits";
import { getVideoProvider } from "./providers/video";
import { mockMetrics, isMockPublishing, publish } from "./providers/social";
import { parseJson, type Slide, type VideoType } from "./types";

export async function createScript(workspaceId: string, brief: ScriptBrief) {
  await spendCredits(workspaceId, CREDIT_COSTS.SCRIPT, `Script ${brief.format.toLowerCase()}`);
  try {
    const s = await generateScript(brief);
    return await db.script.create({
      data: {
        workspaceId,
        format: brief.format,
        product: brief.product,
        audience: brief.audience,
        angle: brief.angle,
        hooksJson: JSON.stringify(s.hooks),
        body: s.body,
        slidesJson: s.slides.length ? JSON.stringify(s.slides) : null,
        cta: s.cta,
        caption: s.caption,
        hashtags: s.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "),
      },
    });
  } catch (err) {
    await refundCredits(workspaceId, CREDIT_COSTS.SCRIPT, "Remboursement script échoué");
    throw err;
  }
}

export interface CreateVideoInput {
  scriptId: string;
  type: VideoType;
  avatarId?: string | null;
  hookIndex?: number;
  durationSeconds?: number;
}

export async function createVideo(workspaceId: string, input: CreateVideoInput) {
  const script = await db.script.findFirstOrThrow({ where: { id: input.scriptId, workspaceId } });
  const hooks = parseJson<string[]>(script.hooksJson, []);
  const hook = hooks[input.hookIndex ?? 0] ?? hooks[0] ?? "";
  const avatar = input.avatarId ? await db.avatar.findFirst({ where: { id: input.avatarId, workspaceId } }) : null;
  if (input.type === "YAPPER" && !avatar) throw new Error("Un yapper nécessite un avatar.");

  const cost = videoCost(input.type, input.durationSeconds ?? 45);
  await spendCredits(workspaceId, cost, `Vidéo ${input.type.toLowerCase()}`);

  let slides: Slide[] | null = null;
  if (input.type === "SLIDESHOW") {
    slides = parseJson<Slide[]>(script.slidesJson, []);
    if (!slides.length) slides = [{ title: hook, text: script.body.slice(0, 120) }];
    // La première slide porte l'accroche choisie (test A/B des hooks).
    slides[0] = { ...slides[0], title: hook };
  }

  const video = await db.video.create({
    data: {
      workspaceId,
      type: input.type,
      title: `${script.product} — ${hook.slice(0, 60)}`,
      status: input.type === "SLIDESHOW" ? "READY" : "QUEUED",
      avatarId: avatar?.id,
      scriptId: script.id,
      hook,
      slidesJson: slides ? JSON.stringify(slides) : null,
      provider: input.type === "SLIDESHOW" ? "slideshow" : getVideoProvider().name,
      creditsCost: cost,
    },
  });

  if (input.type === "YAPPER") {
    try {
      const { jobId } = await getVideoProvider().startRender({
        script: `${hook} ${script.body} ${script.cta}`,
        providerAvatarId: avatar?.providerAvatarId,
        voiceId: avatar?.voiceId,
      });
      return db.video.update({ where: { id: video.id }, data: { status: "RENDERING", providerJobId: jobId } });
    } catch (err) {
      await refundCredits(workspaceId, cost, "Remboursement rendu échoué");
      return db.video.update({
        where: { id: video.id },
        data: { status: "FAILED", error: err instanceof Error ? err.message : String(err) },
      });
    }
  }
  return video;
}

/** Interroge le fournisseur pour les vidéos en cours de rendu. */
export async function refreshRenderingVideos(workspaceId?: string) {
  const videos = await db.video.findMany({
    where: { status: "RENDERING", providerJobId: { not: null }, ...(workspaceId ? { workspaceId } : {}) },
  });
  const provider = getVideoProvider();
  for (const v of videos) {
    if (v.provider !== provider.name) continue;
    const s = await provider.getStatus(v.providerJobId!);
    if (s.status === "RENDERING") continue;
    await db.video.update({
      where: { id: v.id },
      data: { status: s.status, outputUrl: s.outputUrl, thumbnailUrl: s.thumbnailUrl, error: s.error },
    });
    if (s.status === "FAILED") await refundCredits(v.workspaceId, v.creditsCost, "Remboursement rendu échoué");
  }
  return videos.length;
}

export async function schedulePost(
  workspaceId: string,
  input: { videoId: string; accountId: string; caption: string; scheduledAt: Date },
) {
  const [video, account] = await Promise.all([
    db.video.findFirstOrThrow({ where: { id: input.videoId, workspaceId } }),
    db.socialAccount.findFirstOrThrow({ where: { id: input.accountId, workspaceId } }),
  ]);
  if (video.status === "FAILED") throw new Error("Impossible de planifier une vidéo en échec.");
  return db.post.create({
    data: { workspaceId, videoId: video.id, accountId: account.id, caption: input.caption, scheduledAt: input.scheduledAt },
  });
}

/** Publie les posts arrivés à échéance. Appelé par /api/cron/publish (toutes les minutes). */
export async function publishDuePosts(now = new Date()) {
  const due = await db.post.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: now } },
    include: { video: true, account: true },
    take: 25,
  });
  let published = 0;
  for (const post of due) {
    // Verrou optimiste : un seul worker prend le post.
    const claimed = await db.post.updateMany({ where: { id: post.id, status: "SCHEDULED" }, data: { status: "PUBLISHING" } });
    if (!claimed.count) continue;
    if (post.video.status !== "READY") {
      await db.post.update({ where: { id: post.id }, data: { status: "SCHEDULED", scheduledAt: new Date(now.getTime() + 5 * 60_000) } });
      continue;
    }
    try {
      const r = await publish({
        platform: post.account.platform as "TIKTOK" | "INSTAGRAM",
        accessToken: post.account.accessToken,
        externalId: post.account.externalId,
        videoUrl: post.video.outputUrl,
        caption: post.caption,
      });
      await db.post.update({
        where: { id: post.id },
        data: { status: "PUBLISHED", externalId: r.externalId, externalUrl: r.externalUrl, publishedAt: new Date() },
      });
      published++;
    } catch (err) {
      await db.post.update({
        where: { id: post.id },
        data: { status: "FAILED", error: err instanceof Error ? err.message : String(err) },
      });
    }
  }
  return { due: due.length, published };
}

/** Relève les métriques des posts publiés. En mode démo, les chiffres sont simulés. */
export async function collectMetrics(workspaceId?: string) {
  const posts = await db.post.findMany({
    where: { status: "PUBLISHED", publishedAt: { not: null }, ...(workspaceId ? { workspaceId } : {}) },
  });
  if (!isMockPublishing()) {
    // TODO : TikTok /v2/video/query/ et Instagram /{media-id}/insights.
    return 0;
  }
  for (const p of posts) {
    await db.postMetric.create({ data: { postId: p.id, ...mockMetrics(p.publishedAt!, p.id) } });
  }
  return posts.length;
}

export interface AnalyticsRow {
  key: string;
  label: string;
  posts: number;
  views: number;
  engagement: number; // (likes + commentaires + partages) / vues
}

/** Agrège la dernière mesure de chaque post, par avatar, par compte et par format. */
export async function getAnalytics(workspaceId: string) {
  const posts = await db.post.findMany({
    where: { workspaceId, status: "PUBLISHED" },
    include: {
      metrics: { orderBy: { capturedAt: "desc" }, take: 1 },
      video: { include: { avatar: true } },
      account: true,
    },
  });

  const groups = { avatar: new Map<string, AnalyticsRow>(), account: new Map<string, AnalyticsRow>(), format: new Map<string, AnalyticsRow>() };
  const totals = { posts: posts.length, views: 0, interactions: 0 };
  const top: { id: string; title: string; hook: string; views: number; engagement: number }[] = [];

  const add = (map: Map<string, AnalyticsRow>, key: string, label: string, views: number, inter: number) => {
    const row = map.get(key) ?? { key, label, posts: 0, views: 0, engagement: 0 };
    const prevInter = row.engagement * row.views;
    row.posts += 1;
    row.views += views;
    row.engagement = row.views ? (prevInter + inter) / row.views : 0;
    map.set(key, row);
  };

  for (const p of posts) {
    const m = p.metrics[0];
    const views = m?.views ?? 0;
    const inter = m ? m.likes + m.comments + m.shares : 0;
    totals.views += views;
    totals.interactions += inter;
    add(groups.avatar, p.video.avatarId ?? "none", p.video.avatar?.name ?? "Sans avatar (slideshow)", views, inter);
    add(groups.account, p.accountId, `${p.account.platform === "TIKTOK" ? "TikTok" : "Instagram"} @${p.account.handle}`, views, inter);
    add(groups.format, p.video.type, p.video.type === "YAPPER" ? "Yapper" : "Slideshow", views, inter);
    top.push({ id: p.id, title: p.video.title, hook: p.video.hook, views, engagement: views ? inter / views : 0 });
  }

  const sort = (m: Map<string, AnalyticsRow>) => [...m.values()].sort((a, b) => b.views - a.views);
  return {
    totals: { ...totals, engagement: totals.views ? totals.interactions / totals.views : 0 },
    byAvatar: sort(groups.avatar),
    byAccount: sort(groups.account),
    byFormat: sort(groups.format),
    topPosts: top.sort((a, b) => b.views - a.views).slice(0, 10),
  };
}
