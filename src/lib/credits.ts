import { db } from "./db";
import type { Plan, VideoType } from "./types";

// Barème inspiré de Pamba : ~21 vidéos longues ou ~166 slideshows pour 10 000 crédits.
export const CREDIT_COSTS = {
  SCRIPT: 5,
  SLIDESHOW: 60,
  YAPPER_PER_SECOND: 8,
} as const;

export const PLANS: Record<Plan, { label: string; priceUsd: number | null; monthlyCredits: number; avatarsWithAnalytics: number; inspirations: number }> = {
  FREE: { label: "Free", priceUsd: 0, monthlyCredits: 300, avatarsWithAnalytics: 1, inspirations: 0 },
  HOBBY: { label: "Hobby", priceUsd: 16, monthlyCredits: 1600, avatarsWithAnalytics: 1, inspirations: 1 },
  PRO: { label: "Pro", priceUsd: 100, monthlyCredits: 10000, avatarsWithAnalytics: 10, inspirations: 5 },
  ENTERPRISE: { label: "Enterprise", priceUsd: null, monthlyCredits: 0, avatarsWithAnalytics: 1000, inspirations: 100 },
};

export function videoCost(type: VideoType, durationSeconds = 60): number {
  if (type === "SLIDESHOW") return CREDIT_COSTS.SLIDESHOW;
  return Math.max(15, Math.round(durationSeconds)) * CREDIT_COSTS.YAPPER_PER_SECOND;
}

export class InsufficientCreditsError extends Error {
  constructor(public needed: number, public available: number) {
    super(`Crédits insuffisants : ${needed} nécessaires, ${available} disponibles.`);
  }
}

/** Débite les crédits de façon atomique ; lève InsufficientCreditsError si le solde est trop bas. */
export async function spendCredits(workspaceId: string, amount: number, reason: string) {
  return db.$transaction(async (tx) => {
    const ws = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    if (ws.credits < amount) throw new InsufficientCreditsError(amount, ws.credits);
    await tx.workspace.update({ where: { id: workspaceId }, data: { credits: { decrement: amount } } });
    await tx.creditLedger.create({ data: { workspaceId, delta: -amount, reason } });
  });
}

export async function refundCredits(workspaceId: string, amount: number, reason: string) {
  await db.$transaction([
    db.workspace.update({ where: { id: workspaceId }, data: { credits: { increment: amount } } }),
    db.creditLedger.create({ data: { workspaceId, delta: amount, reason } }),
  ]);
}
