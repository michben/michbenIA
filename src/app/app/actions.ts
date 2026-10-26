"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createApiKey } from "@/lib/api-keys";
import { parseLocalDateTime } from "@/lib/time";
import { InsufficientCreditsError } from "@/lib/credits";
import { isMockPublishing } from "@/lib/providers/social";
import { collectMetrics, createScript, createVideo, publishDuePosts, refreshRenderingVideos, schedulePost } from "@/lib/services";

export type ActionState = { error?: string; ok?: string };

const str = (form: FormData, k: string) => String(form.get(k) ?? "").trim();

function fail(err: unknown): ActionState {
  if (err instanceof InsufficientCreditsError) return { error: err.message };
  return { error: err instanceof Error ? err.message : "Erreur inattendue." };
}

// --- Avatars -----------------------------------------------------------------

const AvatarInput = z.object({
  name: z.string().min(1, "Nom requis"),
  persona: z.string().min(10, "Décris la personnalité en une ou deux phrases"),
  niche: z.string().min(1, "Niche requise"),
  language: z.string().default("fr"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  voiceId: z.string().optional(),
  providerAvatarId: z.string().optional(),
});

export async function createAvatar(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = AvatarInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  await db.avatar.create({
    data: {
      ...d,
      imageUrl: d.imageUrl || null,
      voiceId: d.voiceId || null,
      providerAvatarId: d.providerAvatarId || null,
      workspaceId: user.workspaceId,
    },
  });
  revalidatePath("/app/avatars");
  return { ok: `Avatar « ${d.name} » créé.` };
}

export async function deleteAvatar(form: FormData) {
  const user = await requireUser();
  await db.avatar.deleteMany({ where: { id: str(form, "id"), workspaceId: user.workspaceId } });
  revalidatePath("/app/avatars");
}

// --- Studio (scripts) ---------------------------------------------------------

export async function generateScriptAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const format = str(form, "format") === "SLIDESHOW" ? "SLIDESHOW" : "YAPPER";
  const product = str(form, "product");
  const audience = str(form, "audience");
  if (!product || !audience) return { error: "Le produit et l'audience sont requis." };
  const avatarId = str(form, "avatarId");
  const avatar = avatarId ? await db.avatar.findFirst({ where: { id: avatarId, workspaceId: user.workspaceId } }) : null;
  try {
    await createScript(user.workspaceId, {
      format,
      product,
      audience,
      angle: str(form, "angle") || undefined,
      language: avatar?.language ?? (str(form, "language") || "fr"),
      durationSeconds: Number(str(form, "duration")) || 45,
      avatarPersona: avatar?.persona,
      referenceVideo: str(form, "reference") || undefined,
    });
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/app/studio");
  return { ok: "Script généré." };
}

// --- Vidéos -------------------------------------------------------------------

export async function createVideoAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    await createVideo(user.workspaceId, {
      scriptId: str(form, "scriptId"),
      type: str(form, "type") === "SLIDESHOW" ? "SLIDESHOW" : "YAPPER",
      avatarId: str(form, "avatarId") || null,
      hookIndex: Number(str(form, "hookIndex")) || 0,
      durationSeconds: Number(str(form, "duration")) || 45,
    });
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/app/videos");
  redirect("/app/videos");
}

export async function refreshVideos() {
  const user = await requireUser();
  await refreshRenderingVideos(user.workspaceId);
  revalidatePath("/app/videos");
}

// --- Publication ----------------------------------------------------------------

export async function schedulePostAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const when = parseLocalDateTime(str(form, "scheduledAt"), Number(str(form, "tzOffset")) || 0);
  if (Number.isNaN(when.getTime())) return { error: "Date de publication invalide." };
  const accountIds = form.getAll("accountId").map(String).filter(Boolean);
  if (!accountIds.length) return { error: "Choisis au moins un compte." };
  try {
    for (const accountId of accountIds) {
      await schedulePost(user.workspaceId, { videoId: str(form, "videoId"), accountId, caption: str(form, "caption"), scheduledAt: when });
    }
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/app/calendar");
  return { ok: `${accountIds.length} publication(s) planifiée(s).` };
}

export async function cancelPost(form: FormData) {
  const user = await requireUser();
  await db.post.deleteMany({ where: { id: str(form, "id"), workspaceId: user.workspaceId, status: { in: ["SCHEDULED", "FAILED"] } } });
  revalidatePath("/app/calendar");
}

/** Lance immédiatement la publication des posts échus et la relève des métriques (utile en démo). */
export async function runPublisherNow() {
  const user = await requireUser();
  await refreshRenderingVideos(user.workspaceId);
  await publishDuePosts();
  await collectMetrics();
  revalidatePath("/app/calendar");
  revalidatePath("/app/analytics");
}

// --- Comptes sociaux ------------------------------------------------------------

export async function addMockAccount(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!isMockPublishing()) return { error: "En mode live, connecte le compte via OAuth." };
  const platform = str(form, "platform") === "INSTAGRAM" ? "INSTAGRAM" : "TIKTOK";
  const handle = str(form, "handle").replace(/^@/, "");
  if (!handle) return { error: "Pseudo requis." };
  try {
    await db.socialAccount.create({
      data: { workspaceId: user.workspaceId, platform, handle, avatarId: str(form, "avatarId") || null },
    });
  } catch {
    return { error: "Ce compte est déjà connecté." };
  }
  revalidatePath("/app/accounts");
  return { ok: `Compte @${handle} ajouté (mode démo).` };
}

export async function linkAccountAvatar(form: FormData) {
  const user = await requireUser();
  await db.socialAccount.updateMany({
    where: { id: str(form, "id"), workspaceId: user.workspaceId },
    data: { avatarId: str(form, "avatarId") || null },
  });
  revalidatePath("/app/accounts");
}

export async function disconnectAccount(form: FormData) {
  const user = await requireUser();
  await db.socialAccount.deleteMany({ where: { id: str(form, "id"), workspaceId: user.workspaceId } });
  revalidatePath("/app/accounts");
}

// --- Réglages -------------------------------------------------------------------

export async function createApiKeyAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const key = await createApiKey(user.workspaceId, str(form, "name") || "Clé API");
  revalidatePath("/app/settings");
  return { ok: key };
}

export async function revokeApiKey(form: FormData) {
  const user = await requireUser();
  await db.apiKey.deleteMany({ where: { id: str(form, "id"), workspaceId: user.workspaceId } });
  revalidatePath("/app/settings");
}

export async function addInspiration(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const url = str(form, "url");
  if (!/^https:\/\/(www\.)?(tiktok|instagram)\.com\//.test(url)) return { error: "Lien TikTok ou Instagram attendu." };
  await db.inspiration.create({ data: { workspaceId: user.workspaceId, url, notes: str(form, "notes") || null } });
  revalidatePath("/app/settings");
  return { ok: "Compte d'inspiration ajouté." };
}
