import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, withApiKey } from "@/lib/api";
import { serializeVideo } from "@/lib/serialize";

export const GET = withApiKey(async (_req, workspaceId, ctx) => {
  const { id } = await ctx.params;
  const video = await db.video.findFirst({ where: { id, workspaceId } });
  if (!video) return apiError(404, "Vidéo introuvable.");
  return NextResponse.json({ data: serializeVideo(video) });
});
