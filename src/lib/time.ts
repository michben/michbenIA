/**
 * Convertit la valeur d'un <input type="datetime-local"> (heure locale du navigateur, sans fuseau)
 * en Date UTC, à partir de getTimezoneOffset() du navigateur (en minutes, positif à l'ouest de UTC).
 */
export function parseLocalDateTime(value: string, tzOffsetMinutes: number): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return new Date(NaN);
  const asUtc = new Date(`${value}:00Z`);
  return new Date(asUtc.getTime() + tzOffsetMinutes * 60_000);
}
