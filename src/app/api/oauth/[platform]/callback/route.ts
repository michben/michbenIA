import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { exchangeCode } from "@/lib/providers/social";

export async function GET(req: Request, ctx: { params: Promise<{ platform: string }> }) {
  const { platform } = await ctx.params;
  const p = platform.toUpperCase() as "TIKTOK" | "INSTAGRAM";
  const url = new URL(req.url);
  const back = new URL("/app/accounts", req.url);
  const jar = await cookies();
  const expected = jar.get("mb_oauth_state")?.value;
  jar.delete("mb_oauth_state");

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  const code = url.searchParams.get("code");
  if (!code || !expected || url.searchParams.get("state") !== expected) {
    back.searchParams.set("error", "Connexion annulée ou expirée, réessaie.");
    return NextResponse.redirect(back);
  }

  try {
    const t = await exchangeCode(p, code);
    const data = { accessToken: t.accessToken, refreshToken: t.refreshToken, tokenExpiresAt: t.expiresAt, externalId: t.externalId };
    await db.socialAccount.upsert({
      where: { workspaceId_platform_handle: { workspaceId: user.workspaceId, platform: p, handle: t.handle } },
      create: { workspaceId: user.workspaceId, platform: p, handle: t.handle, ...data },
      update: data,
    });
    back.searchParams.set("connected", "1");
  } catch (err) {
    back.searchParams.set("error", err instanceof Error ? err.message : "Échec de la connexion.");
  }
  return NextResponse.redirect(back);
}
