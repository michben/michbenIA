import type { Slide } from "@/lib/types";

const GRADIENTS = [
  "linear-gradient(160deg,#ff4f7b,#7c5cff)",
  "linear-gradient(160deg,#1f2937,#111827)",
  "linear-gradient(160deg,#f59e0b,#ef4444)",
  "linear-gradient(160deg,#10b981,#0ea5e9)",
];

/** Aperçu 9:16 d'un slideshow, slide par slide (défilement horizontal). */
export function SlideshowPreview({ slides }: { slides: Slide[] }) {
  return (
    <div className="flex snap-x gap-2 overflow-x-auto pb-2">
      {slides.map((s, i) => (
        <div
          key={i}
          className="flex aspect-[9/16] w-36 shrink-0 snap-start flex-col justify-center rounded-xl p-3 text-center"
          style={{ background: GRADIENTS[i % GRADIENTS.length] }}
        >
          <p className="text-sm font-black leading-tight">{s.title}</p>
          <p className="mt-2 text-[11px] leading-snug opacity-90">{s.text}</p>
          <p className="mt-auto text-[10px] opacity-60">{i + 1}/{slides.length}</p>
        </div>
      ))}
    </div>
  );
}

/** Aperçu d'un yapper : la vidéo rendue si elle existe, sinon une maquette avec l'accroche en sous-titre. */
export function YapperPreview({ url, imageUrl, hook }: { url?: string | null; imageUrl?: string | null; hook: string }) {
  if (url) return <video src={url} controls className="aspect-[9/16] w-44 rounded-xl bg-black object-cover" />;
  return (
    <div
      className="relative flex aspect-[9/16] w-44 items-end overflow-hidden rounded-xl bg-cover bg-center p-3"
      style={{ backgroundImage: imageUrl ? `url(${imageUrl})` : GRADIENTS[1] }}
    >
      <p className="rounded bg-black/70 px-2 py-1 text-center text-xs font-bold">{hook}</p>
    </div>
  );
}
