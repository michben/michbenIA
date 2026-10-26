import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { withApiKey } from "@/lib/api";
import { schedulePost } from "@/lib/services";

const Body = z.object({
  videoId: z.string(),
  accountId: z.string(),
  caption: z.string().max(2200).default(""),
  scheduledAt: z.iso.datetime({ offset: true }),
});

export const GET = withApiKey(async (_req, workspaceId) => {
  const posts = await db.post.findMany({ where: { workspaceId }, orderBy: { scheduledAt: "desc" }, take: 100 });
  return NextResponse.json({ data: posts });
});

export const POST = withApiKey(async (req, workspaceId) => {
  const body = Body.parse(await req.json());
  const post = await schedulePost(workspaceId, { ...body, scheduledAt: new Date(body.scheduledAt) });
  return NextResponse.json({ data: post }, { status: 201 });
});
