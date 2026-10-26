import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiRequest } from "./api-keys";
import { InsufficientCreditsError } from "./credits";

export function apiError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Enveloppe un handler de l'API publique : authentification par clé et erreurs JSON homogènes. */
export function withApiKey(handler: (req: Request, workspaceId: string, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    const workspaceId = await authenticateApiRequest(req);
    if (!workspaceId) return apiError(401, "Clé API manquante ou invalide.");
    try {
      return await handler(req, workspaceId, ctx);
    } catch (err) {
      if (err instanceof z.ZodError) return apiError(400, err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
      if (err instanceof InsufficientCreditsError) return apiError(402, err.message);
      if (err instanceof Error && err.name === "NotFoundError") return apiError(404, "Ressource introuvable.");
      console.error(err);
      return apiError(500, err instanceof Error ? err.message : "Erreur interne.");
    }
  };
}
