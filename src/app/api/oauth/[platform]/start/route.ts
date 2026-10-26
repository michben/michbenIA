import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { authorizeUrl, isMockPublishing } from "@/lib/providers/social";

export async function GET(req: Request, ctx: { params: Promise<{ platform: string }> }) {
  const { platform } = await ctx.params;
  const p = platform.toUpperCase();
  const back = new URL("/app/accounts", req.url);
  if (p !== "TIKTOK" && p !== "INSTAGRAM") return NextResponse.redirect(back);
  if (!(await getCurrentUser())) return NextResponse.redirect(new URL("/login", req.url));

  const configured = p === "TIKTOK" ? process.env.TIKTOK_CLIENT_KEY : process.env.META_APP_ID;
  if (isMockPublishing() || !configured) {
    back.searchParams.set("error", "OAuth non configuré : renseigne les identifiants de l'app et PUBLISH_MODE=live (voir README). En attendant, ajoute un compte de démo.");
    return NextResponse.redirect(back);
  }

  const state = randomBytes(16).toString("hex");
  (await cookies()).set("mb_oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  return NextResponse.redirect(authorizeUrl(p, state));
}
