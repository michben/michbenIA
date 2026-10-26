import { NextResponse } from "next/server";
import { collectMetrics, publishDuePosts, refreshRenderingVideos } from "@/lib/services";

// Tâches planifiées, à appeler par un cron externe (Vercel Cron, Render Cron, GitHub Actions…) :
//   /api/cron/publish  — toutes les minutes
//   /api/cron/render   — toutes les minutes
//   /api/cron/metrics  — toutes les heures
const JOBS: Record<string, () => Promise<unknown>> = {
  publish: () => publishDuePosts(),
  render: () => refreshRenderingVideos(),
  metrics: () => collectMetrics(),
};

async function run(req: Request, ctx: { params: Promise<{ job: string }> }) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const { job } = await ctx.params;
  const fn = JOBS[job];
  if (!fn) return NextResponse.json({ error: "Tâche inconnue." }, { status: 404 });
  return NextResponse.json({ job, result: await fn() });
}

export const GET = run;
export const POST = run;
