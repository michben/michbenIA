import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

export function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export async function createApiKey(workspaceId: string, name: string) {
  const key = `mb_live_${randomBytes(24).toString("base64url")}`;
  await db.apiKey.create({
    data: { workspaceId, name, prefix: key.slice(0, 12), hash: hashKey(key) },
  });
  return key; // affichée une seule fois
}

/** Authentifie une requête de l'API publique via "Authorization: Bearer mb_live_...". */
export async function authenticateApiRequest(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!key) return null;
  const record = await db.apiKey.findUnique({ where: { hash: hashKey(key) } });
  if (!record) return null;
  await db.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
  return record.workspaceId;
}
