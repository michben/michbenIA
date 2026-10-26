import { describe, expect, it } from "vitest";
import { videoCost } from "@/lib/credits";
import { demoScript } from "@/lib/ai";
import { mockMetrics } from "@/lib/providers/social";
import { parseLocalDateTime } from "@/lib/time";
import { parseJson } from "@/lib/types";

describe("crédits", () => {
  it("facture le slideshow au forfait et le yapper à la seconde", () => {
    expect(videoCost("SLIDESHOW")).toBe(60);
    expect(videoCost("YAPPER", 60)).toBe(480);
    expect(videoCost("YAPPER", 5)).toBe(120); // durée minimale 15 s
  });
});

describe("script de démo", () => {
  it("produit 5 hooks et des slides seulement pour un slideshow", () => {
    const y = demoScript({ format: "YAPPER", product: "X", audience: "Y" });
    const s = demoScript({ format: "SLIDESHOW", product: "X", audience: "Y" });
    expect(y.hooks).toHaveLength(5);
    expect(y.slides).toHaveLength(0);
    expect(s.slides.length).toBeGreaterThanOrEqual(5);
  });
});

describe("planification", () => {
  it("convertit l'heure locale du navigateur en UTC", () => {
    // Paris en hiver : getTimezoneOffset() = -60
    expect(parseLocalDateTime("2026-12-01T18:00", -60).toISOString()).toBe("2026-12-01T17:00:00.000Z");
    expect(Number.isNaN(parseLocalDateTime("pas une date", 0).getTime())).toBe(true);
  });
});

describe("utilitaires", () => {
  it("parseJson retombe sur la valeur par défaut", () => {
    expect(parseJson("{oops", [])).toEqual([]);
    expect(parseJson('["a"]', [])).toEqual(["a"]);
  });

  it("les métriques simulées sont déterministes et cohérentes", () => {
    const d = new Date(Date.now() - 48 * 3_600_000);
    const a = mockMetrics(d, "post1");
    expect(mockMetrics(d, "post1").views).toBe(a.views);
    expect(a.likes).toBeLessThan(a.views);
  });
});
