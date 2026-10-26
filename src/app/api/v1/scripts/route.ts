import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { withApiKey } from "@/lib/api";
import { createScript } from "@/lib/services";
import { serializeScript } from "@/lib/serialize";

const Body = z.object({
  format: z.enum(["YAPPER", "SLIDESHOW"]),
  product: z.string().min(1),
  audience: z.string().min(1),
  angle: z.string().optional(),
  language: z.string().optional(),
  durationSeconds: z.number().int().min(15).max(180).optional(),
  avatarId: z.string().optional(),
  referenceVideo: z.string().optional(),
});

export const GET = withApiKey(async (_req, workspaceId) => {
  const scripts = await db.script.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json({ data: scripts.map(serializeScript) });
});

export const POST = withApiKey(async (req, workspaceId) => {
  const body = Body.parse(await req.json());
  const avatar = body.avatarId ? await db.avatar.findFirst({ where: { id: body.avatarId, workspaceId } }) : null;
  const script = await createScript(workspaceId, { ...body, avatarPersona: avatar?.persona, language: body.language ?? avatar?.language });
  return NextResponse.json({ data: serializeScript(script) }, { status: 201 });
});
