// Données de démo : un compte demo@michbenia.app / demo1234 avec avatar, script, vidéos et posts publiés.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { demoScript } from "../src/lib/ai";

const db = new PrismaClient();

async function main() {
  const email = "demo@michbenia.app";
  if (await db.user.findUnique({ where: { email } })) {
    console.log("Démo déjà présente.");
    return;
  }
  const ws = await db.workspace.create({ data: { name: "Démo Michbenia", plan: "PRO", credits: 10000 } });
  await db.user.create({ data: { email, name: "Démo", passwordHash: await bcrypt.hash("demo1234", 10), workspaceId: ws.id } });
  const avatar = await db.avatar.create({
    data: { workspaceId: ws.id, name: "Léa", niche: "Skincare", persona: "26 ans, directe et drôle, parle comme une grande sœur.", language: "fr" },
  });
  const account = await db.socialAccount.create({ data: { workspaceId: ws.id, platform: "TIKTOK", handle: "lea.glow", avatarId: avatar.id } });

  for (const format of ["YAPPER", "SLIDESHOW"] as const) {
    const s = demoScript({ format, product: "Sérum Glowup", audience: "femmes 20-30 ans", angle: "routine en 2 minutes" });
    const script = await db.script.create({
      data: {
        workspaceId: ws.id, format, product: "Sérum Glowup", audience: "femmes 20-30 ans",
        hooksJson: JSON.stringify(s.hooks), body: s.body, slidesJson: s.slides.length ? JSON.stringify(s.slides) : null,
        cta: s.cta, caption: s.caption, hashtags: s.hashtags.map((h) => `#${h}`).join(" "),
      },
    });
    for (let i = 0; i < 3; i++) {
      const video = await db.video.create({
        data: {
          workspaceId: ws.id, type: format, title: `Sérum Glowup — ${s.hooks[i]}`, status: "READY",
          avatarId: format === "YAPPER" ? avatar.id : null, scriptId: script.id, hook: s.hooks[i],
          slidesJson: s.slides.length ? JSON.stringify([{ ...s.slides[0], title: s.hooks[i] }, ...s.slides.slice(1)]) : null,
          provider: format === "YAPPER" ? "mock" : "slideshow", creditsCost: format === "YAPPER" ? 360 : 60,
        },
      });
      const publishedAt = new Date(Date.now() - (i + 1) * 36 * 3_600_000);
      const post = await db.post.create({
        data: { workspaceId: ws.id, videoId: video.id, accountId: account.id, caption: s.caption, scheduledAt: publishedAt, publishedAt, status: "PUBLISHED", externalId: `seed_${i}` },
      });
      const views = (format === "YAPPER" ? 4200 : 1800) * (3 - i);
      await db.postMetric.create({ data: { postId: post.id, views, likes: Math.round(views * 0.07), comments: Math.round(views * 0.005), shares: Math.round(views * 0.008) } });
    }
  }
  console.log("Démo créée : demo@michbenia.app / demo1234");
}

main().finally(() => db.$disconnect());
