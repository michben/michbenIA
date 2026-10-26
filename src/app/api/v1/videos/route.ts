import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { withApiKey } from "@/lib/api";
import { createVideo } from "@/lib/services";
import { serializeVideo } from "@/lib/serialize";

const Body = z.object({
  scriptId: z.string(),
  type: z.enum(["YAPPER", "SLIDESHOW"]),
  avatarId: z.string().optional(),
  hookIndex: z.number().int().min(0).optional(),
  durationSeconds: z.number().int().min(15).max(180).optional(),
});

export const GET = withApiKey(async (_req, workspaceId) => {
  const videos = await db.video.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json({ data: videos.map(serializeVideo) });
});

export const POST = withApiKey(async (req, workspaceId) => {
  const video = await createVideo(workspaceId, Body.parse(await req.json()));
  return NextResponse.json({ data: serializeVideo(video) }, { status: 201 });
});
