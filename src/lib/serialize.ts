import type { Script, Video } from "@prisma/client";
import { parseJson, type Slide } from "./types";

export function serializeScript(s: Script) {
  const { hooksJson, slidesJson, workspaceId: _ws, ...rest } = s;
  return { ...rest, hooks: parseJson<string[]>(hooksJson, []), slides: parseJson<Slide[]>(slidesJson, []) };
}

export function serializeVideo(v: Video) {
  const { slidesJson, workspaceId: _ws, providerJobId: _job, ...rest } = v;
  return { ...rest, slides: parseJson<Slide[] | null>(slidesJson, null) };
}
