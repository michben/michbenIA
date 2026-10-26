// Fournisseurs de rendu vidéo pour les "yappers" (avatar face-caméra).
// Choix via VIDEO_PROVIDER : "mock" (démo, aucun coût) ou "heygen" (HeyGen API v2).

export interface RenderRequest {
  script: string;
  providerAvatarId?: string | null;
  voiceId?: string | null;
}

export interface RenderStatus {
  status: "RENDERING" | "READY" | "FAILED";
  outputUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export interface VideoProvider {
  name: string;
  startRender(req: RenderRequest): Promise<{ jobId: string }>;
  getStatus(jobId: string): Promise<RenderStatus>;
}

const mockProvider: VideoProvider = {
  name: "mock",
  async startRender() {
    return { jobId: `mock_${Date.now().toString(36)}` };
  },
  async getStatus() {
    // La démo ne produit pas de fichier : l'aperçu est affiché dans l'app à partir du script.
    return { status: "READY" };
  },
};

const heygenProvider: VideoProvider = {
  name: "heygen",
  async startRender(req) {
    const key = process.env.HEYGEN_API_KEY;
    if (!key) throw new Error("HEYGEN_API_KEY manquant.");
    if (!req.providerAvatarId || !req.voiceId) {
      throw new Error("Cet avatar n'a pas d'identifiant d'avatar et de voix HeyGen.");
    }
    const res = await fetch("https://api.heygen.com/v2/video/generate", {
      method: "POST",
      headers: { "X-Api-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        video_inputs: [
          {
            character: { type: "avatar", avatar_id: req.providerAvatarId, avatar_style: "normal" },
            voice: { type: "text", input_text: req.script, voice_id: req.voiceId },
          },
        ],
        dimension: { width: 1080, height: 1920 },
        caption: true,
      }),
    });
    const json = (await res.json()) as { data?: { video_id?: string }; error?: { message?: string } };
    if (!res.ok || !json.data?.video_id) throw new Error(json.error?.message ?? `HeyGen a répondu ${res.status}`);
    return { jobId: json.data.video_id };
  },
  async getStatus(jobId) {
    const key = process.env.HEYGEN_API_KEY ?? "";
    const res = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(jobId)}`, {
      headers: { "X-Api-Key": key },
    });
    const json = (await res.json()) as {
      data?: { status?: string; video_url?: string; thumbnail_url?: string; error?: { message?: string } };
    };
    const d = json.data ?? {};
    if (d.status === "completed") return { status: "READY", outputUrl: d.video_url, thumbnailUrl: d.thumbnail_url };
    if (d.status === "failed") return { status: "FAILED", error: d.error?.message ?? "Rendu échoué" };
    return { status: "RENDERING" };
  },
};

export function getVideoProvider(): VideoProvider {
  return process.env.VIDEO_PROVIDER === "heygen" ? heygenProvider : mockProvider;
}
