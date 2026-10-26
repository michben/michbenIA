"use client";

/** Transmet le décalage horaire du navigateur pour interpréter les champs datetime-local. */
export function TzField() {
  return <input type="hidden" name="tzOffset" value={new Date().getTimezoneOffset()} suppressHydrationWarning readOnly />;
}
